
export class Transceiver {
	constructor(tcvrService) {
		this._service = tcvrService

		this._freq = 7020000
		this._mode = tcvrService.modes[0]
		this._agc = tcvrService.agcTypes[0]
		this._gain = 0
	}

	get gainValues() {
		const res = this._service.attenuatorValues.map(v => 0 - v)
		res.push(0)
		res.push(...this._service.preampValues)
	}
}