const events      = require("events")
    , util        = require("util");

function Exposer() {}

util.inherits(Exposer, events.EventEmitter);

Exposer.prototype.scriptObj_ = {};
Exposer.prototype.scriptObjSrc_ = {};

Exposer.prototype.getScript = function(exportName) {
	var script = "";
	script += "(function(_export){";
	
	for(var name in this.scriptObj_) {
		script += "_export." + name + "=" + this.scriptObjSrc_[name] + ";";
	}
	
	script += "}(" + (exportName ? exportName : "window") + "));";
	
	return script;
};

function exposeScript(exposer, exportName) {
	return function(req, res, next) {
		res.writeHead(200, {
			"Content-Type": "application/javascript"
		});
		
		res.end(exposer.getScript(exportName));
	};
}

function exposeString(exposer, name, str, settings) {
	exposer.scriptObjSrc_[name] = str;
}

function exposeObject(exposer, name, obj, settings) {
	exposer.scriptObjSrc_[name] = JSON.stringify(obj);
}

function exposeFunction(exposer, name, fn, settings) {
	exposer.scriptObj_[name] = fn;
	var src = "function() {"
	src += "var callback = function() {};"
	
	src += "if(arguments.length > 0) { callback = arguments[arguments.length-1]; if(typeof callback != \"function\") { callback = function(){}; } else { Array.prototype.pop.call(arguments); } }";
	
	src += "var xhs = new XMLHttpRequest;"
	src += "xhs.open(\"POST\", \"/~3xp053\", true);"
	src += "xhs.responseType = \"json\";";
	src += "xhs.onreadystatechange=function() { if(xhs.readyState == 4) { callback.apply(this, xhs.response); } };";
	src += "xhs.send(JSON.stringify({name: \""+name+"\", arguments: Array.prototype.slice.call(arguments)}));";
	src += "}";
	
	exposer.scriptObjSrc_[name] = src;
}

function getPostData(req, res, callback) {
		if(typeof callback != "function") return;
		var jsonStr = "";
		
		req.on('data', function(data) {
				jsonStr += data;
				if(jsonStr.length > 1e6) {
						jsonStr = "";
						res.writeHead(413, {'Content-Type': 'text/plain'}).end();
						req.connection.destroy();
				}
		});

		req.on('end', function() {
				callback(JSON.parse(jsonStr));
		});
}

function expose(exposer, req, res, next) {
	if( req.method.toUpperCase() != "POST"
	||  req.url != "/~3xp053" ) {
		
		next();
		return;
	}
	
	getPostData(req, res, function(data) {
		if(data.name) {
			var args = data.arguments || [];
			exposer.scriptObj_[data.name].apply({
				callback: function() {
					res.end(JSON.stringify(Array.prototype.slice.call(arguments)));
				}
			}, args);
		} else {
			res.end("null");
		}
		
	});
}

Object.defineProperty(module, "exports", {
	get: function() {
		var exposer = new Exposer;
		
		var retExposeFunc = function() {
			Array.prototype.unshift.call(arguments, exposer);
			expose.apply(this, arguments);
		};
		
		retExposeFunc.script = function() {
			Array.prototype.unshift.call(arguments, exposer);
			return exposeScript.apply(this, arguments);
		};
		
		retExposeFunc.getScript = function(exportName) {
			return exposer.getScript(exportName);
		};
		
		retExposeFunc.function = function() {
			Array.prototype.unshift.call(arguments, exposer);
			exposeFunction.apply(this, arguments);
		};
		
		retExposeFunc.string = function() {
			Array.prototype.unshift.call(arguments, exposer);
			exposeString.apply(this, arguments);
		};
		
		retExposeFunc.object = function() {
			Array.prototype.unshift.call(arguments, exposer);
			exposeObject.apply(this, arguments);
		};
		
		return retExposeFunc;
	}
});
