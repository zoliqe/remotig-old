// const _modes = ['LSB', 'USB', 'CW', 'CWR']; // order copies mode code for MDn cmd
const _narrowFilters = [1800, 1800, 300, 300]; // in _modes order
const _wideFilters =   [2700, 2700, 1000, 1000]; // in _modes order

class K2WebSocketsConnector {
  static get id() { return 'k2-ws'; }
  static get name() { return 'K2 remote via WebSockets'; }
  static get capabilities() { return [Remoddle.id]; }

  constructor() {
    this._mode = 2
  }

  connect(tcvr, successCallback) {
    // TODO connect to WS
    setTimeout(() => {
      this.send('USESEMICOLON;')
      this.send('POWERON;')
      this.player = new WavPlayer()
      this.player.play('/stream.wav')
      // this.player.setFilter('lowpass', _wideFilters[this._mode], 1)
      setTimeout(() => {
        this._timer = setInterval(() => this.send('POWERON;'), 10000)
        tcvr.addEventListener(EventType.keyDit, event => this.send(".;"))
        tcvr.addEventListener(EventType.keyDah, event => this.send("-;"))
        tcvr.addEventListener(EventType.mode, event => {
          this._mode = event.value;
          this.send("MD" + (this._mode + 1) + ";")
        })
        tcvr.addEventListener(EventType.freq, event => {
          let freq = event.value;
          let data = "FA" // + _vfos[this._rxVfo]; // TODO split
          data += "000"
          if (freq < 10000000) { // <10MHz
              data += "0"
          }
          data += freq
          this.send(data + ";")
        })
        tcvr.addEventListener(EventType.wpm, event => this.send("KS0" + event.value + ";"))
        tcvr.addEventListener(EventType.filter, event => {
          // TODO webAudio
          let freq = event.value ? _narrowFilters[this._mode] : _wideFilters[this._mode]
          console.log('filterFreq=' + freq)
          this.player.setFilter('lowpass', freq, 1)
          let data = "FW" + freq
          this.send(data + ";")
        })
        tcvr.addEventListener(EventType.preamp, event => this.send("PA" + (event.value ? "1" : "0") + ";"))
        tcvr.addEventListener(EventType.attn, event => this.send("RA0" + (event.value ? "1" : "0") + ";"))
        
        successCallback(this);
      }, 5000) // delay for tcvr-init after poweron 
    }, 3000) // delay for webrtc peer connection establish
  }

  disconnect() {
    clearInterval(this._timer)
    this.send('POWEROFF;')
    this.player.stop()
  }

  send(data) {
    // https://stackoverflow.com/questions/37891029/usage-example-of-senddirectlytoall-of-simplewebrtc
    // this._webrtc.sendDirectlyToAll('meta', 'ctl', {msg: data});
  }
}

tcvrConnectors.register(new K2WebSocketsConnector());
