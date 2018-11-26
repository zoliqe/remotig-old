import {bands, modes, agcTypes} from './tcvr'

const _bands = [bands[160], bands[80], bands[40], bands[30], 
	bands[20], bands[17], bands[15], bands[12], bands[10]]
const _modes = [modes.CW, modes.CWR, modes.LSB, modes.USB]
const _agc = [agcTypes.FAST, agcTypes.SLOW]

const MD = {}
MD[modes.CW] = 3
MD[modes.CWR] = 7
MD[modes.LSB] = 1
MD[modes.USB] = 2
MD[modes.RTTY] = 6

class ElecraftTcvr {
	constructor(powron, baudrate) {
		this._uart = (data) => powron.serialCmd(data + ';')
		this._baudrate = baudrate
		powron.serial(baudrate)
	}

	static K2(powron) {
		return new ElecraftTcvr(powron, 4800)
	}

	get baudrate() {
		return this._baudrate
	}

	get agcTypes() {
		return _agc
	}

	get bands() {
		return _bands
	}
	
	get modes() {
		return _modes
	}

	get preamps() {
		return [20]
	}

	get attns() {
		return [10]
	}

	set frequency(freq) {
		let cmd = 'FA000'
		if (freq < 10000000) cmd += '0'
		this._uart(cmd + freq)
	}

	set mode(mode) {
		this._uart('MD' + MD[mode])
	}

	set agc(agc) {
		this._uart('GT00' + agc == agcTypes.SLOW ? 4 : 2)
	}

	set preamp(gain) {
		this._uart('PA' + gain > 0 ? 1 : 0)
	}

	set attn(attn) {
		this._uart('RA0' + attn > 0 ? 1 : 0)
	}
}

export {ElecraftTcvr}
