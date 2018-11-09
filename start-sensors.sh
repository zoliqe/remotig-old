# ds18b20
echo "ds18b20 overaly+modules"
dtoverlay w1-gpio gpiopin=4 pullup=0
modprobe w1-gpio
modprobe w1-therm
#/root/node_modules/ds18b20-raspi/cli.js -a

# node
cd /root/remotig
echo "node sensors.js"
log="sensors-`date \"+%Y%m%d\"`.log"
nice -19 /root/node/bin/node sensors.js >>${log} 2>&1 &
