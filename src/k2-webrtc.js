
class K2WebRTCConnector {
  static get id() { return 'k2-webrtc'; }
  static get name() { return 'K2 remote via WebRTC'; }
  static get capabilities() { return [Remoddle.id]; }

  constructor() {
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

  connect(successCallback) {
    let webrtc = new SimpleWebRTC(this._options);
    webrtc.on('readyToCall', () => webrtc.joinRoom('k2-om4aa', (err, room) => { // TODO configurable room -> connectionId
      if (err) {
        console.log("connect err: " + err);
      } else {
        console.log("connect succeed: " + room);
        webrtc.mute();
        webrtc.pauseVideo();
        let port = new K2WebRTCPort(webrtc);
        setTimeout(() => {
          port.send('USESEMICOLON;');
          port.send('POWERON;');
          setTimeout(() => {
            port._timer = setInterval(() => port.send('POWERON;'), 10000);
            successCallback(port);
          }, 5000); // delay for tcvr-init after poweron 
        }, 3000); // delay for webrtc peer connection establish
      }
    }));
  }
}

class K2WebRTCPort {
  constructor(webrtc) {
    this._webrtc = webrtc;
  }

  set wpm(val) {
    this.send("KS0" + val + ";");
  }

  sendDit() {
    this.send(".;");
  }

  sendDah() {
    this.send("-;");
  }

  send(data) {
    // https://stackoverflow.com/questions/37891029/usage-example-of-senddirectlytoall-of-simplewebrtc
    this._webrtc.sendDirectlyToAll('meta', 'ctl', {msg: data});
  }

  disconnect() {
    clearInterval(this._timer);
    this.send('POWERON;');
    this._webrtc.disconnect();
  }
}

tcvrConnectors.register(new K2WebRTCConnector());
