const _vfos = ['A', 'B'];
const _bands = ['1.8', '3.5', '7', '10.1', '14', '18', '21', '24', '28'];
const _bandLowEdges = [1800000, 3500000, 7000000, 10100000, 14000000, 18068000, 21000000, 24890000, 28000000];
const _modes = ['LSB', 'USB', 'CW', 'CWR']; // order copies mode code for MDn cmd
const _narrowFilters = ['1800', '1800', '0200', '0200']; // in _modes order
const _wideFilters =   ['2700', '2700', '0600', '0600']; // in _modes order
const _sidetoneFreq = 600;
const _sidetoneLevel = 0.2;

class Transceiver {
  constructor() {
    this._connectorId = 'k2-webrtc'; // TODO configurable
    this._rxVfo = 0;
    this._txVfo = 0; // TODO split operation
    this._band = 2;
    this._mode = 2;
    this._freq = [];
    _bandLowEdges.forEach(freq => {
      let band = _bandLowEdges.indexOf(freq);
      if (!(band in this._freq)) {
        this._freq[band] = [];
      }
      for (const mode in _modes) {
        if (!(mode in this._freq[band])) {
          this._freq[band][mode] = [];
        }
        for (const vfo in _vfos) {
          this._freq[band][mode][vfo] = freq;
        }
      }
    });
    console.log(`freqs=${this._freq}`);
    this._wpm = 28;
    this._txEnabled = true;
    this._txKeyed = false;
    this._autoSpace = true;
    this._narrow = false;
    this._preamp = false;
    this._attn = false;
    this._audioCtx = new AudioContext();
    this._listeners = {};
    this.addEventListener(EventType.keyDit, event => this._sidetoneOn(1));
    this.addEventListener(EventType.keyDah, event => this._sidetoneOn(3));
    this._d("tcvr-init", "done");
  }

  switchPower() {
    if (this._port) {
      this._port.disconnect();
      this._port = undefined;
      this._d("disconnect", true);
    } else {
      console.log('connect');
      tcvrConnectors.get(this._connectorId).connect((port) => {
        this._port = port;
        // reset tcvr configuration
        this.freq = this._freq[this._band][this._mode][this._rxVfo];
        this.wpm = this._wpm;
        this.txEnabled = this._txEnabled;
        this.autoSpace = this._autoSpace;
        this.txKeyed = this._txKeyed;
        this.narrow = this._narrow;
        this.preamp = this._preamp;
        this.attn = this._attn;
        this._attachKeying();
      });
    }
  }

  connectRemoddle() {
    if (this._remoddle) {
      this._remoddle.disconnect();
      this._remoddle = undefined;
      return;
    }
    if (tcvrConnectors.get(this._connectorId).constructor.capabilities.includes(Remoddle.id)) {
      new Remoddle().connect(remoddle => {
        this._remoddle = remoddle;
        remoddle.wpm = this.wpm; // sync with current wpm state
        this._attachKeying();
      });
    }
  }

  _attachKeying() {
    this.whenConnected(() => {
      if (this._remoddle) { // TODO remove
          this._remoddle.onDit = () => {
          this._port.sendDit();
          this._sidetoneOn(1);
        };
        this._remoddle.onDah = () => {
          this._port.sendDah();
          this._sidetoneOn(3);
        };
      }
    });
  }

  _sidetoneOn(len) {
    let bfo = this._audioCtx.createOscillator();
    let amp = this._audioCtx.createGain();

    bfo.frequency.setValueAtTime(_sidetoneFreq, 0); // TODO configurable
    amp.gain.setValueAtTime(_sidetoneLevel, 0); // TODO configurable

    bfo.connect(amp);
    amp.connect(this._audioCtx.destination);

    bfo.start();
    setTimeout(() => {
      bfo.stop();
    }, len * (1200 / this._wpm));
  }

  whenConnected(proceed) {
    if (this._port) {
      proceed();
    }
  }

  get allBands() {
    // return this._freq.keys();
    return _bands;
  }

  get allModes() {
    return _modes;
  }

  get allVfos() {
    return _vfos;
  }

  get band() {
    return this._band;
  }
  set band(band) {
    this.whenConnected(() => {
      this._d("band", band);
      if (band in _bands) {
        this._band = band;
        this.freq = this._freq[this._band][this._mode][this._rxVfo]; // call setter  
      }
    });
  }

  get mode() {
    return this._mode;
  }
  set mode(value) {
    this.whenConnected(() => {
      this._d("mode", value);
      if (value in _modes) {
        this._mode = value;
        this.freq = this._freq[this._band][this._mode][this._rxVfo]; // call setter
        this._port.send("MD" + (this._mode + 1) + ";");
        this.dispatchEvent(new ChangeEvent(EventType.mode, this._mode));
      }
    });
  }

  get freq() {
    return this._freq[this._band][this._mode][this._rxVfo];
  }
  set freq(freq) {
    this.whenConnected(() => {
      this._freq[this._band][this._mode][this._rxVfo] = freq;
      this._d("freq", freq);
  
      let data = "F" + _vfos[this._rxVfo]; // TODO split
      data += "000";
      if (freq < 10000000) { // <10MHz
          data += "0";
      }
      data += freq;
      this._port.send(data + ";");  
      this.dispatchEvent(new ChangeEvent(EventType.freq, freq));
    });
  }

  get wpm() {
    return this._wpm;
  }
  set wpm(wpm) {
    this.whenConnected(() => {
      this._wpm = wpm;
      this._d("wpm", wpm);
      this._port.wpm = wpm;
      this.dispatchEvent(new ChangeEvent(EventType.wpm, wpm));
      if (this._remoddle) { // TODO remove after use listener
        this._remoddle.wpm = wpm; // propagate the change
      }
    // this._port.send("KS0" + wpm + ";");
    });
  }

  get narrow() {
    return this._narrow;
  }
  set narrow(narrow) {
    this.whenConnected(() => {
      this._narrow = narrow;
      this._d("narrow", narrow);
      let data = "FW" + (narrow ? _narrowFilters[this._mode] : _wideFilters[this._mode]);
      this._port.send(data + ";");
      this.dispatchEvent(new ChangeEvent(EventType.filter, this._narrow));
    });
  }

  get preamp() {
    return this._preamp;
  }
  set preamp(state) {
    this.whenConnected(() => {
      this._preamp = state;
      this._d("preamp", this._preamp);
      this._port.send("PA" + (this._preamp ? "1" : "0") + ";");
      this.dispatchEvent(new ChangeEvent(EventType.preamp, this._preamp));
    });
  }

  get attn() {
    return this._attn;
  }
  set attn(state) {
    this.whenConnected(() => {
      this._attn = state;
      this._d("attn", this._attn);
      this._port.send("RA0" + (this._attn ? "1" : "0") + ";");
      this.dispatchEvent(new ChangeEvent(EventType.attn, this._attn));
    });
  }

  get txEnabled() {
    return this._txEnabled;
  }
  set txEnabled(txEnabled) {
    this.whenConnected(() => {
      this._txEnabled = txEnabled;
      this._d("txEnabled", txEnabled);
  
      // let data = "KE" + (txEnabled ? "1" : "0");
      // this._port.send(data + ";");
    });
  }

  get autoSpace() {
    return this._autoSpace;
  }
  set autoSpace(autoSpace) {
    this.whenConnected(() => {
      this._autoSpace = autoSpace;
      this._d("autoSpace", autoSpace);
  
      // let data = "KA" + (autoSpace ? "1" : "0");
      // this._port.send(data + ";");
    });
  }

  get txKeyed() {
    return this._txKeyed;
  }
  set txKeyed(txKeyed) {
    this.whenConnected(() => {
      this._txKeyed = txKeyed;
      this._d("txKeyed", txKeyed);
  
      // let data = "KT" + (txKeyed ? "1" : "0");
      // this._port.send(data + ";");
    });
  }

  addEventListener(type, callback) {
    if (!(type in this._listeners)) {
      this._listeners[type] = [];
    }
    this._listeners[type].push(callback);
    this._d("addEventListener: " + type + ", callbacks:", this._listeners[type].length);
  }

  removeEventListener(type, callback) {
    if (!(type in this._listeners)) {
      return;
    }
    let stack = this._listeners[type];
    for (let i = 0, l = stack.length; i < l; i++) {
      if (stack[i] === callback) {
        stack.splice(i, 1);
        this._d("removeEventListener: " + type + ", callbacks:", stack.length);
        return;
      }
    }
  }

  dispatchEvent(event) {
    if (!(event.type in this._listeners)) {
      return true;
    }
    let stack = this._listeners[event.type];
    stack.forEach(callback => callback.call(this, event));
    return true;//!event.defaultPrevented;
  }

  _d(what, value) {
    console.log(what + "=" + value);
  }
}

// TODO propagete changes via event listeners
class ChangeEvent {
  constructor(type, value) {
    this._type = type;
    this._value = value;
  }
  get type() { return this._type; }
  get value() { return this._value; }
}

const EventType = Object.freeze({freq: 1, wpm: 2, mode: 3, vfo: 4, filter: 5, preamp: 6, attn: 7, keyDit: 8, keyDah: 9});

// class ChangeEventTarget {
//   constructor() {
//     this.listeners = {};
//   }

//   addEventListener(type, callback) {
//     if (!(type in this.listeners)) {
//       this.listeners[type] = [];
//     }
//     this.listeners.push(callback);
//   }

//   removeEventListener(type, callback) {
//     if (!(type in this.listeners)) {
//       return;
//     }
//     let stack = this.listeners[type];
//     for (let i = 0, l = stack.length; i < l; i++) {
//       if (stack[i] === callback) {
//         stack.splice(i, 1);
//         return;
//       }
//     }
//   }

//   dispatchEvent(event) {
//     if (!(event.type in this.listeners)) {
//       return true;
//     }
//     let stack = this.listeners[event.type];
//     stack.forEach(callback => callback.call(this, event));
//     return !event.defaultPrevented;
//   }
// }

class ConnectorRegister {
  constructor() {
    this._reg = {};
  }

  register(connector) {
    this._reg[connector.constructor.id] = connector;
  }

//   get(index) {
//     return this._reg[index];
//   }

  get(id) {
    return this._reg[id];
  }

  get all() {
    return Object.values(this._reg);
  }
}

var tcvrConnectors = new ConnectorRegister();

    // this._freq = {
    //   "1.8": 
    //     {"CW": {"A": 1820000, "B": 1820000}, "CWR": {"A": 1820000, "B": 1820000}, 
    //      "LSB": {"A": 1880000, "B": 1880000}, "USB": {"A": 1880000, "B": 1880000}},
    //   "3.5":
    //     {"CW": {"A": 3520000, "B": 3520000}, "CWR": {"A": 3520000, "B": 3520000}, 
    //      "LSB": {"A": 3750000, "B": 3750000}, "USB": {"A": 3750000, "B": 3750000}},
    //   "7":
    //     {"CW": {"A": 7020000, "B": 7020000}, "CWR": {"A": 7020000, "B": 7020000}, 
    //      "LSB": {"A": 7080000, "B": 7080000}, "USB": {"A": 7080000, "B": 7080000}},
    //   "10.1":
    //     {"CW": {"A": 10120000, "B": 10120000}, "CWR": {"A": 10120000, "B": 10120000}, 
    //      "LSB": {"A": 10120000, "B": 10120000}, "USB": {"A": 10120000, "B": 10120000}},
    //   "14":
    //     {"CW": {"A": 14020000, "B": 14020000}, "CWR": {"A": 14020000, "B": 14020000}, 
    //      "LSB": {"A": 14100000, "B": 14100000}, "USB": {"A": 14100000, "B": 14100000}},
    //   "18":
    //     {"CW": {"A": 18080000, "B": 18080000}, "CWR": {"A": 18080000, "B": 18080000}, 
    //      "LSB": {"A": 18100000, "B": 18100000}, "USB": {"A": 18100000, "B": 18100000}},
    //   "21":
    //     {"CW": {"A": 21020000, "B": 21020000}, "CWR": {"A": 21020000, "B": 21020000}, 
    //      "LSB": {"A": 21100000, "B": 21100000}, "USB": {"A": 21100000, "B": 21100000}},
    //   "24":
    //     {"CW": {"A": 24920000, "B": 24920000}, "CWR": {"A": 24920000, "B": 24920000}, 
    //      "LSB": {"A": 24920000, "B": 24920000}, "USB": {"A": 24920000, "B": 24920000}},
    //   "28":
    //     {"CW": {"A": 28020000, "B": 28020000}, "CWR": {"A": 28020000, "B": 28020000}, 
    //      "LSB": {"A": 28100000, "B": 28100000}, "USB": {"A": 28100000, "B": 28100000}}
    // };
