

var AsyncAgent = require('./AsyncAgent');



var testcount = 0;
function test (val, expected) {
	testcount++;
	if (val === expected) {
		console.log('test #' + testcount + ' = passed');
	} else {
		console.log('test #' + testcount + ' = failed, expected: "' + expected + '", got: "' + val + '"');
		throw "exception: test #" + testcount + " failed";
	}
}

test(new AsyncAgent.URL("ever", "//example.org/").base('http://').toString(), 'http://example.org/ever');
test(new AsyncAgent.URL("/asdf?q=qwerty").toString(), '/asdf?q=qwerty');
test(new AsyncAgent.URL("http://example.org:443/").toString(), 'http://example.org:443/');
test(new AsyncAgent.URL("//asdf.org/adsf").toString(), '//asdf.org/adsf');
test(new AsyncAgent.URL("../asdf").toString(), '../asdf');
test(new AsyncAgent.URL("../asdf", "/folder/subfolder/").toString(), '/folder/asdf');
test(new AsyncAgent.URL("../asdf", "/folder/subfolder/subfile").toString(), '/folder/asdf');
test(new AsyncAgent.URL("../asdf", "/folder/subfolder/subfile?a=b").toString(), '/folder/asdf?a=b');




test(new AsyncAgent.HTTPRequest('get', '/', "HTTP/1.1", { asdf : ['qwerty']}, "hahaha").toString(),
	"GET / HTTP/1.1\r\nasdf: qwerty\r\n\r\nhahaha");
test(new AsyncAgent.HTTPRequest('post', 'http://example.org/example', "HTTP/1.0", { asdf : ['qwerty', 'uiop'], var : ['val'] }).toString(), 
	"POST /example HTTP/1.0\r\nasdf: qwerty\r\nasdf: uiop\r\nvar: val\r\n\r\n");
test(new AsyncAgent.HTTPRequest().parse("GET /asdf?qwerty#frag HTTP/1.1\r\nheader: value\r\n\r\nasdf").toString(),
	"GET /asdf?qwerty#frag HTTP/1.1\r\nheader: value\r\n\r\nasdf");


test(new AsyncAgent.HTTPResponse('200', 'OK', "HTTP/1.1", { asdf : ['qwerty']}, "hahaha").toString(),
	"HTTP/1.1 200 OK\r\nasdf: qwerty\r\n\r\nhahaha");

test(new AsyncAgent.HTTPResponse().parse("HTTP/1.1 404 Not Found Ya\r\nasdf: qwerty\r\ntest: fun\r\n\r\nhahaha").toString(),
	"HTTP/1.1 404 Not Found Ya\r\nasdf: qwerty\r\ntest: fun\r\n\r\nhahaha");

var obj = new AsyncAgent.HTTPResponse().parse("HTTP/1.1 404 Not Found Ya\r\n\r\n");
obj.clone().code = '301';
test(obj.code, '404');


var ua = new AsyncAgent();
ua.get('http://example.org/').once('response', function (res) {
	console.log("got response: "+res);
});
ua.get('https://example.org/').once('response', function (res) {
	console.log("got response: "+res);
});

setTimeout(function() {
	console.log("requested");
	ua.get('https://example.org/').once('response', function (res) {
		console.log("got response: "+res);
	});
}, 2000);

// ua.get('https://example.org/', { content_file: 'out.html' });

// var ua = new AsyncAgent({ cookies: true });
// ua.get('test_reflect://localhost/', { headers: { 'set-cookie': "a=b; test=qwerty" } }).once('response', function (res) {
// 	console.log("reflected response: "+ res);
// 	ua.get('test_reflect://localhost/', { headers: { 'set-cookie': [ 'b=c', "test=asdf"] } }).once('response', function (res) {
// 		console.log("reflected response: "+ res);
// 		ua.get('test_reflect://localhost/').once('response', function (res) {
// 			console.log("reflected response: "+ res);
// 		});
// 	});
// });

// ua.get('test_reflect://localhost/', { body: { a:'b', test:'#%^&*(-_.~' } }).once('response', function (res) {
// 	console.log("reflected response:" + res);
// });


// var jar = new AsyncAgent.CookieJar().fromFileSync('jar.cookies');

// jar.setCookies('http://localhost:undefined', { c: 'd' });
// console.log('jar:', jar);
// jar.toFileSync('jar.cookies');



// var ua = new AsyncAgent();
// ua.get('https://www.yahoo.com/', { chunked: true }).once('header', function (res) {
// 	console.log("got header: "+res);
// }).once('response', function (res) {
// 	console.log("got response: "+res);
// }).on('data', function (data) {
// 	console.log("got chunk: ");
// }).once('end', function () {
// 	console.log("got end");
// });

// var ua = new AsyncAgent();
// ua.get('https://www.google.com/').once('header', function (res) {
// 	console.log("got header: "+res);
// }).once('response', function (res) {
// 	console.log("got response: "+res);
// }).on('data', function (data) {
// 	console.log("got chunk: "+ data);
// }).once('end', function () {
// 	console.log("got end");
// });

// ua.get('https://www.google.com/').on('response', function (res) {
// 	console.log("got response:", res);
// 	ua.get('https://www.google.com/').on('response', function (res) {
// 		console.log("got response2:", res);
// 	});
// });
