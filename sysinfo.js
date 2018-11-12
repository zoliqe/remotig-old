const port = 8089
const nameById = {'28-02150300c6ff': 'exterier', '28-03150405abff': 'interier', '28-031730bb43ff': 'rack'}

log('===================================================')
log('================ Starting sysinfo =================')
log('Loading modules...')
const express = require('express')
const temps = require('ds18b20-raspi')
const sysinfo = require('systeminformation')

log('Starting express app')
const app = express()

log('Registering REST services')
register('/temps', (req, res) => {
	let sensors = temps.readAllC()
	sensors.forEach(sensor => sensor['name'] = nameById[sensor['id']])
	res.send(sensors)
})
register('/sysinfo', getSysinfo)
app.use('/', express.static('sysinfo'))

const server = app.listen(port, () => log(`Listening on ${port}`))

function log(str) {
	console.log(new Date().toISOString() + ' ' + str)
}

function register(url, callback) {
	log(`URL: ${url}`)
	app.get(url, callback)
}

async function getSysinfo(req, res) {
	let si = {}
	try {
		const time = await sysinfo.time()
		si['time'] = {'current': time.current, 'uptime': time.uptime}
		const speed = await sysinfo.cpuCurrentspeed()
		const temp = await sysinfo.cpuTemperature()
		const load = await sysinfo.currentLoad()
		si['cpu'] = {'speed': speed.avg, 'load': load.currentload, 'temp': temp.main}
		const mem = await sysinfo.mem()
		si['mem'] = {'avail': mem.available, 'used': mem.used}
		const net  = await sysinfo.networkStats('eth0')
		si['net'] = {'rx': net.rx, 'tx': net.tx, 'rx_sec': net.rx_sec, 'tx_sec': net.tx_sec}
	} catch (e) {
		si['error'] = e
		log(`sysinfo() error: ${e}`)
	}
	res.send(si)
}
