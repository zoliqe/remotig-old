class Remoddle {
  constructor(tcvr) {
    this._port = undefined
    this._tcvr = tcvr
  }

  static get id() { return 'remoddle' }

  connect(successCallback) {
    this.requestPort().then(selectedPort => {
      console.log('Connecting to ' + selectedPort._device.productName)
      selectedPort.connect().then(() => {
        console.log('Connected ' + JSON.stringify(selectedPort))
        selectedPort.onReceive = data => this._evaluate(data)
        selectedPort.onReceiveError = error => console.log('Receive error: ' + error)
        this._port = selectedPort
        if (this._port && this._tcvr) {
          this._tcvr.bind(EventType.wpm, this.constructor.id, event => this._port.send("S" + event.value + "\r\n"))
          successCallback(this)
        }
      }, error => {
         console.log('Connection error (2): ' + error)
      })
    }).catch(error => {
      console.error('Connection error (1): ' + error)
    })
  }

  disconnect() {
    if (this._port) {
      this._port.disconnect();
    }
    this._port = undefined;
  }

  requestPort() {
    const filters = [
      { 'vendorId': 0x2341, 'productId': 0x8036 },
      { 'vendorId': 0x2341, 'productId': 0x8037 },
    ]
    if (navigator.usb == null) return Promise.reject(new Error('WebUSB not supported!'))

    return navigator.usb
      .requestDevice({ 'filters': filters })
      .then(device => new RemoddlePort(device))
  }

  // get ports() {
  //   return navigator.usb
  //     .getDevices()
  //     .then(devices => { return devices.map(device => new RemoddlePort(device)) })
  // }

  // set wpm(value) {
  //   if (this._port) {
  //     this._port.send('KS0' + value + ';');
  //   }
  // }

  _evaluate(data) {
    if ( ! this._tcvr) {
      return
    }
    for (let i = 0; i < data.length; i++) {
      let element = data[i]
      if (element === '-') {
        // console.log('remoddle: -')
        this._tcvr.fire(new TcvrEvent(EventType.keyDah, 1))    
      } else if (element === '.') {
        // console.log('remoddle: .')
        this._tcvr.fire(new TcvrEvent(EventType.keyDit, 1))   
      } else if (element === '_') {
        this._tcvr.fire(new TcvrEvent(EventType.keySpace, 1))
      }
    }
  }

}

class RemoddlePort {
  constructor(device) {
    this._device = device;
    this._encoder = new TextEncoder()
    this._decoder = new TextDecoder()
  }

  connect() {
    let readLoop = () => {
      this._device.transferIn(5, 64).then(result => {
        this.onReceive(this._decoder.decode(result.data))
        readLoop()
      }, error => {
        this.onReceiveError(error)
      })
    }

    return this._device.open()
      .then(() => {
        if (this._device.configuration === null) {
          return this._device.selectConfiguration(1)
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
      .then(() => readLoop())
  }

  disconnect() {
    return this._device.controlTransferOut({
      'requestType': 'class',
      'recipient': 'interface',
      'request': 0x22,
      'value': 0x00,
      'index': 0x02
    })
      .then(() => this._device.close())
  }

  send(data) {
    return this._device.transferOut(4, this._encoder.encode(data))
  }
}

