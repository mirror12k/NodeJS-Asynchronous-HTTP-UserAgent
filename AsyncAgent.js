/**
 * Asynchronous UserAgent
 * allows easy asyncronous requesting of http resources
 */


/* TODO:
 * request/response history
 * transparent compression
 * chunked transfer
 * to file loading
 * file parsing (title parsing, link listing, form listing, form submittion)
 */


/**
 * creates a new useragent
 * options is an optional object for
 * available options:
 * - cookies - optional object which enables cookies and will become the associated cookie storage for the object
 * - useragent - optional string which will be passed as the UserAgent header
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

/**
 * performs a specific HTTPRequest object
 * creates a connection to the associated authority and requests a response from it
 * returns the event emitter created by the connection associated with the protocol
 * the emitter should emit the 'response' event when a response has arrived
 * options is an optional object with options
 * available options:
 * - nocookies - if defined, disables setting and getting cookies for this request
 * - callback - optional callback which will be called when the request is completed
 */
AsyncAgent.prototype.request = function (request, options) {
	options = options || {};

	// prepare the request
	request = this.prepareRequest(request, options);

	// get the connection and request from it, and get the response emitter
	var res = this.getConnection(request.path.protocol, request.path.host, request.path.port).request(request);

	// set some hooks
	if (this.cookieStorage !== undefined && options.nocookies === undefined)
		res.once('response', this.setCookiesFromResponse.bind(this, request.path.protocol+'//'+request.path.host+':'+request.path.port));
	if (options.callback !== undefined)
		res.once('response', options.callback);

	return res;
};

/**
 * prepares the request by ensuring that the path is valid, setting any cookies that are necessary,
 * encoding a body form if present, and setting default headers such as Host, Content-Length, Connection, and User-Agent
 */
AsyncAgent.prototype.prepareRequest = function(request, options) {
	var authority = request.path.protocol+'//'+request.path.host+':'+request.path.port;

	// verify that the path is valid
	if (request.path.host === undefined)
		throw new Error("unable to request without a host in url '"+request.path+"'");
	if (request.path.protocol === undefined)
		throw new Error("unable to request without a protocol in url '"+request.path+"'");

	if (options.nocookies === undefined) {
		// set the cookies for this request
		var cookies = this.getCookies(authority);
		if (cookies !== undefined && Object.keys(cookies).length > 0) {
			cookies = Object.keys(cookies).map(function (key) {
				return key+"="+cookies[key]+";";
			}).join(" ");
			request.setHeader('cookie', cookies);
		}
	}

	// if the body is a form object, url encode and string it
	if ('string' !== typeof request.body) {
		request.body = Object.keys(request.body).map(function (key) {
			return AsyncAgent.URL.urlencode(key)+"="+AsyncAgent.URL.urlencode(request.body[key]);
		}).join("&");
		if (request.getHeader('content-type') === undefined)
			request.setHeader('content-type', 'application/x-www-form-urlencoded');
	}

	// set some default headers
	if (request.getHeader('host') === undefined)
		request.setHeader('host', request.path.host);
	if (request.getHeader('content-length') === undefined && request.body.length > 0)
		request.setHeader('content-length', request.body.length);
	if (request.getHeader('connection') === undefined)
		request.setHeader('connection', 'Keep-Alive');
	if (request.getHeader('user-agent') === undefined && this.useragent !== undefined)
		request.setHeader('user-agent', this.useragent);

	return request;
};

/**
 * shortcut to calling AsyncAgent.request with a 'GET' method, the given url path, and protocol of 'HTTP/1.1'
 * options is an optional object with options
 * options.headers will be passed to the request as the headers
 * options.body will be passed to the request as the body
 * all other options are passed to AsyncAgent.request
 */
AsyncAgent.prototype.get = function (url, options) {
	options = options || {};
	return this.request(new AsyncAgent.HTTPRequest('GET', url, 'HTTP/1.1', options.headers, options.body), options);
};

/**
 * same as AsyncAgent.get except with a method of 'POST'
 */
AsyncAgent.prototype.post = function (url, options) {
	options = options || {};
	return this.request(new AsyncAgent.HTTPRequest('POST', url, 'HTTP/1.1', options.headers, options.body), options);
};

/**
 * internal method for getting or creating a connection to a given authority
 * connections are cached per-authority until they omit the 'end' event
 */
AsyncAgent.prototype.getConnection = function(protocol, host, port) {
	var self = this;
	var authority = protocol+'//'+host+':'+port;
	var connection;
	if (this.connectionsCache[authority] !== undefined) {
		connection = this.connectionsCache[authority];
	} else {
		connection = new this.connectors[protocol](host, port);
		connection.once('end', function () {
			// console.log('removed connection from cache:', authority);
			self.connectionsCache[authority] = undefined;
		});
		this.connectionsCache[authority] = connection;
	}
	return connection;
};

/**
 * get a dictionary of cookies for a given authority
 */
AsyncAgent.prototype.getCookies = function(authority) {
	if (this.cookieStorage !== undefined)
		return this.cookieStorage[authority];
};

/**
 * sets the cookies in the given dictionary for a given authority
 */
AsyncAgent.prototype.setCookies = function(authority, cookies) {
	var self = this;
	if (self.cookieStorage !== undefined) {
		console.log("setting cookies: ", cookies);
		if (self.cookieStorage[authority] === undefined)
			self.cookieStorage[authority] = {};
		Object.keys(cookies).forEach(function (key) {
			self.cookieStorage[authority][key] = cookies[key];
		});
	}
};

/**
 * extracts any 'Set-Cookie' headers in the given response, parses them, and passes the cookies to setCookies
 */
AsyncAgent.prototype.setCookiesFromResponse = function(authority, res) {
	var cookieHeaders = res.getMultiHeader('set-cookie');
	if (cookieHeaders !== undefined) {
		for (var i = 0; i < cookieHeaders.length; i++) {
			var cookies = {};
			cookieHeaders[i].split(';').forEach(function (cookie) {
				var key = cookie.split('=', 1)[0];
				var val = cookie.substring(key.length + 1);
				cookies[key.trim()] = val.trim();
			});
			this.setCookies(authority, cookies);
		}
	}
};

module.exports = AsyncAgent;
