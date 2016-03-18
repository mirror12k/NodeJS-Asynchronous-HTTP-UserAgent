/**
 * AsyncAgent.CookieJar class contains methods for storing and retrieving cookies for http communication
 */


function CookieJar (cookies) {
	this.cookies = cookies || {};
}

/**
 * get a dictionary of cookies for a given authority
 */
CookieJar.prototype.getCookies = function(authority) {
	if (this.cookies !== undefined)
		return this.cookies[authority];
};

/**
 * sets the cookies in the given dictionary for a given authority
 */
CookieJar.prototype.setCookies = function(authority, cookies) {
	var self = this;
	if (self.cookies !== undefined) {
		// console.log("setting cookies: ", cookies);
		if (self.cookies[authority] === undefined)
			self.cookies[authority] = {};
		Object.keys(cookies).forEach(function (key) {
			self.cookies[authority][key] = cookies[key];
		});
	}
};

module.exports = CookieJar;
