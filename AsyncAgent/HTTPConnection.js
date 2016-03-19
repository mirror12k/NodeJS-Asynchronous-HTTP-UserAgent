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
	self.buffer = new Buffer(0);

	self.host = host;
	self.port = port || 80;

	self.on('header', function (res) {
		self.currentRequest.emitter.emit('header', res);

		if (res.getHeader('content-length') === undefined || self.currentRequest.request.method === 'HEAD') {
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
 */
HTTPConnection.prototype.request = function(req, options) {
	options = options || {};
	var emitter = new events.EventEmitter();
	var context = { request : req, emitter : emitter, chunked: options.chunked, read: 0 };

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
	var index = this.buffer.indexOf("\r\n\r\n");
	if (index !== -1) {
		var header = this.buffer.slice(0, index).toString('ascii');
		this.buffer = this.buffer.slice(index + 4);
		this.emit('header', new HTTPResponse().parse(header + "\r\n\r\n"));
	}
};

// checks if the buffer has the complete body ready
HTTPConnection.prototype.checkBodyReady = function() {
	var length = this.currentResponse.getHeader('content-length');

	if (this.currentRequest.chunked) { // if the request is chunked
		if (this.buffer.length + this.currentRequest.read >= length) {
			var cutlength = length - this.currentRequest.read;
			if (cutlength > 0)
				this.currentRequest.emitter.emit('data', this.buffer.slice(0, cutlength));
			this.buffer = this.buffer.slice(cutlength);

			this.emit('response', this.currentResponse);
		} else {
			if (this.buffer.length > 0) {
				this.currentRequest.emitter.emit('data', this.buffer);
				this.currentRequest.read += this.buffer.length;
				this.buffer = new Buffer(0);
			}
		}
	} else { // if the request is not chunked
		if (this.buffer.length >= length) {
			var body = this.buffer.slice(0, length);
			this.buffer = this.buffer.slice(length);
			var res = this.currentResponse;
			res.body = body;
			this.emit('response', res);
		}
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
	this.buffer = Buffer.concat([this.buffer, data]);

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
