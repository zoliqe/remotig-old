#!/bin/sh

ffmpeg -y -f alsa -i plug:dsnoop -rtbufsize 64 -probesize 64 \
-acodec libmp3lame -ab 16k -ac 1 -reservoir 0 -f mp3 \
-fflags +nobuffer - \
| node stdinstreamer.js -port 9601 -type mp3 -burstsize 1
