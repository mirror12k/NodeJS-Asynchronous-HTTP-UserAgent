

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

// console.log(new AsyncAgent.URL("/asdf?q=qwerty"));
// console.log(new AsyncAgent.URL("//asdf.org/adsf"));
// console.log(new AsyncAgent.URL("../adsf"));
// console.log(new AsyncAgent.URL("../adsf/").base(new AsyncAgent.URL("/qwerty/never/base")));
// console.log(new AsyncAgent.URL("/asdf").base(new AsyncAgent.URL("/qwerty/never/base")));
// console.log(new AsyncAgent.URL("../../asdf", new AsyncAgent.URL("/qwerty/never/base")));
// console.log(new AsyncAgent.URL("ever", "/qwerty/never/base"));
// console.log(new AsyncAgent.URL("ever", "/qwerty/never/base").toString());
test(new AsyncAgent.URL("ever", "//example.org/").base('http://').toString(), 'http://example.org/ever');
test(new AsyncAgent.URL("/asdf?q=qwerty").toString(), '/asdf?q=qwerty');
test(new AsyncAgent.URL("http://example.org:443/").toString(), 'http://example.org:443/');
test(new AsyncAgent.URL("//asdf.org/adsf").toString(), '//asdf.org/adsf');
test(new AsyncAgent.URL("../asdf").toString(), '../asdf');
test(new AsyncAgent.URL("../asdf", "/folder/subfolder/").toString(), '/folder/asdf');
test(new AsyncAgent.URL("../asdf", "/folder/subfolder/subfile").toString(), '/folder/asdf');
test(new AsyncAgent.URL("../asdf", "/folder/subfolder/subfile?a=b").toString(), '/folder/asdf?a=b');
