


/* TODO:
 * basic requesting
 * request/response history
 * connection caching
*/




function AsyncAgent () {
	this.history = [];
	this.connectors = {
		'http:': AsyncAgent.HTTPConnection,
	};
}

AsyncAgent.URL = require('./AsyncAgent/URL');
AsyncAgent.HTTPMessage = require('./AsyncAgent/HTTPMessage');
AsyncAgent.HTTPRequest = require('./AsyncAgent/HTTPRequest');
AsyncAgent.HTTPResponse = require('./AsyncAgent/HTTPResponse');
AsyncAgent.HTTPError = require('./AsyncAgent/HTTPError');
AsyncAgent.HTTPConnection = require('./AsyncAgent/HTTPConnection');

AsyncAgent.prototype.request = function (req, cb) {
	if (req.path.host === undefined)
		throw new Error("unable to request without a host in url '"+req.path+"'");
	if (req.path.protocol === undefined)
		throw new Error("unable to request without a protocol in url '"+req.path+"'");

	if (req.getHeader('host') === undefined)
		req.setHeader('host', req.path.host);
	if (req.getHeader('content-length') === undefined && req.body.length > 0)
		req.setHeader('content-length', req.body.length);

	return new this.connectors[req.path.protocol]().request(req, cb);
};

AsyncAgent.prototype.get = function (url, callback, headers, body) {
	return this.request(new AsyncAgent.HTTPRequest('GET', url, 'HTTP/1.1', headers, body), callback);
};

AsyncAgent.prototype.post = function (url, callback, headers, body) {
	return this.request(new AsyncAgent.HTTPRequest('POST', url, 'HTTP/1.1', headers, body), callback);
};


module.exports = AsyncAgent;
