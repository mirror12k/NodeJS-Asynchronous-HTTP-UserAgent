


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
	this.connectionsCache = {};

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
	if (req.getHeader('connection') === undefined)
		req.setHeader('connection', 'Keep-Alive');

	this.getConnection(req.path.protocol, req.path.host, req.path.port).request(req, cb);
};

AsyncAgent.prototype.get = function (url, callback, headers, body) {
	return this.request(new AsyncAgent.HTTPRequest('GET', url, 'HTTP/1.1', headers, body), callback);
};

AsyncAgent.prototype.post = function (url, callback, headers, body) {
	return this.request(new AsyncAgent.HTTPRequest('POST', url, 'HTTP/1.1', headers, body), callback);
};


AsyncAgent.prototype.getConnection = function(protocol, host, port) {
	var connection;
	if (this.connectionsCache[protocol+'//'+host+':'+port] !== undefined) {
		connection = this.connectionsCache[protocol+'//'+host+':'+port];
	} else {
		connection = new this.connectors[protocol](host, port);
		this.connectionsCache[protocol+'//'+host+':'+port] = connection;
	}
	return connection;
};

module.exports = AsyncAgent;
