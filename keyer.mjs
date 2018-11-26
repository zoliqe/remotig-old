
const txBufferLength = 2 // count of letter spaces

class Keyer {

	constructor(powron) {
		this._lastKeyed = Date.now()
		this._wpm = 0
		this._spaceMillis = 0
		this._send = powron.keyerCmd
		this._speed = powron.keyerSpeed
		// this._uart(`K${pin}`)
	}

	send(msg) {
		if (this.disabled) return
		if (this._lastKeyed + this._spaceMillis*txBufferLength < Date.now()) {
			// on longer pause btw elements send buffering spaces
			for (let i = 0; i < txBufferLength; i++) this._send('_') 
		}
		this._send(msg)
		this._lastKeyed = Date.now()
	}

	get wpm() {
		return this._wpm
	}

	set wpm(value) {
		this._wpm = Number(value)
		if (this.disabled) return

		this._spaceMillis = 3600 / this._wpm
		this._speed(this._wpm)
	}

	get spaceMillis() {
		return this._spaceMillis
	}

	get disabled() {
		return this._wpm < 1
	}

}

export {Keyer}
