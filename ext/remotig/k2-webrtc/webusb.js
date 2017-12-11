var connector = {};

(function() {
  'use strict';
  
  connector.encoder_ = new TextEncoder();
  connector.decoder_ = new TextDecoder();

  connector.connect = function(successCallback, onReceiveError, onError) {
    connector.requestPort().then(selectedPort => {
      console.log('Connecting to ' + selectedPort.device_.productName);
      selectedPort.connect().then(() => {
        console.log('Connected ' + selectedPort);
        selectedPort.onReceive = data => {
          console.log('Received: ' + data);
        };
        selectedPort.onReceiveError = error => {
          console.log('Receive error: ' + error);
          onReceiveError(error);
        };
        successCallback(selectedPort);
      }, error => {
         console.log('Connection error (2): ' + error);
         onError(error);
      });
    }).catch(error => {
      console.error('Connection error (1): ' + error);
      onError(error);
    });
  }

  connector.getPorts = function() {
    return navigator.usb.getDevices().then(devices => {
      return devices.map(device => new connector.Port(device));
    });
  };

  connector.requestPort = function() {
    const filters = [
      { 'vendorId': 0x2341, 'productId': 0x8036 },
      { 'vendorId': 0x2341, 'productId': 0x8037 },
    ];
    return navigator.usb.requestDevice({ 'filters': filters }).then(
      device => new connector.Port(device)
    );
  }

  connector.Port = function(device) {
    this.device_ = device;
  };

  connector.Port.prototype.connect = function() {
    let readLoop = () => {
      this.device_.transferIn(5, 64).then(result => {
        this.onReceive(connector.decoder_.decode(result.data));
        readLoop();
      }, error => {
        this.onReceiveError(error);
      });
    };

    return this.device_.open()
        .then(() => {
          if (this.device_.configuration === null) {
            return this.device_.selectConfiguration(1);
          }
        })
        .then(() => this.device_.claimInterface(2))
        .then(() => this.device_.controlTransferOut({
            'requestType': 'class',
            'recipient': 'interface',
            'request': 0x22,
            'value': 0x01,
            'index': 0x02}))
        .then(() => {
          readLoop();
        });
  };

  connector.Port.prototype.disconnect = function() {
    return this.device_.controlTransferOut({
            'requestType': 'class',
            'recipient': 'interface',
            'request': 0x22,
            'value': 0x00,
            'index': 0x02})
        .then(() => this.device_.close());
  };

  connector.Port.prototype.send = function(data) {
    return this.device_.transferOut(4, connector.encoder_.encode(data));
  };
})();
