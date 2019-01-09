
const secondsNow = () => Date.now() / 1000

function log(str) {
	console.log(new Date().toISOString() + ' ' + str)
}

function whoIn(token) {
	if (!token) return null
	const delPos = token.indexOf('-')
	return delPos > 3 ? token.substring(0, delPos).toUpperCase() : null
}

function error(res, err, status = 400) {
	res.locals.result = err
	res.status(status).send(err)
	return false
}

function delay(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

export {secondsNow, log, whoIn, delay, error}
