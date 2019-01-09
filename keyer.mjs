import {delay} from './utils'

class Keyer {

	constructor({cwAdapter, pttAdapter, bufferSize = 2, pttLead = 0, pttTail = 500, pttTimeout = 5000}) {
		this._lastKeyed = Date.now()
		this._wpm = 0
		this._bufferSize = bufferSize
		this._pttLead = pttLead
		this._pttTail = pttTail
		this._pttTimeout = pttTimeout
		this._cw = (s) => cwAdapter && cwAdapter.keyerCW(s)
		this._speed = (v) => cwAdapter && cwAdapter.keyerSpeed(v)
		this._ptt = (state) => pttAdapter && pttAdapter.pttState(state)
		
		cwAdapter && cwAdapter.keyerState(true)
		this._ptt(false)
	}

	send(msg) {
		if (this.disabled) return

		if (msg == '.' || msg == '-') this.ptt(true, this._pttTail)
		if (this._lastKeyed + this._pttLead < Date.now()) {
			// on longer pause btw elements send buffering spaces
			if (this._bufferSize) for (let i = 0; i < this._bufferSize; i++) this._cw('_')
			else delay(this._pttLead) 
		}

		this._cw(msg)
		this._lastKeyed = Date.now()
	}

	ptt(state, timeout = this._pttTimeout) {
		this._ptt(state)
		if (state) {
			this._pttTimer && clearTimeout(this._pttTimer)
			this._pttTimer = setTimeout(() => {
				this._pttTimer = null
				this._ptt(false)
			}, timeout)
		} else {
			clearTimeout(this._pttTimer)
			this._pttTimer = null
		}
	}

	get wpm() {
		return this._wpm
	}

	set wpm(value) {
		this._wpm = Number(value)
		if (this.disabled) return

		if (this._bufferSize) this._pttLead = (3600 / this._wpm) * this._bufferSize
		this._speed(this._wpm)
	}

	get disabled() {
		return this._wpm < 1
	}

}

export {Keyer}
