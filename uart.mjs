import SerialPort from 'serialport'
import {log} from './utils'

const baudRate = 4800 //115200
const allowedPins = ['dtr', 'rts']
const encoding = 'ascii'

class CwPttUart {
	constructor(options = {device, keyerPin, pttPin}) {
		this._keyerPin = options.keyerPin && allowedPins.includes(options.keyerPin) 
			? options.keyerPin : null
		this._pttPin = options.pttPin && allowedPins.includes(options.pttPin)
			? options.pttPin : null

		// log(`Opening CW/PTT UART ${uartDev}`)
		this._uart = new SerialPort(options.device, { baudRate: baudRate },
			(err) => err && console.log(`CW/PTT UART ${err.message}`))
		this._uart.on('open', () => {
			console.log(`CW/PTT UART opened: ${options.device} ${baudRate}`)
			// this._uart.on('data', (data) => console.log(`UART => ${String(data).trim()}`))
			this.pttState(false)
		})
	}

	keyerState(state) {
	}

	keyerCW(cmd) {
		// TODO
	}

	keyerSpeed(wpm) {
		// TODO
	}

	pttState(state) {
		if (this._pttPin) {
			const opts = {}
			opts[this._pttPin] = state
			this._uart.set(opts)
		}
	}

}

class CatUart {
	constructor(options = {device, baudRate}) {
		// log(`Opening TCVR CAT ${tcvrDev}`)
		this._uart = new SerialPort(options.device, { baudRate: options.baudRate },
			(err) => err && log(`CAT UART ${err.message}`))
		this._uart.on('open', () => log(`CAT UART opened: ${options.device} ${options.baudRate}`))
		// tcvr.on('data', (data) => log(`CAT => ${data}`))
	}

	serial(baudRate) {}

	serialData(data, callback) {
		this._uart && this._uart.write(data, encoding, (err) => {
			if (err) console.log(`CAT UART ${err.message}`)
			else if (callback) callback()
		})
	}
}

export {CwPttUart, CatUart}
