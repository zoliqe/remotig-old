let port = 8090
let serialPath = '/dev/ttyUSB0'
let SerialPort = require('serialport')
let serial = new SerialPort(serialPath, {baudRate: 115200})
serial.on('open', () => console.log('SerialPort opened:', serialPath))
serial.on('error', err => {
  if (err) {
    console.log('SerialPort error:', err.message)
  }
})
serial.on('data', data => console.log('SerialPort:', data))

//var lame = require('lame');
let mic = require('mic')
let fs = require('fs')

let audio = undefined
// set up an express app
let express = require('express')
let app = express()
let expressWs = require('express-ws')(app)

app.use('/smartceiver', express.static('public'))

// startAudio(stream => app.get('/stream.wav', (req, res) => {
//   res.set({
//     'Content-Type': 'audio/wav',
//     'Transfer-Encoding': 'chunked'
//   })
//   stream.read() // flush
//   stream.pipe(res)
// }))
app.get('/stream.wav', function (req, res) {
  res.set({
    'Content-Type': 'audio/wav',
    'Transfer-Encoding': 'chunked'
  })
  if (audio) { // stop previously started audio
    stopAudio()
    startAudio(stream => stream.pipe(res))
    // stopAudio(() => {
    //   setTimeout(() => {
    //     startAudio(stream => stream.pipe(res))
    //   }, 3000)
    // })
  } else { // cold start
    startAudio(stream => stream.pipe(res))
  }
  //    encoder.pipe(res);
})

app.ws('/ctl', function(ws, req) {
  ws.on('message', msg => {
    console.log(msg)
    serial.write(msg)
  })
})

let server = app.listen(port, () => console.log('Listening on port ' + port))

async function startAudio(cb) {
  console.log('start audio')
  await sleep(1000)
  audio = mic({
    device: 'plughw:0,0',
    rate: '8000',
    channels: '1',
    fileType: 'wav',
    debug: true,
    // exitOnSilence: 6
  })

  // audioStream = audio.getAudioStream();
  audio.getAudioStream().on('startComplete', () => {
    // console.log('startComplete');
    cb(audio.getAudioStream())
  })

  audio.start()
}

function stopAudio(cb) {
  console.log('stop audio');
  audio.stop()
  // audio.getAudioStream().on('stopComplete', () => {
    // audioStream = undefined;
    audio = undefined
    // cb()
  // })
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

//input.pipe(encoder);

// create the Encoder instance
/*var encoder = new lame.Encoder({
// input
channels: 2,        // 2 channels (left and right)
bitDepth: 16,       // 16-bit samples
sampleRate: 44100,  // 44,100 Hz sample rate

// output
bitRate: options.bitrate,
outSampleRate: options.samplerate,
mode: (options.mono ? lame.MONO : lame.STEREO) // STEREO (default), JOINTSTEREO, DUALCHANNEL or MONO
});*/


/*var outputFileStream = fs.WriteStream('output.raw');

audioStream.pipe(outputFileStream);

audioStream.on('data', function(data) {
    console.log("Recieved Input Stream: " + data.length);
});

audioStream.on('error', function(err) {
    console.log("Error in Input Stream: " + err);
});

audioStream.on('startComplete', function() {
    console.log("Got SIGNAL startComplete");
    setTimeout(function() {
            audio.pause();
    }, 5000);
});
    
audioStream.on('stopComplete', function() {
    console.log("Got SIGNAL stopComplete");
});
    
audioStream.on('pauseComplete', function() {
    console.log("Got SIGNAL pauseComplete");
    setTimeout(function() {
        audio.resume();
    }, 5000);
});

audioStream.on('resumeComplete', function() {
    console.log("Got SIGNAL resumeComplete");
    setTimeout(function() {
        audio.stop();
    }, 5000);
});

audioStream.on('silence', function() {
    console.log("Got SIGNAL silence");
});

audioStream.on('processExitComplete', function() {
    console.log("Got SIGNAL processExitComplete");
});*/

//  audio.start();

