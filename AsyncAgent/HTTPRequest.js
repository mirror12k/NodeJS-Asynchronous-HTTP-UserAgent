/*
 * AsyncAgent.HTTPRequest
 * represents a basic HTTP request and provides some utility methods
*/

var URL = require('./URL');
var HTTPMessage = require('./HTTPMessage');

function HTTPRequest (method, path, protocol, headers, body) {
	HTTPMessage.call(this, protocol, headers, body);

	if (method !== undefined)
		this.method = method.toUpperCase();
	else
		this.method = '';

	if (path !== undefined) {
		if ('string' === typeof path) {
			this.path = new URL(path);
		} else {
			this.path = path;
		}
	}else {
		this.path = new URL('/');
	}
}

HTTPRequest.prototype = Object.create(HTTPMessage.prototype);

HTTPRequest.prototype.parse = function(text) {
	var status = text.split("\r\n", 1)[0];
	text = text.substring(text.indexOf("\r\n"));

	var statusparts = status.split(" ", 3);
	this.method = statusparts[0];
	this.path = new URL(statusparts[1]);
	this.protocol = statusparts[2];

	headers = text.split("\r\n\r\n", 1)[0];
	this.parseHeaders(headers);
	text = text.substring(headers.length + 4);

	this.body = text;

	return this;
};

HTTPRequest.prototype.stringStatus = function() {
	return this.method + " " + this.path.stringPath() + " " + this.protocol;
};


module.exports = HTTPRequest;
