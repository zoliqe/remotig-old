import SerialPort from 'serialport'

const baudRate = 4800 //115200
const encoding = 'ascii'
const cmdByState = state => (state && 'H') || 'L'
const startSeq = '$OM4AA#'
const PowronPins = Object.freeze({pin2: 0, pin3: 1, pin4: 2, pin5: 3, 
	pin6: 4, pin7: 5, pin8: 6, pin9: 7, pin10: 8,
	pinA0: 0, pinA1: 1, pinA2: 2, pinA3: 3, pinA4: 4, pinA5: 5,
	pinA6: 6, pinA7: 7
})

class Powron {
	constructor(options = {device, keyerPin, pttPin, serialBaudRate}) {
		// log(`Opening POWRON ${uartDev}`)
		this._uart = new SerialPort(options.device, { baudRate: baudRate },
			(err) => err && console.log(`POWRON ${err.message}`))
		this._uart.on('open', () => {
			console.log(`POWRON opened: ${options.device} ${baudRate}; keyer=${options.keyerPin} ptt=${options.pttPin} serial=${options.serialBaudRate}`)
			// this._uart.on('data', (data) => console.log(`POWRON => ${String(data).trim()}`))
			setTimeout(() => {
				this.send(startSeq)
				oprions.serialBaudRate && this.serial(oprions.serialBaudRate)
			}, 3000)
		})
		this._timeout = 600
		this._keyerPin = options.keyerPin
		this._pttPin = options.pttPin
	}

	get timeout() {
		return this._timeout
	}

	set timeout(value) {
		this._timeout = Number(value)
		this.send(`T${this._timeout}`)
	}

	get keyerPin() {
		return this._keyerPin
	}

	pinState(pin, state) {
		this.send(cmdByState(state) + pin)
	}

	keyerState(state) {
		if (this._keyerPin && Object.values(PowronPins).includes(this._keyerPin)) {
			this.pinState(this._keyerPin, false)
			this.send(`K${state ? this._keyerPin : 0}`)
		}
	}

	keyerCW(cmd) {
		this.send(cmd)
	}

	keyerSpeed(wpm) {
		this.send('S' + wpm)
	}

	pttState(state) {
		this._pttPin && this.pinState(this._pttPin, state)
	}

	serial(baudrate) {
		this.send(`P${baudrate / 100}`)
	}

	serialData(data) {
		this.send('>' + data)
	}

	send(data, callback) {
		// console.log(`POWRON <= ${data.trim()}`)
		data.length > 1 && (data += '\n') // add NL delimiter for cmd with param
		this._uart.write(data, encoding, (err) => {
			if (err) console.log(`POWRON ${err.message}`)
			else if (callback) callback()
		})
	}
}

export {Powron, PowronPins}