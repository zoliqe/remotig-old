log('Loading modules...')
import express from 'express'
import expressWss from 'express-ws'
import WebSocket from 'ws'
// import mic from 'mic'
// import {execSync} from 'child_process'
import {Powron, PowronPins} from './powron'
import {Keyer} from './keyer'
import {tokens} from './auth'
import {Transceiver} from './tcvr'
import {ElecraftTcvr} from './tcvr_elecraft'

const port = 8088
const authTimeout = 30 // sec
const hwWatchdogTimeout = 120 // sec
const heartbeat = 10 // sec
const tcvrDevice = 'TCVR'
const powronPins = { }
powronPins[tcvrDevice] = [PowronPins.pin2, PowronPins.pin4]
const powronDevice = '/dev/ttyUSB0'
// const powronDevice = '/dev/ttyS0'
//const powronDevice = '/dev/ttyAMA0'
const keyerPin = PowronPins.pin5
const pttTimeout = 5 // sec
// const micOptions = {
// 	device: 'plug:dsnoop', //'plughw:0,0',
// 	rate: '4000',
// 	channels: '1',
// 	fileType: 'wav',
// 	debug: true,
// 	// exitOnSilence: 6
// }

const powron = new Powron(powronDevice, keyerPin)
const tcvrAdapter = (powron) => ElecraftTcvr.K2(powron)

const tokenParam = 'token'
const devices = Object.keys(powronPins)
const State = {on: 'active', starting: 'starting', off: null, stoping: 'stoping'}
let deviceState = {}
devices.forEach(dev => deviceState[dev] = State.off)

let whoNow = undefined
//let activeDevs = []
let authTime = undefined // sec
let pttTime = undefined
const secondsNow = () => Date.now() / 1000
let audio = undefined
let wsNow = undefined

let tcvr = null
let keyer = null

log('Starting express app')
const appWs = expressWss(express()) //, null, {wsOptions: {clientTracking: true, verifyClient: (info, cb) => { log(`verifyClient.info=${JSON.stringify(info)}`); cb(true);}}})
const app = appWs.app;

app.param(tokenParam, (req, res, next, value) => {
	const token = req.params[tokenParam] && req.params[tokenParam].toUpperCase()
	// log(`request token: ${token}`)
	req.authorized = authorize(token) || error(res, 'EAUTH', 401)
	next()
})

log('Registering devices')
//register(serviceURL + 'start', (req, res) => executeAction(req, res, true))
//register(serviceURL + 'stop', (req, res) => executeAction(req, res, false))
//register(`/${tcvrUrl}/freq/:${freqParam}`, (req, res) => {
//	tcvrFreq(req.params[freqParam] && Number(req.params[freqParam]).toFixed(0))
//	res.end()
//})
app.get('/status', (req, res) => res.send({ who: whoNow, devices: deviceState, authTime: authTime }))
// register(`/stream/:${tokenParam}`, audioStream)
app.use('/smartceiver', express.static('smartceiver'))
app.use('/', express.static('remotig'))
// app.use('/wav', express.static('awav'))
// app.use('/mp3', express.static('amp3'))
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
	powron.pinState(keyerPin, false) // ptt off

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
			tcvr = tcvr || new Transceiver(tcvrAdapter(powron))
			keyer = keyer || new Keyer(powron)
		} else if (msg == 'poweroff') {
			tcvr = keyer = null
			powerOff(tcvrDevice)
			// stopAudio() // not sure why, but must be called here, not in powerOff()
		} else if (['ptton', 'pttoff'].includes(msg)) {
			const state = msg.endsWith('on')
			if (!state || keyerPin) { // ptt on only when enabled
				powron.pinState(keyerPin, state)
				pttTime = state ? secondsNow() : null
			}
		} else if (['.', '-', '_'].includes(msg)) {
			keyer && keyer.send(msg)
		} else if (msg.startsWith('wpm=')) {
			keyer && (keyer.wpm = msg.substring(4))
		} else if (msg.startsWith('f=')) {
			tcvr && (tcvr.frequency = msg.substring(2))
		} else if (msg.startsWith('mode=')) {
			tcvr && (tcvr.mode = msg.substring(5))
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

// log(`Opening TCVR CAT ${tcvrDev}`)
// const tcvr = new SerialPort(tcvrDev, { baudRate: tcvrBaudrate },
// 	(err) => err && log(`TCVR ${err.message}`))
// tcvr.on('open', () => log(`TCVR opened: ${tcvrDev} ${tcvrBaudrate}`))
// tcvr.on('data', (data) => log(`TCVR => ${data}`))

function log(str) {
	console.log(new Date().toISOString() + ' ' + str)
}

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

function whoIn(token) {
	if (!token) return null
	const delPos = token.indexOf('-')
	return delPos > 3 ? token.substring(0, delPos).toUpperCase() : null
}

function tick() {
	checkPttTimeout();
	checkAuthTimeout();
}

function checkPttTimeout() {
	if (!pttTime) return
	if (pttTime + pttTimeout > secondsNow()) return

	powron.pinState(keyerPin, false) // ptt off
	pttTime = null
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

function error(res, err, status = 400) {
	res.locals.result = err
	res.status(status).send(err)
	return false
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
	await sleep(1000)
	managePower(device, false)
	await sleep(2000)

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

function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

//// RX audio stream
// async function audioStream(req, res) {
// 	log('Starting audio stream')
// 	if (!req.authorized) {
// 		log('auth failed, streaming ignored')
// 		error(res, 'EAUTH', 401)
// 		return
// 	}
// 	res.set({ 'Content-Type': 'audio/wav', 'Transfer-Encoding': 'chunked' })
// 	stopAudio() //&& await sleep(1000) // stop previously on audio
// 	try { execSync('killall arecord') } catch (e) { /*ignore*/ }
// 	startAudio(stream => stream.pipe(res))
// }

// async function startAudio(cb) {
// 	log('start audio')
// 	audio = mic(micOptions)

// 	audio.getAudioStream().on('startComplete', () => {
// 		// console.log('startComplete');
// 		cb(audio.getAudioStream())
// 	})

// 	audio.start()
// }

// function stopAudio(cb) {
// 	if (!audio) return false
// 	log('stop audio');
// 	audio.stop()
// 	audio = undefined
// 	return true
// }

//input.pipe(encoder);

// create the Encoder instance
/*var encoder = new lame.Encoder({
// input
channels: 2,        // 2 channels (left and right)
bitDepth: 16,       // 16-bit samples
sampleRate: 44100,  // 44,100 Hz sample rate

// output
bitRate: options.bitrate,
outSampleRate: options.samplerate,
mode: (options.mono ? lame.MONO : lame.STEREO) // STEREO (default), JOINTSTEREO, DUALCHANNEL or MONO
});*/


/*var outputFileStream = fs.WriteStream('output.raw');

audioStream.pipe(outputFileStream);

audioStream.on('data', function(data) {
    console.log("Recieved Input Stream: " + data.length);
});

audioStream.on('error', function(err) {
    console.log("Error in Input Stream: " + err);
});

audioStream.on('startComplete', function() {
    console.log("Got SIGNAL startComplete");
    setTimeout(function() {
            audio.pause();
    }, 5000);
});

audioStream.on('stopComplete', function() {
    console.log("Got SIGNAL stopComplete");
});

audioStream.on('pauseComplete', function() {
    console.log("Got SIGNAL pauseComplete");
    setTimeout(function() {
        audio.resume();
    }, 5000);
});

audioStream.on('resumeComplete', function() {
    console.log("Got SIGNAL resumeComplete");
    setTimeout(function() {
        audio.stop();
    }, 5000);
});

audioStream.on('silence', function() {
    console.log("Got SIGNAL silence");
});

audioStream.on('processExitComplete', function() {
    console.log("Got SIGNAL processExitComplete");
});*/

//  audio.start();

