
class RemotigConnector {
  static get id() { return 'remotig'; }
  static get name() { return 'Remotig remote via WebSockets'; }
  static get capabilities() { return [Remoddle.id]; }

  constructor() {
  }

  connect(tcvr, token, successCallback, discCallback) {
    this.tcvr = tcvr
    this.token_ = token
    this.onconnect = successCallback
    this.ondisconnect = discCallback
    // const url = location.origin.replace(location.protocol, 'ws:') + "/control/" + token
    const url = `ws://${location.host}/control/${token}`
    console.log('connecting ' + url)
    let ws = new WebSocket(url)
    ws.onopen = (evt) => new RemotigPort(ws,
      port => this.onportopen(port),
      () => this.onportclose())
  }

  onportopen(port) {
    console.log('ok, powering on')
    port.send('poweron')
    // port.send('keyeron')
    this.audioUrl_ = `ws://${location.hostname}:${audioStreamPort}` //'/stream/' + this.token_
    this._playStream()

    setTimeout(() => {
      this._startPowerOnTimer(port, 10000)
      this._bindCommands(this.tcvr, port)
      this.onconnect && this.onconnect(port)
    }, 5000) // delay for tcvr-init after poweron 
  }

  _startPowerOnTimer(port, interval) {
    this._timer = setInterval(() => port.send('poweron'), interval);
  }

  onportclose() {
    clearInterval(this._timer)
    if (this.player_) {
      this.player_.stop()
    }
    window.alert('Transceiver control disconnected!')
    this.ondisconnect && this.ondisconnect()
  }

  _bindCommands(tcvr, port) {
    if (!tcvr || !port) return

    tcvr.bind(EventType.keyDit, this.constructor.id, () => port.send("."))
    tcvr.bind(EventType.keyDah, this.constructor.id, () => port.send("-"))
    tcvr.bind(EventType.keySpace, this.constructor.id, () => port.send("_"))
    tcvr.bind(EventType.mode, this.constructor.id, event => port.send("mode=" + event.value.toLowerCase()))
    tcvr.bind(EventType.freq, this.constructor.id, event => {
      //let freq = event.value
      //let data = "FA" // + _vfos[this._rxVfo]; // TODO split
      //data += "000"
      //if (freq < 10000000) { // <10MHz
        //  data += "0"
      //}
      //data += freq
      port.send(`f=${event.value}`)
    })
    tcvr.bind(EventType.wpm, this.constructor.id, event => port.send("wpm=" + event.value))
    tcvr.bind(EventType.filter, this.constructor.id, event => this.filter(event.value, tcvr.sidetoneFreq))
    tcvr.bind(EventType.preamp, this.constructor.id, event => port.send("preamp" + (event.value ? "on" : "off")))
    tcvr.bind(EventType.attn, this.constructor.id, event => port.send("attn" + (event.value ? "on" : "off")))
    tcvr.bind(EventType.ptt, this.constructor.id, event => port.send('ptt' + (event.value ? 'on' : 'off')))
    tcvr.bind(EventType.agc, this.constructor.id, event => port.send('agc' + (event.value ? 'on' : 'off')))
    tcvr.bind(EventType.resetAudio, this.constructor.id, _ => this.restartAudio())
  }

  _playStream() {
    console.log(`playing RX stream ${this.audioUrl_}`)
    this.player_ = new LllasPlayer() //new WavPlayer()
    this.player_.play(this.audioUrl_)
    // this._player.setFilter('lowpass', _wideFilters[this._mode], 1)
  }

  restartAudio() {
    if (this.player_ && this.audioUrl_) {
      console.log('restarting RX stream')
      this.player_.stop()
      this.player_.play(this.audioUrl_)
    }
  }

  filter(bandWidth, centerFreq) {
    if (this.player_) {
      this.player_.setFilter(centerFreq, bandWidth)
    }
    // port.send((bandWidth < 1000 ? "FW0" : "FW") + bandWidth + ";")
  }

}

class RemotigPort {
  constructor(ws, onopenCallback, oncloseCallback) {
    this._connected = false
    this._ws = ws
    this.onopen = onopenCallback
    this.onclose = oncloseCallback
    ws.onmessage = (event) => this.received(event.data)
    ws.onclose = () => {
      this._ws = null
      this.disconnect()
    }
    ws.onerror = (err) => console.log(`control error: ${err}`)
  }

  get connected() {
    return this._connected
  }

  disconnect(args = {}) {
    // console.log('control disconnect')
    args.silent || this.send('poweroff')
    
    if (this._ws) {
      this._ws.onclose = undefined
      this._ws.close()
    }
    this._connected = false
    this.onclose && this.onclose()
  }

  send(data) {
    // console.log('ws send:', data)
    '-._'.includes(data) && console.log(`K${data}`)
    if (this._ws) {
      // console.log('ok')
      this._ws.send(data)
    }
  }

  received(msg) {
    console.log(`control msg: ${msg}`)
    if (msg === 'conack') {
      this._connected = true
      this.onopen && this.onopen(this)
    } else if (msg === 'disc' && this._connected) {
      this.disconnect({ silent: true })
    }
  }
}

tcvrConnectors.register(new RemotigConnector());
