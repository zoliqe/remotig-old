
class SmartceiverWebUSBConnector {
  constructor() {
    this.devFilters = [
      { 'vendorId': 0x2341, 'productId': 0x8036 },
      { 'vendorId': 0x2341, 'productId': 0x8037 },
    ]
  }

  get id() { return 'smartceiver-webusb'; }
  get name() { return 'SmartCeiver standalone WebUSB'; }
  static get capabilities() { return []; }

  connect(tcvr, successCallback) {
    // this.requestPort()
    navigator.usb.requestDevice({ 'filters': this.devFilters }).then(device => {
      console.log('Connecting to ' + device.productName)
      this._connectDevice(device).then(port => {
        console.log('Connected ' + device.productName)
        // port.onReceive = data => {
        //   console.log('Received: ' + data);
        // };
        // port.onReceiveError = error => {
        //   console.log('Receive error: ' + error);
        // };
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
    tcvr.addEventListener(EventType.keyDit, this.constructor.id, event => port.send(".;"))
    tcvr.addEventListener(EventType.keyDah, this.constructor.id, event => port.send("-;"))
    // tcvr.addEventListener(EventType.mode, this.constructor.id, event => port.send("MD" + (event.value + 1) + ";"))
    tcvr.addEventListener(EventType.freq, this.constructor.id, event => {
      let freq = event.value
      let data = "FA" // + _vfos[this._rxVfo]; // TODO split
      data += "000"
      if (freq < 10000000) { // <10MHz
          data += "0"
      }
      data += freq
      port.send(data + ";")
    })
    tcvr.addEventListener(EventType.wpm, this.constructor.id, event => port.send("KS0" + event.value + ";"))
    tcvr.addEventListener(EventType.filter, this.constructor.id, event => {
      // console.log('bandWidth=' + bandWidth)
      // TODO this.player.setFilter(tcvr.sidetoneFreq, event.value)
      port.send((event.value < 1000 ? "FW0" : "FW") + event.value + ";")
    })
    tcvr.addEventListener(EventType.preamp, this.constructor.id, event => port.send("PA" + (event.value ? "1" : "0") + ";"))
    tcvr.addEventListener(EventType.attn, this.constructor.id, event => port.send("RA0" + (event.value ? "1" : "0") + ";"))
  }

  // requestPort() {
  //   const filters = [
  //     { 'vendorId': 0x2341, 'productId': 0x8036 },
  //     { 'vendorId': 0x2341, 'productId': 0x8037 },
  //   ];
  //   return navigator.usb.requestDevice({ 'filters': filters }).then(
  //     device => new SmartceiverWebUSBPort(device)
  //   );
  // }

  // get ports() {
  //   return navigator.usb.getDevices().then(devices => {
  //     return devices.map(device => new SmartceiverWebUSBPort(device));
  //   });
  // };

}

class SmartceiverWebUSBPort {
  constructor(device) {
    this._device = device;
    this._encoder = new TextEncoder();
  }

  _open() {
    let decoder = new TextDecoder();
    let readLoop = () => {
      device.transferIn(5, 64).then(result => {
        this.onReceive(decoder.decode(result.data));
        readLoop();
      }, error => {
        this.onReceiveError(error);
      });
    };
    return device.open()
      .then(() => {
        if (device.configuration === null) {
          return device.selectConfiguration(1);
        }
      })
      .then(() => device.claimInterface(2))
      .then(() => device.controlTransferOut({
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

// var connector = {};

// (function() {
//   'use strict';
  
//   connector.encoder_ = new TextEncoder();
//   connector.decoder_ = new TextDecoder();

//   connector.connect = function(successCallback) {
//     connector.requestPort().then(selectedPort => {
//       console.log('Connecting to ' + selectedPort.device_.productName);
//       selectedPort.connect().then(() => {
//         console.log('Connected ' + selectedPort);
//         selectedPort.onReceive = data => {
//           console.log('Received: ' + data);
//         };
//         selectedPort.onReceiveError = error => {
//           console.log('Receive error: ' + error);
//         };
//         successCallback(selectedPort);
//       }, error => {
//          console.log('Connection error (2): ' + error);
//       });
//     }).catch(error => {
//       console.error('Connection error (1): ' + error);
//     });
//   }

//   connector.getPorts = function() {
//     return navigator.usb.getDevices().then(devices => {
//       return devices.map(device => new connector.Port(device));
//     });
//   };

//   connector.requestPort = function() {
//     const filters = [
//       { 'vendorId': 0x2341, 'productId': 0x8036 },
//       { 'vendorId': 0x2341, 'productId': 0x8037 },
//     ];
//     return navigator.usb.requestDevice({ 'filters': filters }).then(
//       device => new connector.Port(device)
//     );
//   }

//   connector.Port = function(device) {
//     this.device_ = device;
//   };

//   connector.Port.prototype.connect = function() {
//     let readLoop = () => {
//       this.device_.transferIn(5, 64).then(result => {
//         this.onReceive(connector.decoder_.decode(result.data));
//         readLoop();
//       }, error => {
//         this.onReceiveError(error);
//       });
//     };

//     return this.device_.open()
//         .then(() => {
//           if (this.device_.configuration === null) {
//             return this.device_.selectConfiguration(1);
//           }
//         })
//         .then(() => this.device_.claimInterface(2))
//         .then(() => this.device_.controlTransferOut({
//             'requestType': 'class',
//             'recipient': 'interface',
//             'request': 0x22,
//             'value': 0x01,
//             'index': 0x02}))
//         .then(() => {
//           readLoop();
//         });
//   };

//   connector.Port.prototype.disconnect = function() {
//     return this.device_.controlTransferOut({
//             'requestType': 'class',
//             'recipient': 'interface',
//             'request': 0x22,
//             'value': 0x00,
//             'index': 0x02})
//         .then(() => this.device_.close());
//   };

//   connector.Port.prototype.send = function(data) {
//     return this.device_.transferOut(4, connector.encoder_.encode(data));
//   };
// })();

