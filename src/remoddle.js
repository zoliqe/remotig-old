class Remoddle {
  constructor(tcvr) {
    this._port = undefined;
    this._tcvr = tcvr;
  }

  static get id() { return 'remoddle'; }

  connect(successCallback) {
    this.requestPort().then(selectedPort => {
      console.log('Connecting to ' + selectedPort._device.productName);
      selectedPort.connect().then(() => {
        console.log('Connected ' + selectedPort);
        selectedPort.onReceive = data => {
          // console.log('Received: ' + data);
          this._evaluate(data);
        };
        selectedPort.onReceiveError = error => {
          console.log('Receive error: ' + error);
        };
        this._port = selectedPort;
        successCallback(this);
      }, error => {
         console.log('Connection error (2): ' + error);
      });
    }).catch(error => {
      console.error('Connection error (1): ' + error);
    });
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
    ];
    return navigator.usb.requestDevice({ 'filters': filters }).then(
      device => new RemoddlePort(device)
    );
  }

  get ports() {
    return navigator.usb.getDevices().then(devices => {
      return devices.map(device => new RemoddlePort(device));
    });
  }

  set wpm(value) {
    if (this._port) {
      this._port.send('KS0' + value + ';');
    }
  }

  _evaluate(data) {
    for (let i = 0; i < data.length; i++) {
      let element = data[i];
      if (element == '-') {
        this.onDah();
      } else if (element == '.') {
        this.onDit();
      }
    }
  }

  onDit() {
    // console.log('remoddle: .');
    this._tcvr.dispatchEvent(new TcvrEvent(EventType.keyDit, 1));    
  }

  onDah() {
    // console.log('remoddle: -');
    this._tcvr.dispatchEvent(new TcvrEvent(EventType.keyDah, 1));    
  }
}

class RemoddlePort {
  constructor(device) {
    this._device = device;
    this._encoder = new TextEncoder();
    this._decoder = new TextDecoder();
  }

  connect() {
    let readLoop = () => {
      this._device.transferIn(5, 64).then(result => {
        this.onReceive(this._decoder.decode(result.data));
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
}

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

