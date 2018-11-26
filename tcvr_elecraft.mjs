import {bands, modes, agcTypes} from './tcvr'

const _bands = [bands[160], bands[80], bands[40], bands[30], bands[20], bands[17], bands[15], bands[12], bands[10]]
const _modes = [modes.CW, modes.CWR, modes.LSB, modes.USB]
const _agc = [agcTypes.FAST, agcTypes.SLOW, agcTypes.NONE]

const MD = {}
MD[modes.CW] = 2
MD[modes.CWR] = 3
MD[modes.LSB] = 0
MD[modes.USB] = 1

class ElecraftTcvr {
    constructor(tcvrSend) {
        this._uart = tcvrSend
    }

    static get agcTypes() {
        return _agc
    }

    static get bands() {
        return _bands
    }
    
    static get modes() {
        return _modes
    }

    static get preamps() {
        return [20]
    }

    static get attns() {
        return [-10]
    }

    set frequency(freq) {
        this._uart('FA000' + freq)
    }

    set mode(mode) {
        this._uart('MD' + MD[mode])
    }

    set agc(agc) {

    }

    set preamp(gain) {
        this._uart('PA' + gain > 0 ? 1 : 0)
    }

    set attn(attn) {
        this._uart('RA0' + attn > 0 ? 1 : 0)
    }
}