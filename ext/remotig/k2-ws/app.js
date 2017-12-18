//var lame = require('lame');
var mic = require('mic')
var fs = require('fs')

let port = 8090

var audio = undefined;
// var audioStream = undefined;

// set up an express app
var express = require('express')
var app = express()

app.use('/smartceiver', express.static('public'))

app.get('/stream.wav', function (req, res) {
  res.set({
    'Content-Type': 'audio/wav',
    'Transfer-Encoding': 'chunked'
  })
  if (audio) { // stop previously started audio
    stopAudio(() => {
      setTimeout(() => {
        startAudio(stream => {
          // console.log('started2');
          stream.pipe(res);
        })
      }, 3000)
    })
  } else { // cold start
    startAudio(stream => {
      // console.log('started1');
      audio.getAudioStream().pipe(res)
    })
  }
  //    encoder.pipe(res);
})

var server = app.listen(port, () => console.log('Listening on port ' + port))

function startAudio(cb) {
  console.log('start audio');
  audio = mic({
    device: 'plughw:0,0',
    rate: '8000',
    channels: '1',
    fileType: 'wav',
    debug: true,
    // exitOnSilence: 6
  });

  // audioStream = audio.getAudioStream();
  audio.getAudioStream().on('startComplete', () => {
    // console.log('startComplete');
    cb(audio.getAudioStream());
  });

  audio.start();
}

function stopAudio(cb) {
  console.log('stop audio');
  audio.getAudioStream().on('stopComplete', () => {
    // audioStream = undefined;
    audio = undefined;
    cb();
  });

  audio.stop();
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

