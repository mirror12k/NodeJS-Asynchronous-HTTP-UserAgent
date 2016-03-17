/**
 * a Connection class for connecting to servers via the HTTP protocol
 */


var events = require('events');
var net = require('net');

var HTTPResponse = require('./HTTPResponse');

/**
 * creates a new un-connected HTTPConnection
 */
function HTTPConnection () {
	var self = this;
	self.requestPipe = [];
	self.isConnected = false;

	self.currentResponse = undefined;
	self.buffer = '';

	self.on('header', function (res) {
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
HTTPConnection.prototype.request = function(req, cb) {
	console.log("new request to url: " + req.path);
	this.requestPipe.push({ request : req, callback : cb });
	if (this.isConnected === false)
		this.connect(req.path.host, req.path.port || 80);
};

/**
 * connects the HTTPConnection to the given host and port address
 * sends a piped request if one is ready as soon as it is connected
 * this method is called automatically if a request is queued and the socket is not connected
 */
HTTPConnection.prototype.connect = function(host, port) {
	var self = this;

	console.log('connecting to ', host, port);
	self.sock = net.createConnection({host : host, port : port}, function () {
		self.performNextRequest();
	});
	self.isConnected = true;

	self.sock.on('data', function (data) {
		// console.log("got data: ", data);
		self.buffer += data.toString('ascii');
		// console.log("buffer: ", self.buffer);

		if (self.currentResponse === undefined) {
			self.checkHeaderReady();
		} else {
			self.checkBodyReady();
		}
	});
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

// attempts to dequeue the next request and sends it through to socket
HTTPConnection.prototype.performNextRequest = function() {
	var self = this;
	var req = self.requestPipe.shift();
	if (req !== undefined) {
		self.sock.ref(); // mark the socket as important
		self.sock.write(req.request.toString());
		self.once('response', function (res) {
			if (req.callback !== undefined)
				req.callback(res);
			self.performNextRequest();
		});
	} else {
		self.sock.unref(); // mark the socket as unused
	}
};

module.exports = HTTPConnection;
