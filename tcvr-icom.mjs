import {bands, modes, agcTypes} from './tcvr'

const _bands = [bands[160], bands[80], bands[40], bands[30], 
	bands[20], bands[17], bands[15], bands[12], bands[10], bands[6], 
	bands[2], bands[70]]
const _modes = [modes.CW, modes.CWR, modes.LSB, modes.USB]
const _agc = [agcTypes.FAST, agcTypes.SLOW]
const myCivAddr = 224
const modeValues = {}
modeValues[modes.LSB] = 0x00
modeValues[modes.USB] = 0x01
modeValues[modes.AM]  = 0x02
modeValues[modes.CW]  = 0x03
modeValues[modes.RTTY] = 0x04
modeValues[modes.NFM] = 0x05
modeValues[modes.WFM] = 0x06

// const CivAddress = Object.freeze({IC706: 0x58})

const hex2dec = (h) => {
	const s = Math.floor(h / 10)
	return s * 16 + (h - s * 10)
}

class IcomTcvr {
	constructor(adapter, address) {
		this._uart = (s) => adapter.serialData(s)
		this._tcvrAddr = address
	}

	static IC706(adapter) { // baudrate = 9600
		return new IcomTcvr(adapter, 0x58)
	}

	get civAddress() {
		return this._tcvrAddr
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
		return [10]
	}

	get attns() {
		return [10]
	}

	filters(mode) {
		return null
	}

	set frequency(f) {
		let mhz100 = 0
		if (f >= 100000000) {
			mhz100 = Math.floor(f / 100000000)
			f = f - (mhz100 * 100000000)
		}
		// log(`f=${f}`)
		const mhz10_1 = Math.floor(f / 1000000) // 10MHz, 1MHz
		f = f - (mhz10_1 * 1000000)
		// log(`f=${f}`)
		const khz100_10 = Math.floor(f / 10000) // 100kHz, 10kHz
		f = f - (khz100_10 * 10000)
		// log(`f=${f}`)
		const hz1000_100 = Math.floor(f / 100) // 1kHz, 100Hz
		f = f - (hz1000_100 * 100)
		// log(`f=${f}`)
		const hz10 = Math.floor(f / 10) * 10 // 10Hz
	
		const data = [0xFE, 0xFE,
			this._tcvrAddr, myCivAddr, 0, // 0: transfer Freq CMD w/o reply .. 5: set Freq CMD with reply
			hex2dec(hz10), hex2dec(hz1000_100), hex2dec(khz100_10), hex2dec(mhz10_1), mhz100,
			0xFD]
		// log(`TCVR f: ${data}`)
		this._uart(data) //, (err) => err && log(`TCVR ${err.message}`))
	}

	set mode(mode) {
		const value = modeValues[mode]
		if (value === null) return
	
		// log(`tcvrMode: ${mode} => ${value}`)
		const data = [0xFE, 0xFE,
			this._tcvrAddr, myCivAddr, 0x06, value, 0x01,
			0xFD]
		this._uart(data)
	}

	set agc(agc) {
		const value = agc == agcTypes.SLOW ? 0x02 : 0x01
		// log(`tcvrAgc: ${state}`)
		const data = [0xFE, 0xFE,
			this._tcvrAddr, myCivAddr, 0x16, 0x12, value,
			0xFD]
		this._uart(data)
	}

	set preamp(gain) {
		// log(`tcvrPreamp: ${state}`)
		const value = gain > 0 ? 0x01 : 0
		const data = [0xFE, 0xFE,
			this._tcvrAddr, myCivAddr, 0x16, 0x02, value,
			0xFD]
		this._uart(data)
	}

	set attn(attn) {
		// log(`tcvrAttn: ${state}`)
		const value = attn > 0 ? 0x20 : 0
		const data = [0xFE, 0xFE,
			this._tcvrAddr, myCivAddr, 0x11, value,
			0xFD]
		this._uart(data)
	}

	filter(filter, mode) {
		// not supported
	}
}

export {IcomTcvr}
