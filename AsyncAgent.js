


/* TODO:
 * basic requesting
 * request/response history
 * connection caching
*/




function AsyncAgent (options) {
	options = options || {};

	this.connectors = {
		'http:': AsyncAgent.HTTPConnection,
		'https:': AsyncAgent.HTTPSConnection,
		// 'test_reflect:': AsyncAgent.TestReflectConnection,
	};
	this.connectionsCache = {};

	this.cookieStorage = options.cookies;
	this.useragent = options.useragent;
}

AsyncAgent.URL = require('./AsyncAgent/URL');
AsyncAgent.HTTPMessage = require('./AsyncAgent/HTTPMessage');
AsyncAgent.HTTPRequest = require('./AsyncAgent/HTTPRequest');
AsyncAgent.HTTPResponse = require('./AsyncAgent/HTTPResponse');
AsyncAgent.HTTPError = require('./AsyncAgent/HTTPError');
AsyncAgent.HTTPConnection = require('./AsyncAgent/HTTPConnection');
AsyncAgent.HTTPSConnection = require('./AsyncAgent/HTTPSConnection');
AsyncAgent.TestReflectConnection = require('./AsyncAgent/TestReflectConnection');

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
	if (request.getHeader('user-agent') === undefined && this.useragent !== undefined)
		request.setHeader('user-agent', this.useragent);

	if (options.nocookies === undefined) {
		var cookies = this.getCookies(request.path.protocol, request.path.host, request.path.port);
		if (cookies !== undefined && Object.keys(cookies).length > 0) {
			cookies = Object.keys(cookies).map(function (key) {
				return key+"="+cookies[key]+";";
			}).join(" ");
			request.setHeader('cookie', cookies);
		}
	}

	// get the connection and request from it, and get the response emitter
	var res = this.getConnection(request.path.protocol, request.path.host, request.path.port).request(request);
	res.once('response', this.setCookiesFromResponse.bind(this, request.path.protocol, request.path.host, request.path.port));
	return res;
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

AsyncAgent.prototype.getCookies = function(protocol, host, port) {
	if (this.cookieStorage === undefined)
		return undefined;
	else
		return this.cookieStorage[protocol+'//'+host+':'+port];
};

AsyncAgent.prototype.setCookies = function(protocol, host, port, cookies) {
	var self = this;
	var authority = protocol+'//'+host+':'+port;
	if (self.cookieStorage !== undefined) {
		console.log("setting cookies: ", cookies);
		if (self.cookieStorage[authority] === undefined)
			self.cookieStorage[authority] = {};
		Object.keys(cookies).forEach(function (key) {
			self.cookieStorage[authority][key] = cookies[key];
		});
	}
};

AsyncAgent.prototype.setCookiesFromResponse = function(protocol, host, port, res) {
	var cookieHeaders = res.getMultiHeader('set-cookie');
	if (cookieHeaders !== undefined) {
		for (var i = 0; i < cookieHeaders.length; i++) {
			var cookies = {};
			cookieHeaders[i].split(';').forEach(function (cookie) {
				var key = cookie.split('=', 1)[0];
				var val = cookie.substring(key.length + 1);
				cookies[key.trim()] = val.trim();
			});
			this.setCookies(protocol, host, port, cookies);
		}
	}
};

module.exports = AsyncAgent;
