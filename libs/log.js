var scribe = require('scribe-js')(); //loads Scribe

var console = process.console;

var errorMsg = function (tag, msg) {
	console.tag(tag).time().file().error(msg);
}
var infoMsg = function (tag, msg) {
	console.tag(tag).time().file().info(msg);
}
var warningMsg = function (tag, msg) {
	console.tag(tag).time().file().warning(msg);
}

module.exports = {
	scribe : scribe,
	errorMsg : errorMsg,
	infoMsg : infoMsg,
	warningMsg : warningMsg
};