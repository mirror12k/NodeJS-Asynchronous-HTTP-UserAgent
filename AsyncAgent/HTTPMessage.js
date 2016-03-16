/*
 * AsyncAgent.HTTPMessage
 * represents a basic HTTP message with functionality for parsing, stringing, accessing, and setting headers
*/



/*
 * creates a new HTTPMessage object
*/
function HTTPMessage (protocol, headers, body) {
	if (protocol !== undefined)
		this.protocol = protocol;
	else
		this.protocol = '';

	if (headers !== undefined)
		this.headers = headers;
	else
		this.headers = {};

	if (body !== undefined)
		this.body = body;
	else
		this.body = '';
}

/*
 * parse a given string containing headers
*/
HTTPMessage.prototype.parseHeaders = function(headers) {
	var parsed = {};
	headers.split("\n").filter(function (s) { return s.trim() !== ''; }).forEach(function (s) {
		var header = s.split(':', 2);
		var key = header[0].trim().toLowerCase(), val = header[1];
		if (val === undefined)
			val = '';
		else
			val = val.trim();
		if (parsed[key] === undefined) {
			parsed[key] = [val];
		} else {
			parsed[key].push(val);
		}
	});
	this.headers = parsed;
};


/*
 * get a single (typically the first) header value for a given key
 * returns undefined if no such header exists
*/
HTTPMessage.prototype.getHeader = function(header) {
	var headers = this.headers[header.toLowerCase()];
	if (headers !== undefined) {
		return headers[0];
	} else {
		return undefined;
	}
};
/*
 * get an array of values for a given header key
 * returns undefined if the header doesn't exist
*/
HTTPMessage.prototype.getMultiHeader = function(header) {
	return this.headers[header.toLowerCase()];
};


/*
 * set the value of a header key, replacing any and all previous values
*/
HTTPMessage.prototype.setHeader = function(header, val) {
	this.headers[header.toLowerCase()] = [val];
};

/*
 * set the array of values for a given header key
*/
HTTPMessage.prototype.setMultiHeader = function(header, val) {
	this.headers[header.toLowerCase()] = val;
};

/*
 * creates a copy of this message object
*/
HTTPMessage.prototype.clone = function() {
	return new HTTPMessage(this.protocol, this.headers, this.body);
};

/*
 * convert all headers to a proper header string
*/
HTTPMessage.prototype.stringHeaders = function() {
	var self = this;
	return Object.keys(self.headers).map(function (key) {
		return self.headers[key].map(function (val) { return key + ': ' + val; }).join("\r\n") + "\r\n";
	}).join('');
};

/*
 * abstract method for creating a stringified message status
*/
HTTPMessage.prototype.stringStatus = function () { throw "unimplemented"; };


/*
 * convert this message to a proper http message string
*/
HTTPMessage.prototype.toString = function() {
	return this.stringStatus() + "\r\n" + this.stringHeaders() + "\r\n" + this.body;
};



module.exports = HTTPMessage;
