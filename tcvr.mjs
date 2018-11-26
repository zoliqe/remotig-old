
const startFrequency = 7020000

class Band {
	constructor(name, id, minFreq, maxFreq) {
		this.name = name 
		this.id = id
		this.freqFrom = minFreq
		this.freqTo = maxFreq
	}

	static byId(id) {
		// return _bands.find(band => band.id == id)
		return _bands[id]
	}

	static byFreq(freq) {
		const f = Number(freq)
		return Object.values(_bands)
			.find(band => band.freqFrom <= f && band.freqTo >= f)
	}
}

const _bands = {}
const addBand = (name, id, minFreq, maxFreq) => _bands[id] = new Band(name, id, minFreq * 1000, maxFreq * 1000)
addBand(1.8,	160,	1810,			2000)
addBand(3.5,	80,		3500,			3800)
addBand(5,		60,		5351,			5368)
addBand(7,		40,		7000,			7200)
addBand(10.1,	30,		10100,		10150)
addBand(14,		20,		14000,		14350)
addBand(18,		17,		18068,		18168)
addBand(21,		15,		21000,		21450)
addBand(24,		12,		24890,		24990)
addBand(28,		10,		28000,		29700)
addBand(50,		6,		50000,		54000)
addBand(70,		4,		70000,		70500)
addBand(144,	2,		144000,		146000)
addBand(430,	70,		430000,		440000)
addBand(1296,	23,		1240000,	1300000)
const bands = Object.freeze(_bands)

// class Mode {
// 	constructor(id) {
// 		this.id = id
// 	}

// 	static byId(id) {
// 		return _modes.find(mode => mode.id == id)
// 	}
// }

const _modes = {}
const addMode = (id) => _modes[id] = id //_modes.push(new Mode(id))
addMode('CW')
addMode('CWR')
addMode('LSB')
addMode('USB')
addMode('RTTY')
addMode('NFM')
addMode('WFM')
addMode('AM')
const modes = Object.freeze(_modes)

const _agcTypes = {}
const addAgc = (agc) => _agcTypes[agc] = agc
addAgc('FAST')
addAgc('SLOW')
addAgc('MEDIUM')
addAgc('AUTO')
addAgc('NONE')
const agcTypes = Object.freeze(_agcTypes)

class Transceiver {
	constructor(tcvrAdapter) {
		this._adapter = tcvrAdapter

		if (this._outOfBand(startFrequency)) {
			this.frequency = this.bands[0].freqFrom + 20*1000
		} else {
			this.frequency = startFrequency
		}
		
		this._mode = tcvrAdapter.modes[0]
		this._agc = tcvrAdapter.agcTypes[0]
		this._gain = 0
	}

	get bands() {
		return this._adapter.bands || [] //.map(Band.byId)
	}

	get modes() {
		return this._adapter.modes || []
	}

	get attnLevels() {
		return this._adapter.attns || []
	}

	get preampLevels() {
		return this._adapter.preamps || []
	}

	get gainLevels() {
		const res = this.attnLevels.map(v => 0 - v)
		res.push(0)
		res.push(...this.preampLevels)
	}

	get agcTypes() {
		return this._adapter.agcTypes
	}

	set frequency(value) {
		const freq = Number(value)
		if (this._outOfBand(freq)) return

		this._adapter.frequency = freq
		this._freq = freq
	}

	_outOfBand(f) {
		const band = Band.byFreq(f)
		return !band || !this.bands.includes(band)
	}

	get frequency() {
		return this._freq
	}

	set mode(value) {
		if (!value) return
		const mode = modes[value.toUpperCase()]
		if (mode && this.modes.includes(mode)) {
			this._adapter.mode = mode
			this._mode = mode
		}
	}

	get mode() {
		return this._mode
	}

	set gain(value) {
		const gain = Number(value)
		if (gain != null && this.gainLevels.contains(gain)) {
			if (gain < 0) {
				this._adapter.attn = 0 - gain
			} else {
				this._adapter.preamp = gain
			}
			this._gain = gain
		}
	}

	get gain() {
		return this._gain
	}

	set agc(value) {
		if (!value) return
		const agc = agcTypes[value.toUpperCase()]
		if (agc && this.agcTypes.includes(agc)) {
			this._adapter.agc = agc
			this._agc = agc
		}
	}

	get agc() {
		return this._agc
	}
}

export {Transceiver, bands, modes, agcTypes}