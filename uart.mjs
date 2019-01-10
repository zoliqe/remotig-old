import SerialPort from 'serialport'

const baudRate = 4800 //115200
const allowedPins = ['dtr', 'rts']
const encoding = 'ascii'

class CwPttUart {
	constructor({device, keyerPin, pttPin}) {
		this._keyerPin = keyerPin && allowedPins.includes(keyerPin) ? keyerPin : null
		this._pttPin = pttPin && allowedPins.includes(pttPin) ? pttPin : null

		// log(`Opening CW/PTT UART ${uartDev}`)
		this._uart = new SerialPort(device, { baudRate: baudRate },
			(err) => err && console.log(`CW/PTT UART ${err.message}`))
		this._uart.on('open', () => {
			console.log(`CW/PTT UART opened: ${device} ${baudRate}`)
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
	constructor({device, baudRate}) {
		// log(`Opening TCVR CAT ${tcvrDev}`)
		this._uart = new SerialPort(device, { baudRate: baudRate },
			(err) => err && log(`CAT UART ${err.message}`))
		this._uart.on('open', () => log(`CAT UART opened: ${device} ${baudRate}`))
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
