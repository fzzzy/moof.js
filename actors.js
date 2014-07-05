
"use strict";

let vm = require('vm'),
    fs = require('fs'),
    path = require('path'),
    uuid = require('node-uuid');

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
        vm.runInContext("__g.throw(new Error('timeout'));", ctx, ctx.__filename);
      }, timeout);
    }
    ctx.__waiting = waitfor;
  }

  function iterate(ctx, val) {
    ctx.__val = val;
    let result = vm.runInContext("__g.next(__val);", ctx, ctx.__filename);
    //console.log(result);
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

    let ctx = vm.createContext({
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
    });

    vm.runInContext('"use strict"; ' + code + "; var __g; if (this['main']) { __g = main(); } else { __g = {next: function() { return {done: false, value: {} } } } }", ctx, filename);

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

