const events = require("events")
    , util   = require("util");

function Exposer() {}

util.inherits(Exposer, events.EventEmitter);

Exposer.prototype.script_ = "";
Exposer.prototype.scriptObj_ = {};

Exposer.prototype.getScript = function(exportName) {
	var script = "";
	script += "(function(_export){";
	
	for(var name in this.scriptObj_) {
		script += "_export." + name + "=" + this.scriptObj_[name] + ";";
	}
	
	script += "}(" + exportName ? exportName : "window" + "));";
	
	return script;
};

function exposeScript(exposer, exportName) {
	return function(req, res, next) {
		res.writeHead({
			"Content-Type": "application/javascript"
		});
		
		res.end(exposer.getScript(exportName));
	};
}

function exposeString(exposer, name, str, settings) {
	exposer.scriptObj_[name] = str;
}

function exposeObject(exposer, name, obj, settings) {
	exposer.scriptObj_[name] = JSON.stringify(obj);
}

function exposeFunction(exposer, name, fn, settings) {
	exposer.scriptObj_[name] = fn.toString();
}

function expose(req, res, next) {
	if(req.method != "POST") {
		next();
		return;
	}
}

Object.defineProperty(module, "exports", {
	writable: false,
	get: function() {
		var exposer = new Exposer;
		
		var retExposeFunc = function() {
			expose.apply(this, arguments);
		};
		
		retExposeFunc.script = function() {
			arguments.unshift(exposer);
			return exposeScript.apply(this, arguments);
		};
		
		retExposeFunc.getScript = function(exportName) {
			return exposer.getScript(exportName);
		};
		
		retExposeFunc.function = function() {
			arguments.unshift(exposer);
			exposeFunction.apply(this, arguments);
		};
		
		retExposeFunc.string = function() {
			arguments.unshift(exposer);
			exposeString.apply(this, arguments);
		};
		
		retExposeFunc.object = function() {
			arguments.unshift(exposer);
			exposeObject.apply(this, arguments);
		};
		
		return retExposeFunc;
	}
});
