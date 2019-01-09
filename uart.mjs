import SerialPort from 'serialport'

const baudRate = 4800 //115200
const allowedPins = ['dtr', 'rts']

class CwPttUart {
	constructor({device, keyerPin, pttPin}) {
		// log(`Opening CW/PTT UART ${uartDev}`)
		this._uart = new SerialPort(device, { baudRate: baudRate },
			(err) => err && console.log(`CW/PTT UART ${err.message}`))
		this._uart.on('open', () => {
			console.log(`CW/PTT UART opened: ${device} ${baudRate}`)
			// this._uart.on('data', (data) => console.log(`UART => ${String(data).trim()}`))
		})
		this._keyerPin = keyerPin && allowedPins.includes(keyerPin) ? keyerPin : null
		this._pttPin = pttPin && allowedPins.includes(pttPin) ? pttPin : null
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

export {CwPttUart}
