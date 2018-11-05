# console on UART
echo "stop console on UART"
systemctl stop serial-getty@ttyAMA0.service


# node
cd /root/remotig
echo "node app.js"
log="remotig-`date \"+%Y%m%d\"`.log"
/root/node/bin/node app.js >>${log} 2>&1 &
