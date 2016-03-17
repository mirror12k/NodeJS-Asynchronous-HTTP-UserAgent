/**
 * generic HTTP exception class for AsyncAgent
 */



function HTTPError (message) {
	Error.call(this, message);
}
HTTPError.prototype = Object.create(Error.prototype);



module.exports = HTTPError;
