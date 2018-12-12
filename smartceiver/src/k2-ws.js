
class K2WebSocketsConnector {
  static get id() { return 'k2-ws'; }
  static get name() { return 'K2 remote via WebSockets'; }
  static get capabilities() { return [Remoddle.id]; }

  constructor() {
  }

  connect(tcvr, successCallback) {
    let url = "ws://" + window.location.hostname + ":8090/ctl"
    console.log('connecting ' + url)
    let ws = new WebSocket(url)
    ws.onopen = (evt) => {
      // this.ws = ws;
      let port = new K2WebSocketsPort(ws)
      console.log('ok, powering on')
      port.send('SEMICOL1;')
      port.send('POWER1;')
      port._playStream('/stream.wav')
      
      setTimeout(() => {
        port._startPowerOnTimer(10000)
        this._bindCommands(tcvr, port)
        successCallback(port);
      }, 5000) // delay for tcvr-init after poweron 
    }
  }

  _bindCommands(tcvr, port) {
    tcvr.bind(EventType.keyDit, this.constructor.id, event => port.send(".;"))
    tcvr.bind(EventType.keyDah, this.constructor.id, event => port.send("-;"))
    tcvr.bind(EventType.mode, this.constructor.id, event => port.send("MD" + (event.value + 1) + ";"))
    tcvr.bind(EventType.freq, this.constructor.id, event => {
      let freq = event.value
      let data = "FA" // + _vfos[this._rxVfo]; // TODO split
      data += "000"
      if (freq < 10000000) { // <10MHz
          data += "0"
      }
      data += freq
      port.send(data + ";")
    })
    tcvr.bind(EventType.wpm, this.constructor.id, event => port.send("KS0" + event.value + ";"))
    tcvr.bind(EventType.filter, this.constructor.id, event => port.filter(event.value))
    tcvr.bind(EventType.preamp, this.constructor.id, event => port.send("PA" + (event.value ? "1" : "0") + ";"))
    tcvr.bind(EventType.attn, this.constructor.id, event => port.send("RA0" + (event.value ? "1" : "0") + ";"))
  }
}

class K2WebSocketsPort {
  constructor(ws) {
    this._ws = ws
  }

  _playStream(url) {
    console.log('playing RX stream')
    this._player = new WavPlayer()
    this._player.play(url)
    // this._player.setFilter('lowpass', _wideFilters[this._mode], 1)
  }

  _startPowerOnTimer(interval) {
    this._timer = setInterval(() => this.send('POWER1;'), interval);
  }

  filter(bandWidth) {
    if (this._player) {
      this._player.setFilter(tcvr.sidetoneFreq, event.value)
    }
    // port.send((bandWidth < 1000 ? "FW0" : "FW") + bandWidth + ";")
  }

  disconnect() {
    clearInterval(this._timer)
    this.send('POWER0;')
    if (this._ws) {
      this._ws.close()
    }
    if (this._player) {
      this._player.stop()
    }
  }

  send(data) {
    if (this._ws) {
      this._ws.send(data)
    }
  }
}

tcvrConnectors.register(new K2WebSocketsConnector());
