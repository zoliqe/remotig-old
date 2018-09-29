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
cd /root/powron-rest
echo "node app.js"
log="powron-`date \"+%Y%m%d\"`.log"
node app.js >>${log} 2>&1 &
