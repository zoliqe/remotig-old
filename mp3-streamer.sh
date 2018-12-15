#!/bin/sh

# run streaming service in background - to access process console use "tmux attach-session"
tmux new-session -d -s remotig-audio "ffmpeg -y -f alsa -i plug:dsnoop -rtbufsize 64 -probesize 64 \
-acodec libmp3lame -ab 8k -out_sample_rate 8k -ac 1 -reservoir 0 -f mp3 \
-af 'lowpass=f=800, highpass=f=300, bandpass=f=600' \
-fflags +nobuffer - \
| node stdinstreamer.js -port 8073 -type mp3 -burstsize 1"

