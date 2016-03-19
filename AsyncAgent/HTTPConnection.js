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
	self.currentRead = 0;
	self.buffer = new Buffer(0);

	self.host = host;
	self.port = port || 80;

	self.on('data', this.onData.bind(this));
	self.on('header', this.onHeader.bind(this));
	self.on('response', this.onResponse.bind(this));
}

HTTPConnection.prototype = Object.create(events.EventEmitter.prototype);


HTTPConnection.prototype.onData = function(data) {
	var length = this.currentResponse.getHeader('content-length');

	if (this.currentRequest.chunked) { // if the request is chunked
		this.currentRequest.emitter.emit('data', data);
		this.currentRequest.read += data.length;
		if (this.currentRequest.read >= length)
			this.emit('response', this.currentResponse);
	} else { // if the request is not chunked
		this.currentResponse.body = Buffer.concat([this.currentResponse.body, data]);
		if (this.currentResponse.body.length >= length)
			this.emit('response', this.currentResponse);
	}
};

HTTPConnection.prototype.onHeader = function (res) {
	this.currentRequest.emitter.emit('header', res);

	if ((res.getHeader('content-length') === undefined && res.getHeader('transfer-encoding') !== 'chunked') || this.currentRequest.request.method === 'HEAD') {
		this.emit('response', res);
	} else {
		this.currentResponse = res;
		this.currentResponse.body = new Buffer(0);
		this.checkBodyReady();
	}
};

HTTPConnection.prototype.onResponse = function (res) {
	this.currentRequest.emitter.emit('response', res);

	this.currentRequest = undefined;
	this.currentResponse = undefined;
	this.currentRead = 0;
	this.performNextRequest();
};

/**
 * queues an http request to sent to the webserver
 */
HTTPConnection.prototype.request = function(req, options) {
	options = options || {};
	var emitter = new events.EventEmitter();
	var context = { request : req, emitter : emitter, chunked: options.chunked, read: 0 };

	// console.log('debug request', req.method, req.path.toString());
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
	// console.log('debug connecting to ', self.host, self.port);
	this.sock = net.createConnection({ host : this.host, port : this.port }, this.performNextRequest.bind(this));
	this.isConnected = true;

	this.sock.pipe(this);
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
	if (this.currentResponse.getHeader('transfer-encoding') === 'chunked') {
	// 	if (this.currentRequest.transferChunkSize === undefined) {
	// 		var index = this.buffer.indexOf("\r\n");
	// 		if (index !== -1) {
	// 			this.currentRequest.transferChunkSize = parseInt(this.buffer.slice(0, index).toString('ascii'), 16);
	// 			this.buffer = this.buffer.slice(index+2);
	// 		}
	// 	} else if (this.buffer.length >= this.currentRequest.transferChunkSize + 2) {

	// 	}
		throw 'nope';
	} else {
		var length = this.currentResponse.getHeader('content-length');
		var data;
		if (this.buffer.length + this.currentRead >= length) { // if we have completed the request data
			var cutlength = length - this.currentRead;
			data = this.buffer.slice(0, cutlength);
			this.buffer = this.buffer.slice(cutlength);
			this.currentRead += cutlength;
		} else { // if we don't yet have the complete request
			data = this.buffer;
			this.currentRead += this.buffer.length;
			this.buffer = new Buffer(0);
		}
		this.emit('data', data);
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
	// console.log("debug connection closed");
	this.isConnected = false;
	if (this.currentRequest !== undefined) {
		this.emit('response', new HTTPResponse('500', 'Socket Disconnected', 'HTTP/1.1'));
	} else {
		this.emit('end');
	}
};

module.exports = HTTPConnection;
