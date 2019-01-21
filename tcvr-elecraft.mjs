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

const filters = {}
filters[modes.CW] = filters[modes.CWR] = ['2400', '2000', '500', '250']
// filters[modes.CW] = filters[modes.CWR] = ['1k5', '700', '400', '200']
filters[modes.LSB] = filters[modes.USB] = ['2400', '2000', '500', '250']
// filters[modes.LSB] = filters[modes.USB] = filters[modes.RTTY] = ['1k5', 'OP1', '400', '200']

class ElecraftTcvr {
	constructor(adapter, options = {cwFilterCount, ssbFilterCount}) {
		this._uart = data => adapter.serialData(data + ';')
	}

	static K2(adapter, options = {cwFilterCount, ssbFilterCount}) { //baudrate = 4800, cwFilterCount = 4, ssbFilterCount = 4
		return new ElecraftTcvr(adapter, options)
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

	filters(mode) {
		return filters[mode]
	}

	set frequency(freq) {
		let cmd = 'FA000'
		if (freq < 10000000) cmd += '0'
		this._uart(cmd + freq)
	}

	set mode(mode) {
		this._uart(`MD${MD[mode]}`)
	}

	set agc(agc) {
		this._uart(`GT00${agc == agcTypes.SLOW ? 4 : 2}`)
	}

	set preamp(gain) {
		this._uart(`PA${gain > 0 ? 1 : 0}`)
	}

	set attn(attn) {
		this._uart(`RA0${attn > 0 ? 1 : 0}`)
	}

	filter(filter, mode) {
		// const count = Object.keys(filters[mode]).length / 2
		const index = filters[mode].indexOf(filter)
		this._uart('K22')
		this._uart(`FW0000${index}`)
		this._uart('K20')
		// for (let i = 0; i < count; i++) this._uart(`FW0000${index}`) // cycle trought filters (basic cmd format)
	}
}

export {ElecraftTcvr}
