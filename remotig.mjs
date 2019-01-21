log('Loading modules...')
import express from 'express'
import expressWss from 'express-ws'
import WebSocket from 'ws'
import {secondsNow, log, whoIn, delay, error} from './utils'
import {Transceiver} from './tcvr'
import {Keyer} from './keyer'
import {tokens} from './auth'
import {
	port, authTimeout, hwWatchdogTimeout, heartbeat, tcvrDevice, 
	powronPins, powron, tcvrAdapter, keyerOptions
} from './config'

////////////////////////////////////////
const tokenParam = 'token'
const devices = Object.keys(powronPins)
const State = {on: 'active', starting: 'starting', off: null, stoping: 'stoping'}
const deviceState = {}
devices.forEach(dev => deviceState[dev] = State.off)

let whoNow
let authTime
let wsNow
let tcvr
let keyer

log('Starting express app')
const appWs = expressWss(express()) //, null, {wsOptions: {clientTracking: true, verifyClient: (info, cb) => { log(`verifyClient.info=${JSON.stringify(info)}`); cb(true);}}})
const app = appWs.app;

app.param(tokenParam, (req, res, next, value) => {
	const token = req.params[tokenParam] && req.params[tokenParam].toUpperCase()
	// log(`request token: ${token}`)
	req.authorized = authorize(token) || error(res, 'EAUTH', 401)
	next()
})

log('Registering services')
app.get('/status', (req, res) => res.send({ who: whoNow, devices: deviceState, authTime: authTime }))

app.ws(`/control/:${tokenParam}`, function (ws, req) {
	log('control connect')
	if (!req.authorized) {
		log('unauthorized control, terminating connection')
		ws.send('disc')
		ws.terminate()
		return
	}

	ws.send('conack')
	log('control open')
	wsNow = ws

	ws.on('message', msg => {
		if (ws !== wsNow && ws.readyState === WebSocket.OPEN) {
			log(`Unauthored cmd: ${msg}`)
			ws.send('disc')
			ws.close()
			return
		}
		authTime = secondsNow()
		// log('cmd: ' + msg)

		if (msg == 'poweron') {
			powerOn(tcvrDevice)
			tcvr = tcvr || new Transceiver(tcvrAdapter())
			keyer = keyer || new Keyer(keyerOptions)
		} else if (msg == 'poweroff') {
			tcvr = keyer = null
			powerOff(tcvrDevice)
			// stopAudio() // not sure why, but must be called here, not in powerOff()
		} else if (['ptton', 'pttoff'].includes(msg)) {
			const state = msg.endsWith('on')
			keyer && keyer.ptt(state)
			// if (!state || keyerPin) { // ptt on only when enabled
			// 	powron.pinState(keyerPin, state)
			// 	pttTime = state ? secondsNow() : null
			// }
		} else if (['.', '-', '_'].includes(msg)) {
			keyer && keyer.send(msg)
		} else if (msg.startsWith('wpm=')) {
			keyer && (keyer.wpm = msg.substring(4))
		} else if (msg.startsWith('f=')) {
			tcvr && (tcvr.frequency = msg.substring(2))
		} else if (msg.startsWith('mode=')) {
			tcvr && (tcvr.mode = msg.substring(5))
		} else if (msg.startsWith('filter=')) {
			tcvr && (tcvr.filter = msg.substring(7))
		} else if (['preampon', 'preampoff'].includes(msg)) {
			tcvr && (tcvr.gain = msg.endsWith('on') ? tcvr.preampLevels[0] : 0)
		} else if (['attnon', 'attnoff'].includes(msg)) {
			tcvr && (tcvr.gain = msg.endsWith('on') ? (0 - tcvr.attnLevels[0]) : 0)
		} else if (['agcon', 'agcoff'].includes(msg)) {
			tcvr && (tcvr.agc = tcvr.agcTypes[msg.endsWith('on') ? 0 : 1])
		} else {
			ws.send(`ecmd: '${msg}'`)
		}
	})

	disconnectOtherThan(ws)
})

const server = app.listen(port, () => log(`Listening on ${port}`))


log(`Activating heartbeat every ${heartbeat} s`)
setInterval(tick, heartbeat * 1000)

// function register(url, callback) {
// 	log(`URL: ${url}`)
// 	app.get(url, callback)
// }

//// Access Management
function authorize(token) {
	const who = whoIn(token)
	if (!token || !who) return false
	if (!tokens.includes(token) || (whoNow && whoNow !== who)) return false

	whoNow = who
	authTime = secondsNow()
	log(`Authored ${who}`)
	return true
}

function tick() {
	// checkPttTimeout();
	checkAuthTimeout();
}

function checkAuthTimeout() {
	if (!whoNow) return
	if (!authTime || (authTime + authTimeout) > secondsNow()) return

	const startedServices = devices.filter(service => deviceState[service] === State.on)
	if (startedServices.length == 0) {
		logout()
		return
	}
	log(`auth timeout for ${whoNow}: ${startedServices}`)
	startedServices.forEach(powerOff)
}

function disconnectOtherThan(currentWs) {
	appWs.getWss().clients
		//.filter(client => client !== currentWs && client.readyState === WebSocket.OPEN)
		.forEach(client => {
			if (client !== currentWs && client.readyState === WebSocket.OPEN) {
				log('Sending client disc')
				client.send('disc')
//				client.close()
			}
		}) // disconnect others
}

/*function executeAction(req, res, state) {
	const token = req.params[tokenParam] && req.params[tokenParam].toUpperCase()
	const service = req.params[serviceParam] && req.params[serviceParam].toUpperCase()

	// const authorized = authorize(token) || error(res, 'EAUTH')
	const result = req.authorized && (managePower(service, state) || error(res, 'ESERV'))

	if (result) {
//		serviceNow = state && service
		if (!state) whoNow = authTime = null // logout
		res.send('OK')
		res.locals.result = 'OK'
	}
	log(`..authored ${whoIn(token)} for ${service} state ${state}, result: ${res.locals.result}`)
	return result
}*/

async function powerOn(device) {
	const state = deviceState[device]
	if (state === State.stoping || state === State.starting) {
		log(`Device ${device} in progress state ${state}, ignoring start`)
		return
	}

	deviceState[device] = State.starting
	if (!managePower(device, true)) return

	if (state === State.off) { // cold start
		log(`powerOn: ${device}`)
		powron.timeout = hwWatchdogTimeout
	}

	deviceState[device] = State.on
}

async function powerOff(device) {
	deviceState[device] = State.stoping
	log(`powerOff: ${device}`)
	managePower(device, false)
	await delay(1000)
	managePower(device, false)
	await delay(2000)

	deviceState[device] = State.off
	const activeDevs = devices.filter(dev => deviceState[dev] !== State.off)
	activeDevs.length == 0 && logout()
}

function logout() {
	whoNow = authTime = null
	log('logout')
}

async function managePower(device, state) {
	if (!device || !devices.includes(device)) return false
	powronPins[device].forEach(async (pin) => powron.pinState(pin, state))
	return true
}
