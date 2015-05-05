
"use strict";

let vm = require('vm'),
    fs = require('fs'),
    path = require('path'),
    uuid = require('node-uuid');

// https://github.com/substack/deep-freeze

function deepFreeze (o) {
  Object.freeze(o);

  Object.getOwnPropertyNames(o).forEach(function (prop) {
    try {
      if (o.hasOwnProperty(prop)
      && o[prop] !== null
      && (typeof o[prop] === "object" || typeof o[prop] === "function")
      && !Object.isFrozen(o[prop])) {
        deepFreeze(o[prop]);
      }
    } catch (e) {

    }
  });

  return o;
}

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects

let allowed_global_names = [
  "eval", "isFinite", "isNaN", "parseFloat", "parseInt",
  "decodeURI", "decodeURIComponent", "encodeURI", "encodeURIComponent",
  "escape", "unescape", "Object", "Function", "Boolean", "Symbol",
  "Error", "EvalError", "InternalError", "RangeError", "ReferenceError",
  "SyntaxError", "TypeError", "URIError", "Number", "Math", "Date",
  "String", "RegExp", "Array", "Float32Array", "Float64Array",
  "Int16Array", "Int32Array", "Int8Array",
  "Uint16Array", "Uint32Array", "Uint8Array", "Uint8ClampedArray",
  "Map", "Set", "WeakMap", "WeakSet",
  "ArrayBuffer", "DataView", "JSON", "Promise", "Proxy",
  "setTimeout", "clearTimeout", "setInterval", "clearInterval",
  "regeneratorRuntime", "_babelPolyfill"];

let allowed_global_names_map = new Map();
allowed_global_names_map["NaN"] = true;
allowed_global_names_map["Infinity"] = true;
allowed_global_names_map["undefined"] = true;

// TODO this is leaky
allowed_global_names_map["console"] = true;

// TODO move file and socket access out of the sandboxed code
// and blacklist these objects.
allowed_global_names_map["Buffer"] = true;
allowed_global_names_map["process"] = true;
allowed_global_names_map["global"] = true;
allowed_global_names_map["util"] = true;
allowed_global_names_map["DTRACE_NET_SERVER_CONNECTION"] = true;
allowed_global_names_map["DTRACE_HTTP_SERVER_REQUEST"] = true;
allowed_global_names_map["DTRACE_HTTP_SERVER_RESPONSE"] = true;


for (let i in allowed_global_names) {
  let name = allowed_global_names[i];
  allowed_global_names_map[name] = true;
  if (global[name] !== undefined) {
    deepFreeze(global[name]);
  }
}

let prefix = ('"use strict"; var name = arguments[0].name,' +
    'console = arguments[0].console,' +
    'ui = arguments[0].ui,' +
    'sleep = arguments[0].sleep,' +
    'recv = arguments[0].recv,' +
    'time_recv = arguments[0].time_recv,' +
    'spawn_code = arguments[0].spawn_code,' +
    'spawn = arguments[0].spawn,' +
    'address = arguments[0].address,' +
    'uuid = arguments[0].uuid,');

let global_names = Object.getOwnPropertyNames(global || window);

for (let i in global_names) {
  let name = global_names[i];
  if (allowed_global_names_map[name] === undefined) {
    prefix += name + " = undefined,";
  }
}

prefix += "_____ = true; arguments[0] = null;";

let postfix = (';\ntry { ' +
    'return main(); ' +
    '} catch (e) { ' +
    'return {next: function() { return {done: false, value: {} } }' +
    '} }');

let function_cache = new Map();

exports.Vat = function Vat(global_logger, message_logger) {
   if (!(this instanceof Vat)) {
     return new Vat(global_logger, message_logger);
   }

  if (global_logger === undefined) {
    global_logger = function global_logger() {
      console.log.apply(null, arguments);
    }
  }

  let actors = new Map();

  function check_mailbox(ctx, waitfor, timeout) {
    for (let i = 0; i < waitfor.length; i++) {
      let waitforwhat = waitfor[i];
      if (waitforwhat === "*") {
        waitforwhat = Object.getOwnPropertyNames(ctx.__mailbox)[0];
      }
      let vals = ctx.__mailbox[waitforwhat];
      if (vals) {
        let val = vals.shift();
        if (!vals.length) {
          delete ctx.__mailbox[waitforwhat];
        }
        ctx.__waiting = null;
        if (ctx.__timeout !== null) {
          clearTimeout(ctx.__timeout);
          ctx.__timeout = null;
        }
        iterate(ctx, {pattern: waitforwhat, data: JSON.parse(val.data)});
        return;
      }
    }
    if (timeout) {
      ctx.__timeout = setTimeout(function() {
        ctx.__timeout = null;
        ctx.__waiting = null;
        iterate(ctx, new Error('timeout'), true);
      }, timeout);
    }
    ctx.__waiting = waitfor;
  }

  function iterate(ctx, val, throwval) {
    let result = null;
    if (throwval) {
      result = ctx.__g.throw(val);
    } else {
      result = ctx.__g.next(val);
    }
    if (!result.done) {
      if (result.value.sleep !== undefined) {
        setTimeout(iterate, result.value.sleep, ctx);
      } else if (result.value.recv !== undefined) {
        process.nextTick(function() {
          check_mailbox(ctx, result.value.recv, result.value.timeout);
        });
      }
    } else {
      delete actors[ctx.name];
    }
  }

  function address(name) {
    if (name === undefined) {
      throw new Error("address cannot be undefined");
    }
    //console.log(my_name, "looking up ", name, "in", Object.getOwnPropertyNames(actors));
    if (actors[name] === undefined) {
      actors[name] = {
        early_mailbox: [],
        cast: function cast(pattern, msg) {
          //console.log("address_cast", pattern, msg, my_name);
          if (actors[name].early_mailbox !== undefined) {
            actors[name].early_mailbox.push([pattern, msg]);
          } else {
            actors[name].cast(pattern, msg);
          }
        }
      };
    }
    let addr_cast = actors[name].cast;
    return function cast(pattern, msg) {
      //console.log("calling cast", my_name);
      addr_cast(pattern, msg);
    }
  }

  function spawn(actor, name, ui) {
    let code = fs.readFileSync(actor);
    actor = path.resolve(actor);
    return spawn_code(code, actor, name, ui);
  }

  function spawn_code(code, filename, name, ui) {
    if (name === undefined) {
      name = uuid.v4();
    } else if (actors[name] !== undefined && actors[name].early_mailbox === undefined) {
      throw new Error("attempted to start duplicate actor " + name);
    }

    let ctx = {
      name: name,
      __filename: filename,
      __mailbox: new Map(),
      __waiting: null,
      __timeout: null,
      console: {
        log: function() {
          global_logger.apply(null, arguments);
        },
      },
      ui: ui,
      sleep: function sleep(time) {
        return {sleep: time};
      },
      recv: function recv() {
        if (arguments.length) {
          return {recv: Array.prototype.slice.call(arguments, 0)};
        } else {
          return {recv: ["*"]};
        }
      },
      time_recv: function time_recv(time) {
        let args = Array.prototype.slice.call(arguments, 1);
        if (!args.length) {
          args = ["*"];
        }
        return {recv: args, timeout: time};
      },
      spawn_code: spawn_code,
      spawn: spawn,
      address: address,
      uuid: uuid.v4
    };

    function make_fun(code, filename) {
      var fun = new Function(prefix + code + postfix);
      fun.displayName = filename;
      return fun;
    }

    let fun = null;
    if (filename && filename.length > 1) {
      if (!function_cache[filename]) {
        function_cache[filename] = make_fun(code, filename);
      }
      fun = function_cache[filename];
    } else {
      fun = make_fun(code, filename);
    }
    ctx.__g = fun(ctx);

    let cast = function cast(pattern, msg) {
      //console.log("casting", pattern, msg);
      if (message_logger !== undefined) {
        message_logger(name, pattern, msg);
      }

      if (ctx.__mailbox[pattern] === undefined) {
        ctx.__mailbox[pattern] = [];
      }
      if (msg === undefined) {
        msg = {};
      }
      ctx.__mailbox[pattern].push({data: JSON.stringify(msg)});
      if (ctx.__waiting !== null) {
        process.nextTick(function() {
          if (ctx.__waiting !== null) {
            check_mailbox(ctx, ctx.__waiting);
          }
        });
      }
    }

    let early_mailbox = null;
    if (actors[name] !== undefined) {
      early_mailbox = actors[name].early_mailbox;
      delete actors[name].early_mailbox;
    }
    actors[name] = {cast: cast, code: code, name: name};
    if (early_mailbox) {
      for (let i = 0; i < early_mailbox.length; i++) {
        let pattern = early_mailbox[i][0];
        let data = early_mailbox[i][1];
        cast(pattern, data);
      }
    }

    iterate(ctx);

    return cast;
  }

  this.address = address;
  this.spawn_code = spawn_code;
  this.spawn = spawn;
};
