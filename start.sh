# console on UART
echo "stop console on UART"
systemctl stop serial-getty@ttyAMA0.service


# node
cd /root/remotig
echo "node remotig.js"

log="remotig-`date \"+%Y%m%d\"`.log"
rm remotig.log >/dev/null
ln -s ${log} remotig.log

nice --20 /root/node/bin/node remotig.js >>${log} 2>&1 &
