//import { * as express } from 'expres';

const port = 8088
const tokens = ['OM4AA-1999', 'OM3RRC-1969']
const authTimeout = 30 // sec
const hwWatchdogTimeout = 120 // sec
const heartbeat = 1 // sec
const tcvrService = 'TCVR'
const sdrService = 'SDR'
const serviceRelays = { }
serviceRelays[sdrService] = ['0']
serviceRelays[tcvrService] = ['0', '1']
//const tcvrUrl = 'tcvr'
const tcvrDev = '/dev/ttyUSB0'
const tcvrBaudrate = 9600
const tcvrCivAddr = 0x58
const myCivAddr = 224
const uartDev = '/dev/ttyAMA0'
const uartBaudrate = 115200
const uartCmdByState = state => (state && 'H') || 'L'
const uartStartSeq = '$OM4AA#'

const express = require('express')
const SerialPort = require('serialport')
const temps = require('ds18b20-raspi')
const mic = require('mic')
const execSync = require('child_process').execSync
//var lame = require('lame')

const tokenParam = 'token'
const serviceParam = 'service'
const serviceURL = `/:${tokenParam}/:${serviceParam}/`
const freqParam = 'freq'

const services = Object.keys(serviceRelays)
const State = {started: 'active', starting: 'starting', stoped: null, stoping: 'stoping'}
let serviceState = {}
services.forEach(service => serviceState[service] = State.stoped)

let whoNow = undefined
//let activeServices = []
let authTime = undefined // sec
const secondsNow = () => Date.now() / 1000
let audio = undefined

log('Starting express app')
const app = express()
const appWs = require('express-ws')(app, null, {wsOptions: {clientTracking: true, verifyClient: (info, cb) => { log(`verifyClient.info=${JSON.stringify(info)}`); cb(true);}}})

app.param(tokenParam, (req, res, next, value) => {
	const token = req.params[tokenParam] && req.params[tokenParam].toUpperCase()
	// log(`request token: ${token}`)
	req.authorized = authorize(token) || error(res, 'EAUTH', 401)
	next()
})

log('Registering REST services')
//register(serviceURL + 'start', (req, res) => executeAction(req, res, true))
//register(serviceURL + 'stop', (req, res) => executeAction(req, res, false))
//register(`/${tcvrUrl}/freq/:${freqParam}`, (req, res) => {
//	tcvrFreq(req.params[freqParam] && Number(req.params[freqParam]).toFixed(0))
//	res.end()
//})
register('/temps', (req, res) => res.send(temps.readAllC()))
register('/status', (req, res) => res.send({ who: whoNow, servicesO: serviceState, authTime: authTime }))
register(`/stream/:${tokenParam}`, audioStream)
app.use('/smartceiver', express.static('public'))
app.ws(`/control/:${tokenParam}`, function (ws, req) {
	log('control connect')
	if (!req.authorized) {
		log('unauthorized ws, terminating')
		ws.send('disc')
		ws.terminate()
		return
	}
	ws.send('conack')
	log(`clients=${JSON.stringify(appWs.getWss().clients)}`)

	ws.on('message', msg => {
		authTime = secondsNow()
		// log('ws:' + msg)
		if (msg == 'poweron') {
			startService(tcvrService)
		//sendUart('H0')
		} else if (msg == 'poweroff') {
			stopService(tcvrService)
			stopAudio() // not sure why, but must be called here, not in stopService()
			//sendUart('L0')
		} else if (msg == 'keyeren') {
			sendUart('K5')
		} else if (['.', '-', '_'].includes(msg)) {
			sendUart(msg)
		} else if (msg.startsWith('wpm=')) {
			sendUart('S' + msg.substring(4))
		} else if (msg.startsWith('f=')) {
			tcvrFreq(Number(msg.substring(2)))
		} else {
			ws.send(`ecmd: ${msg}`)
		}
		// TODO mode, preamp, attn
	})
})

const server = app.listen(port, () => log(`Listening on ${port}`))


log(`Activating heartbeat every ${heartbeat} s`)
setInterval(checkAuthTimeout, heartbeat * 1000)

log(`Opening UART ${uartDev}`)
const uart = new SerialPort(uartDev,
	{ baudRate: uartBaudrate },
	(err) => err && log(`UART ${err.message}`))
uart.on('open', () => {
	log(`UART opened: ${uartDev} ${uartBaudrate}`)
	sendUart(uartStartSeq)
})
uart.on('data', (data) => log(`UART => ${String(data).trim()}`))

log(`Opening TCVR CAT ${tcvrDev}`)
const tcvr = new SerialPort(tcvrDev, { baudRate: tcvrBaudrate },
	(err) => err && log(`TCVR ${err.message}`))
tcvr.on('open', () => log(`TCVR opened: ${tcvrDev} ${tcvrBaudrate}`))
tcvr.on('data', (data) => log(`TCVR => ${data}`))

function log(str) {
	console.log(new Date().toISOString() + ' ' + str)
}

function register(url, callback) {
	log(`URL: ${url}`)
	app.get(url, callback)
}

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

function checkAuthTimeout() {
	if (!whoNow) return

	if (!authTime || (authTime + authTimeout) < secondsNow()) {
		log(`auth timeout for ${whoNow}:`)
		const startedServices = services.filter(service => serviceState[service] === State.started)
		startedServices.forEach(stopService)
	}
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

async function startService(service) {
	const state = serviceState[service]
	if (state === State.stoping || state === State.starting) {
		log(`Service ${service} in progress state ${state}, ignoring start`)
		return
	}

	serviceState[service] = State.starting
	if ( ! managePower(service, true)) return

	if (state === State.stoped) { // cold start
		log(`startedService: ${service}`)
		sendUart(`T${hwWatchdogTimeout}`)
	}

	serviceState[service] = State.started
}

async function stopService(service) {
	serviceState[service] = State.stoping
	log(`stopService: ${service}`)
	managePower(service, false)
	await sleep(1000)
	managePower(service, false)
	await sleep(4000)

	serviceState[service] = State.stoped
	const activeServices = services.filter(service => serviceState[service] !== State.stoped)
	activeServices.length == 0 && (whoNow = authTime = null, log('logout')) // logout
}

async function managePower(service, state) {
	if (!service || !services.includes(service)) return false
	// if (serviceNow && serviceNow !== service) return false

	// let i = 0
	// serviceRelays[service].forEach(relay => setTimeout(() => sendUart(cmd + relay), i++ * 5000))
	serviceRelays[service].forEach(async (relay) => {
		sendUart(uartCmdByState(state) + relay)
		//await sleep(1000)
	})
	return true
}

//// UART + TCVR CAT 
function sendUart(cmd) {
	log(`UART <= ${cmd.trim()}`)
	cmd.length > 1 && (cmd += '\n') // add NL delimiter for cmd with param
	//log(`UART <= ${cmd}`)
	uart.write(cmd, (err) => err && log(`UART ${err.message}`))
}

function tcvrFreq(f) {
	if (!f || f < 1500000 || f > 30000000) return //error(res, 'EVAL')

	const hex2dec = (h) => {
		const s = Math.floor(h / 10)
		return s * 16 + (h - s * 10)
	}
	// log(`f=${f}`)
	const mhz10_1 = Math.floor(f / 1000000) // 10MHz, 1MHz
	f = f - (mhz10_1 * 1000000)
	// log(`f=${f}`)
	const khz100_10 = Math.floor(f / 10000) // 100kHz, 10kHz
	f = f - (khz100_10 * 10000)
	// log(`f=${f}`)
	const hz1000_100 = Math.floor(f / 100) // 1kHz, 100Hz
	f = f - (hz1000_100 * 100)
	// log(`f=${f}`)
	const hz10 = Math.floor(f / 10) * 10 // 10Hz

	const data = [254, 254, // 0xFE 0xFE
		tcvrCivAddr, myCivAddr, 0, // 0: transfer Freq CMD w/o reply .. 5: set Freq CMD with reply
		hex2dec(hz10), hex2dec(hz1000_100), hex2dec(khz100_10), hex2dec(mhz10_1), 0, // freq always < 100MHz
		253] // 0xFD
	// log(`TCVR f: ${data}`)
	tcvr.write(data, (err) => err && log(`TCVR ${err.message}`))
}

//// RX audio stream
async function audioStream(req, res) {
	log('Starting audio stream')
	if (!req.authorized) {
		log('auth failed, streaming ignored')
		error(res, 'EAUTH', 401)
		return
	}
	res.set({ 'Content-Type': 'audio/wav', 'Transfer-Encoding': 'chunked' })
	stopAudio() //&& await sleep(1000) // stop previously started audio
	try { execSync('killall arecord') } catch (e) { /*ignore*/ }
    // stopAudio(() => {
    //   setTimeout(() => {
    //     startAudio(stream => stream.pipe(res))
    //   }, 3000)
    // })
	startAudio(stream => stream.pipe(res))
  //    encoder.pipe(res);
}

async function startAudio(cb) {
	log('start audio')
	//await sleep(1000)
	audio = mic({
		device: 'plughw:1,0',
		rate: '8000',
		channels: '1',
		fileType: 'wav',
		debug: true,
		// exitOnSilence: 6
	})

	// audioStream = audio.getAudioStream();
	audio.getAudioStream().on('startComplete', () => {
		// console.log('startComplete');
		cb(audio.getAudioStream())
	})

	audio.start()
}

function stopAudio(cb) {
	if (!audio) return false
	log('stop audio');
	audio.stop()
	// audio.getAudioStream().on('stopComplete', () => {
	// audioStream = undefined;
	audio = undefined
	// cb()
	// })
	return true
}

function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

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

