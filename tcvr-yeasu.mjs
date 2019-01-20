import {bands, modes, agcTypes} from './tcvr'

const _bands = [bands[160], bands[80], bands[40], bands[30], 
	bands[20], bands[17], bands[15], bands[12], bands[10]]
const _modes = [modes.CW, modes.CWR, modes.LSB, modes.USB]
// const _agc = [agcTypes.FAST, agcTypes.SLOW]
const modeValues = {}
modeValues[modes.LSB] = 0x00
modeValues[modes.USB] = 0x01
modeValues[modes.CW]  = 0x03
modeValues[modes.CWR] = 0x02
modeValues[modes.AM]  = 0x04
modeValues[modes.NFM] = 0x06
modeValues[modes.WFM] = 0x07
modeValues[modes.RTTY] = 0x08
modeValues[modes.RTTYR] = 0x09
const filterValues = {
	'6k0': 88,
	'2k4': 80,
	'2k0': 82,
	'500': 84,
	'250': 86,
}

const hex2dec = (h) => {
	const s = Math.floor(h / 10)
	return s * 16 + (h - s * 10)
}

class YeasuTcvr {
	constructor(options = {catAdapter, baudrate}) {
		this._uart = (s) => options.catAdapter.serialData(s)
		this._baudrate = options.baudrate
		options.catAdapter.serial(this._baudrate)
	}

	static FT1000MP(options = {catAdapter, baudrate = 9600}) {
		return new YeasuTcvr(options)
	}

	get baudrate() {
		return this._baudrate
	}

	get agcTypes() {
		return null
	}

	get bands() {
		return _bands
	}
	
	get modes() {
		return _modes
	}

	get preamps() {
		return null
	}

	get attns() {
		return null
	}

	filters(mode) {
		return Object.keys(filterValues)
	}

	set frequency(f) {
		let mhz100_10 = 0
		if (f >=                     10000000) { // 10MHz
			mhz100_10 = Math.floor(f / 10000000)
			f = f - (mhz100_10 *       10000000)
		}
		// log(`f=${f}`)
		const khz1000_100 = Math.floor(f / 100000) // 100kHz
		f = f - (khz1000_100 *             100000)
		// log(`f=${f}`)
		const khz10_1 = Math.floor(f / 1000) // 1kHz
		f = f - (khz10_1 *             1000)
		// log(`f=${f}`)
		const hz100_10 = Math.floor(f / 10) // 10Hz
		f = f - (hz100_10 *             10)
		// log(`f=${f}`)
	
		const data = [hex2dec(hz100_10), hex2dec(khz10_1), hex2dec(khz1000_100), hex2dec(mhz100_10),
			0x0A]
		// log(`TCVR f: ${data}`)
		this._uart(data) //, (err) => err && log(`TCVR ${err.message}`))
	}

	set mode(mode) {
		const value = modeValues[mode]
		const data = [0, 0, 0, value, 0x0C]
		this._uart(data)
	}

	filter(filter, mode) {
		const value = filterValues[filter]
		const data = [0, 0, 0, value, 0x8C]
		this._uart(data)
	}

	set agc(agc) {
	}

	set preamp(gain) {
	}

	set attn(attn) {
	}
}

export {YeasuTcvr}
