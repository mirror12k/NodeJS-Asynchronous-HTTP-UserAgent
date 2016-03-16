/*
 * AsyncAgent.HTTPResponse
 * represents a basic HTTP request and provides some utility methods
*/

var URL = require('./URL');
var HTTPMessage = require('./HTTPMessage');

function HTTPResponse (code, message, protocol, headers, body) {
	HTTPMessage.call(this, protocol, headers, body);

	if (code !== undefined)
		this.code = code;
	else
		this.code = '';

	if (message !== undefined)
		this.message = message;
	else
		this.message = '';
}

HTTPResponse.prototype = Object.create(HTTPMessage.prototype);

HTTPResponse.prototype.parse = function(text) {
	var status = text.split("\r\n", 1)[0];
	text = text.substring(text.indexOf("\r\n"));

	var statusparts = status.split(" ", 2);
	this.protocol = statusparts[0];
	this.code = statusparts[1];
	this.message = status.substring(this.protocol.length + this.code.length + 2);

	headers = text.split("\r\n\r\n", 1)[0];
	this.parseHeaders(headers);
	text = text.substring(headers.length + 4);

	this.body = text;

	return this;
};

HTTPResponse.prototype.clone = function() {
	var clone = HTTPMessage.prototype.clone.call(this);
	clone.code = this.code;
	clone.message = this.message;
	return clone;
};

HTTPResponse.prototype.stringStatus = function() {
	return this.protocol + " " + this.code + " " + this.message;
};


module.exports = HTTPResponse;
