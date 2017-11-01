
class WebRTCConnector {
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
    webrtc.on('readyToCall', () => webrtc.joinRoom('k2-om4aa', (err, room) => {
      if (err) {
        console.log("connect err: " + err);
      } else {
        console.log("connect succeed: " + room);
        // webrtc.mute();
        // webrtc.pauseVideo();
        let port = new WebRTCPort(webrtc);
        setTimeout(() => {
          port.send('POWERON;');
          setTimeout(() => {
            port.timer = setInterval(() => port.send('POWERON;'), 10000);
            successCallback(port);
          }, 5000);
        }, 3000);
      }
    }));
  }
}

class WebRTCPort {
  constructor(webrtc) {
    this._webrtc = webrtc;
  }

  // poweron() {
    // this.send('POWERON;');
    // setTimeout(this._onPoweredOn, 5000);
  // }
  set timer(val) {
    this._timer = val;
  }
  // _onPoweredOn() {
  //   this._timer = setInterval(() => this.send('POWERON'), 10000);
  //   this._successCallback(this);
  // }

  send(data) {
    // https://stackoverflow.com/questions/37891029/usage-example-of-senddirectlytoall-of-simplewebrtc
    this._webrtc.sendDirectlyToAll('meta', 'ctl', {msg: data});
  }

  disconnect() {
    clearInterval(this._timer);
    this._webrtc.disconnect();
  }
}

var connector = new WebRTCConnector();
