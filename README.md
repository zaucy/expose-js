# Example

### app.js
```javascript
const express = require("express")
    , expose  = require("expose-js")
		, fs      = require("fs");

var clickCount = 0;

expose.function("getMessage", function() {
	this.callback("This button has been clicked " + clickCount + " times.");
});

var app = express();

// use expose to handle exposed function calls and object getters/setters
app.use(expose);
// serve expose script to enable us to use "getMessage" in the browser
app.get("/server.js", expose.script("window.server ? window.server : (window.server={})"));
// serve app.html
app.get("/", function(req, res) {
	res.writeHead({"Content-Type": "text/html"});
	res.end(fs.readFileSync("app.html"));
});
// redirect any other traffic to /
app.use(function(req, res) {
	res.redirect("/");
});

app.listen(3000);
```

### app.html
```html
<button id="btn">Click me</button>
<script src="/server.js">
<script>
(function() {
	var btn = document.getElementById("button");
	
	btn.addEventListener("click", function(e) {
		if(btn.disabled) return;
		btn.disabled = true;
		
		server.getMessage(function(msg) {
			btn.textContent = msg;
			btn.disabled = false;
		});
	});
	
}());
</script>
```