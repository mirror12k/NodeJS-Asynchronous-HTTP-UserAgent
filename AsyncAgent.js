


/* TODO:
 * basic requesting
 * request/response history
 * connection caching
*/


function AsyncAgent () {
	this.history = [];
}

AsyncAgent.URL = require('./AsyncAgent/URL');
AsyncAgent.HTTPMessage = require('./AsyncAgent/HTTPMessage');
AsyncAgent.HTTPRequest = require('./AsyncAgent/HTTPRequest');
AsyncAgent.HTTPResponse = require('./AsyncAgent/HTTPResponse');

AsyncAgent.prototype.request = function (url, method, headers, body, callback) {

};

AsyncAgent.prototype.get = function (url) {

};

AsyncAgent.prototype.post = function (url) {

};


module.exports = AsyncAgent;
