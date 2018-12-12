
class SmartceiverWebUSBConnector {
  constructor() {
    this.devFilters = [
      { 'vendorId': 0x2341, 'productId': 0x8036 },
      { 'vendorId': 0x2341, 'productId': 0x8037 },
    ]
  }

  static get id() { return 'smartceiver-webusb'; }
  static get name() { return 'SmartCeiver standalone WebUSB'; }
  static get capabilities() { return []; }

  connect(tcvr, successCallback) {
    // this.requestPort()
    navigator.usb.requestDevice({ 'filters': this.devFilters }).then(device => {
      console.log('Connecting to ' + device.productName)
      this._connectDevice(device).then(port => {
        console.log('Connected ' + device.productName)
        this._bindCommands(tcvr, port)
        successCallback(port);
      }, error => {
         console.log('Connection error (2): ' + error);
      });
    }).catch(error => {
      console.error('Connection error (1): ' + error);
    });
  }

  _connectDevice(device) {
    let port = new SmartceiverWebUSBPort(device)
    return port._open().then(() => port)
  };

  _bindCommands(tcvr, port) {
    tcvr.bind(EventType.keyDit, this.constructor.id, event => port.send(".;"))
    tcvr.bind(EventType.keyDah, this.constructor.id, event => port.send("-;"))
    // tcvr.bind(EventType.mode, this.constructor.id, event => port.send("MD" + (event.value + 1) + ";"))
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
      port.send((event.value < 1000 ? "RW0" : "RW") + event.value + ";")
    })
    tcvr.bind(EventType.preamp, this.constructor.id, event => port.send("PA" + (event.value ? "1" : "0") + ";"))
    tcvr.bind(EventType.attn, this.constructor.id, event => port.send("RA0" + (event.value ? "1" : "0") + ";"))
  }
}

class SmartceiverWebUSBPort {
  constructor(device) {
    this._device = device;
    this._encoder = new TextEncoder();
  }

  _open() {
    let decoder = new TextDecoder();
    let readLoop = () => {
      this._device.transferIn(5, 64).then(result => {
        this.onReceive(decoder.decode(result.data));
        readLoop();
      }, error => {
        this.onReceiveError(error);
      });
    };
    return this._device.open()
      .then(() => {
        if (this._device.configuration === null) {
          return this._device.selectConfiguration(1);
        }
      })
      .then(() => this._device.claimInterface(2))
      .then(() => this._device.controlTransferOut({
        'requestType': 'class',
        'recipient': 'interface',
        'request': 0x22,
        'value': 0x01,
        'index': 0x02
      }))
      .then(() => {
        readLoop();
      });
  }

  disconnect() {
    return this._device.controlTransferOut({
      'requestType': 'class',
      'recipient': 'interface',
      'request': 0x22,
      'value': 0x00,
      'index': 0x02
    })
      .then(() => this._device.close());
  }

  send(data) {
    return this._device.transferOut(4, this._encoder.encode(data));
  }

  onReceive(data) {
    console.log('Received: ' + data);
  }

  onReceiveError(error) {
    console.log('Receive error: ' + error);
  }
}

tcvrConnectors.register(new SmartceiverWebUSBConnector());
