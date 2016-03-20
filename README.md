# AsyncAgent http browsing agent
a generic asynchronous UA written in nodejs

## Features
 - HTTP and HTTPS communication
 - connection caching
 - gzip and deflate [de]compression
 - http cookies
 - automatic url-encoded-form translation of post forms
 - asynchronous requesting
 - optionally chunked requests
 
## Basics
Simply create a new agent and you can immediately start requesting with it:
```javascript
var AsyncAgent = require("./AsyncAgent");

var ua = new AsyncAgent();
ua.get("https://www.google.com");
```
to get a response, simply listen for the 'response' event:
```javascript
ua.get("https://www.google.com").once("response", function (response) {
  console.log("got response: "+response);
});
```
You can also listen to the 'header' event to get the response header before the body has completed transfer.


To pass headers and/or a body to the request, pass them as options to the request method:
```javascript
ua.get("https://www.google.com", {
  headers: { "Accept": "*", "Multi-Header": ["a","b"] },
  body: "top secret",
});
```

A post body consisting of an object will be automatically serialized to a url-encoded-form:
```javascript
ua.post("https://www.google.com", { body: { "a": "b", "key": "val" } });
```

To process a large request, you should use the 'chunked' option to recieve the data in chunks:
```javascript
ua.get("https://www.google.com", { chunked: true }).on("data" function (chunk) {
  console.log("got a chunk: "+chunk);
}).once("end", function () {
  console.log("end of body");
});
```

To simplify file writing, AsyncAgent offers the 'content_file' option to specify a filepath to where the content will be written to, and the 'content_file_callback' option to specify a callback which will be executed once the file has been recieved, written to file, and the file has been closed:
```javascript
ua.get("https://www.google.com", {
  content_file: "~/Downloads/google.html",
  content_file_callback: function () {
    console.log("webpage has been written to file ~/Downloads/google.html");
  },
);
```

To enable cookie storage, simply pass the 'cookies' option to the AsyncAgent instantiator:
```javascript
var ua = new AsyncAgent({ cookies: true });
```
This will create an object stored in ua.cookieStorage. Cookies will automatically be read from responses and set in requests. The cookieStorage accessor can be accessed to store/load cookies to/from file:
```javascript
var ua = new AsyncAgent({ cookies: true });
ua.cookieStorage.fromFileSync("cookie_jar.json");
// perform some request that takes/sets some cookies
ua.cookieStorage.toFileSync("cookie_jar.json");
```


