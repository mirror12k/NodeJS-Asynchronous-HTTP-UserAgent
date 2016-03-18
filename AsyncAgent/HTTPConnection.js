/**
 * a Connection class for connecting to servers via the HTTP protocol
 */


var events = require('events');
var net = require('net');

var HTTPResponse = require('./HTTPResponse');

/**
 * creates a new un-connected HTTPConnection
 */
function HTTPConnection (host, port) {
	var self = this;
	self.requestPipe = [];
	self.isConnected = false;

	self.currentResponse = undefined;
	self.currentRequest = undefined;
	self.buffer = '';

	self.host = host;
	self.port = port || 80;

	self.on('header', function (res) {
		self.currentRequest.emitter.emit('header', res);

		if (res.getHeader('content-length') === undefined) {
			self.emit('response', res);
		} else {
			self.currentResponse = res;
			self.checkBodyReady();
		}
	});
}

HTTPConnection.prototype = Object.create(events.EventEmitter.prototype);


/**
 * queues an http request to sent to the webserver
 * the optional callback is called with the http response when it is complete
 */
HTTPConnection.prototype.request = function(req) {
	var emitter = new events.EventEmitter();
	var context = { request : req, emitter : emitter };

	this.requestPipe.push(context);
	if (this.isConnected === false)
		this.connect();
	else if (this.currentRequest === undefined && this.requestPipe.length === 1)
		this.performNextRequest();

	this.emit('request', context);

	return emitter;
};

/**
 * connects the HTTPConnection to the given host and port address
 * sends a piped request if one is ready as soon as it is connected
 * this method is called automatically if a request is queued and the socket is not connected
 */
HTTPConnection.prototype.connect = function() {
	var self = this;

	// console.log('connecting to ', self.host, self.port);
	self.sock = net.createConnection({ host : self.host, port : self.port }, function () {
		self.performNextRequest();
	});
	self.isConnected = true;

	self.sock.pipe(this);
};

// checks if the buffer has a complete header ready
HTTPConnection.prototype.checkHeaderReady = function() {
	if (this.buffer.indexOf("\r\n\r\n") !== -1) {
		var header = this.buffer.split("\r\n\r\n", 1)[0];
		this.buffer = this.buffer.substring(header.length + 4);
		this.emit('header', new HTTPResponse().parse(header + "\r\n\r\n"));
	}
};

// checks if the buffer has the complete body ready
HTTPConnection.prototype.checkBodyReady = function() {
	if (this.buffer.length >= this.currentResponse.getHeader('content-length')) {
		var body = this.buffer.substring(0, this.currentResponse.getHeader('content-length'));
		this.buffer = this.buffer.substring(this.currentResponse.getHeader('content-length'));
		var res = this.currentResponse;
		this.currentResponse = undefined;
		res.body = body;
		this.emit('response', res);
	}
};

HTTPConnection.prototype.markNeeded = function() {
	this.sock.ref(); // mark the socket as important
};

HTTPConnection.prototype.markUnneeded = function() {
	this.sock.unref(); // mark the socket as unneeded
};

// attempts to dequeue the next request and sends it through to socket
HTTPConnection.prototype.performNextRequest = function() {
	var self = this;

	if (self.currentRequest !== undefined)
		throw new Error("HTTPConnection.performNextRequest called before previous request has completed");

	if (this.isConnected === false)
		this.connect();

	var req = self.requestPipe.shift();
	if (req !== undefined) {
		self.markNeeded();
		self.sock.write(req.request.toString());

		self.currentRequest = req;
		self.once('response', function (res) {
			res.request = req.request; // set the response's associated request

			req.emitter.emit('response', res);

			self.currentResponse = undefined;
			self.currentRequest = undefined;
			self.performNextRequest();
		});
	} else {
		self.markUnneeded();
	}
};

// implemented in order to be pipable
HTTPConnection.prototype.write = function(data) {
	this.buffer += data.toString('ascii');

	if (this.currentResponse === undefined) {
		this.checkHeaderReady();
	} else {
		this.checkBodyReady();
	}
};

// implemented in order to be pipable
HTTPConnection.prototype.end = function() {
	// console.log("connection closed");
	this.isConnected = false;
	if (this.currentRequest !== undefined) {
		this.emit('response', new HTTPResponse('500', 'Socket Disconnected', 'HTTP/1.1'));
	} else {
		this.emit('end');
	}
};

module.exports = HTTPConnection;
