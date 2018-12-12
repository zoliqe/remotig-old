
class K2WebRTCConnector {
  static get id() { return 'k2-webrtc'; }
  static get name() { return 'K2 remote via WebRTC'; }
  static get capabilities() { return [Remoddle.id]; }

  constructor() {
//     this._tcvr = tcvr;
    this._options = {
      localVideoEl: 'localStream',
      remoteVideoEl: 'remoteStream',
      autoRequestMedia: true,
      enableDataChannels: true,
      media: {video: false, audio: true},
      receiveMedia: {offerToReceiveAudio: 1, offerToReceiveVideo: 0},
      nick: 'operator'
    };
  }

  connect(tcvr, successCallback) {
    let webrtc = new SimpleWebRTC(this._options);
//     let tcvr = this._tcvr;
    webrtc.on('readyToCall', () => webrtc.joinRoom('k2-om4aa', (err, room) => { // TODO configurable room -> connectionId
      if (err) {
        console.log("connect err: " + err);
      } else {
        console.log("connect succeed: " + room);
        webrtc.mute();
        webrtc.pauseVideo();
        let port = new K2WebRTCPort(webrtc);
        setTimeout(() => {
          port.send('SEMICOL1;');
          port.send('POWER1;');
          setTimeout(() => {
            port._startPowerOnTimer(10000)
            this._bindCommands(tcvr, port)
            successCallback(port);
          }, 5000); // delay for tcvr-init after poweron 
        }, 3000); // delay for webrtc peer connection establish
      }
    }));
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
    tcvr.bind(EventType.filter, this.constructor.id, event => {
      // console.log('bandWidth=' + bandWidth)
      // TODO this.player.setFilter(tcvr.sidetoneFreq, event.value)
      // port.send((event.value < 1000 ? "FW0" : "FW") + event.value + ";")
    })
    tcvr.bind(EventType.preamp, this.constructor.id, event => port.send("PA" + (event.value ? "1" : "0") + ";"))
    tcvr.bind(EventType.attn, this.constructor.id, event => port.send("RA0" + (event.value ? "1" : "0") + ";"))
  }

}

class K2WebRTCPort {
  constructor(webrtc) {
    this._webrtc = webrtc;
  }

  _startPowerOnTimer(interval) {
    this._timer = setInterval(() => this.send('POWER1;'), interval);
  }

  // set wpm(val) {
  //   this.send("KS0" + val + ";");
  // }

  // _sendDit() {
  //   this.send(".;");
  // }

  // _sendDah() {
  //   this.send("-;");
  // }

  send(data) {
    // https://stackoverflow.com/questions/37891029/usage-example-of-senddirectlytoall-of-simplewebrtc
    this._webrtc.sendDirectlyToAll('meta', 'ctl', {msg: data});
  }

  disconnect() {
    clearInterval(this._timer);
    this.send('POWEROFF;');
    this._webrtc.disconnect();
  }
}

tcvrConnectors.register(new K2WebRTCConnector());
