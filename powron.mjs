import SerialPort from 'serialport'

const baudRate = 115200
const cmdByState = state => (state && 'H') || 'L'
const startSeq = '$OM4AA#'
const PowronPins = Object.freeze({pin2: 0, pin3: 1, pin4: 2, pin5: 3, 
	pin6: 4, pin7: 5, pin8: 6, pin9: 7, pin10: 8,
	pinA0: 0, pinA1: 1, pinA2: 2, pinA3: 3, pinA4: 4, pinA5: 5,
	pinA6: 6, pinA7: 7
})

class Powron {
	constructor(device, keyerPin) {
		// log(`Opening UART ${uartDev}`)
		this._uart = new SerialPort(device, { baudRate: baudRate },
			(err) => err && console.log(`UART ${err.message}`))
		this._uart.on('open', () => {
			console.log(`UART opened: ${device} ${baudRate}`)
			this.send(startSeq)
			
			if (keyerPin && Object.values(PowronPins).contains(keyerPin)) {
				this.send(`K${keyerPin}`)
			}
		})
		// uart.on('data', (data) => log(`UART => ${String(data).trim()}`))
		this._timeout = 600
	}

	get timeout() {
		return this._timeout
	}

	set timeout(value) {
		this._timeout = Number(value)
		this.send(`T${this._timeout}`)
	}

	pinState(pin, state) {
		this.send(cmdByState(state) + pin)
	}

	keyerCmd(cmd) {
		this.send(cmd)
	}

	keyerSpeed(wpm) {
		this.send('S' + wpm)
	}

	serial(baudrate) {
		this.send(`P${baudrate / 100}`)
	}

	serialCmd(cmd) {
		for (let i = 0; i < cmd.length; i++) this._uart.write('>' + cmd.charAt(i))
		this._uart.write('\n')
	}

	send(data) {
		// log(`UART <= ${cmd.trim()}`)
		data.length > 1 && (data += '\n') // add NL delimiter for cmd with param
		this._uart.write(data, (err) => err && console.log(`UART ${err.message}`))
	}
}

export {Powron, PowronPins}