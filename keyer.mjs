
const txBufferLength = 2 // count of letter spaces

class Keyer {

	constructor(uartSend, pin) {
		this._lastKeyed = Date.now()
		this._wpm = 0
		this._spaceMillis = 0
		this._uart = uartSend
		this._uart(`K${pin}`)
	}

	send(msg) {
		if (this.disabled) return
		if (this._lastKeyed + this._spaceMillis*txBufferLength < Date.now()) {
			// on longer pause btw elements send buffering spaces
			for (let i = 0; i < txBufferLength; i++) this._uart('_') 
		}
		this._uart(msg)
		this._lastKeyed = Date.now()
	}

	get wpm() {
		return this._wpm
	}

	set wpm(value) {
		this._wpm = Number(value)
		if (this.disabled) return

		this._spaceMillis = 3600 / this._wpm
		this._uart('S' + this._wpm)
	}

	get spaceMillis() {
		return this._spaceMillis
	}

	get disabled() {
		return this._wpm < 1
	}

}

export {Keyer}
