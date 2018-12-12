// Format selection
const audioStreamMime = 'audio/mpeg'
const audioStreamPort = 9601

class LllasPlayer {

	constructor() {
		// Module objects
		this.player_
		this.reader_
		this.ws_

		this._init()
	}

	// Initialize modules
	_init() {
		console.info("Using MIME: " + audioStreamMime + " on port: " + audioStreamPort);

		try {
			this.player_ = new PCMAudioPlayer()
			this.player_.UnderrunCallback = () => console.warn('Player error: Buffer underrun.')
			console.info("Init of PCMAudioPlayer succeeded")
		} catch (e) {
			console.error("Init of PCMAudioPlayer failed: " + e)
			return
		}

		try {
			this.reader_ = CreateAudioFormatReader(audioStreamMime,
				() => console.error('Reader error: Decoding failed.'),
				(data) => {
					while (this.reader_.SamplesAvailable()) {
						this.player_.PushBuffer(this.reader_.PopSamples())
					}
				})
			console.info("Init of AudioFormatReader succeeded")
		}
		catch (e) {
			console.error("Init of AudioFormatReader failed: " + e)
		}
	}

	play(url) {
		this.player_.MobileUnmute()
		try {
			this.ws_ = new WebSocketClient(url,
				(error) => console.error("Network error: " + error),
				() => console.info('Established connection with server.'),
				(data) => this.reader_.PushData(data),
				() => console.info('Lost connection to server.'))
			console.info("Init of WebSocketClient succeeded")
			console.info("Trying to connect to server.")
		} catch (e) {
			console.error("Init of WebSocketClient failed: " + e)
			return
		}
	}

	stop() {
		this.ws_ && this.ws_.close()
	}

	setFilter(centerFreq, bandWidth) {}
}

// function OnSocketConnect() {
// 	PlayerControls.SetPlaystate(true);
// 	StartFocusChecker();
// 	console.info("Established connection with server.");
// }

// function OnSocketDisconnect() {
// 	PlayerControls.SetPlaystate(false);
// 	StopFocusChecker();
// 	while (PlayerControls.ToogleActivityLight());
// 	console.info("Lost connection to server.");
// }

// let PacketModCounter = 0;
// function OnSocketDataReady(data) {
// 	PacketModCounter++;

// 	if (PacketModCounter > 100) {
// 		PlayerControls.ToogleActivityLight();
// 		PacketModCounter = 0;
// 	}

// 	reader_.PushData(data);
// }

// Bind init to page load
// window.addEventListener('load', audioPlayerInit, false)
// document.ontouchmove = function (e) {
// 	e.preventDefault();
// }

