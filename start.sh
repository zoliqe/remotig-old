# ds18b20
echo "ds18b20 overaly+modules"
dtoverlay w1-gpio gpiopin=4 pullup=0
modprobe w1-gpio
modprobe w1-therm
#/root/node_modules/ds18b20-raspi/cli.js -a

# console on UART
echo "stop console on UART"
systemctl stop serial-getty@ttyAMA0.service


# node
cd /root/remotig
echo "node app.js"
log="remotig-`date \"+%Y%m%d\"`.log"
/root/node/bin/node app.js >>${log} 2>&1 &
