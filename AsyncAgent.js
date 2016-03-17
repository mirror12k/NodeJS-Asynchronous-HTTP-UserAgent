


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

AsyncAgent.prototype.request = function (request, options) {
	options = options || {};

	// verify that the path is valid
	if (request.path.host === undefined)
		throw new Error("unable to request without a host in url '"+request.path+"'");
	if (request.path.protocol === undefined)
		throw new Error("unable to request without a protocol in url '"+request.path+"'");

	// set some default headers
	if (request.getHeader('host') === undefined)
		request.setHeader('host', request.path.host);
	if (request.getHeader('content-length') === undefined && request.body.length > 0)
		request.setHeader('content-length', request.body.length);
	if (request.getHeader('connection') === undefined)
		request.setHeader('connection', 'Keep-Alive');

	// get the connection and request from it, and return the created response emitter
	return this.getConnection(request.path.protocol, request.path.host, request.path.port).request(request);
};

AsyncAgent.prototype.get = function (url, options) {
	options = options || {};
	return this.request(new AsyncAgent.HTTPRequest('GET', url, 'HTTP/1.1', options.headers, options.body), options);
};

AsyncAgent.prototype.post = function (url, options) {
	options = options || {};
	return this.request(new AsyncAgent.HTTPRequest('POST', url, 'HTTP/1.1', options.headers, options.body), options);
};


AsyncAgent.prototype.getConnection = function(protocol, host, port) {
	var self = this;
	var connection;
	if (this.connectionsCache[protocol+'//'+host+':'+port] !== undefined) {
		connection = this.connectionsCache[protocol+'//'+host+':'+port];
	} else {
		connection = new this.connectors[protocol](host, port);
		connection.once('end', function () {
			console.log('removed connection from cache:', protocol+'//'+host+':'+port);
			self.connectionsCache[protocol+'//'+host+':'+port] = undefined;
		});
		this.connectionsCache[protocol+'//'+host+':'+port] = connection;
	}
	return connection;
};

module.exports = AsyncAgent;
