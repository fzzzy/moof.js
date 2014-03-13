
"use strict";

let vm = require("vm");


exports.Vat = function Vat(global_logger) {
   if (!(this instanceof Vat)) {
     return new Vat(global_logger);
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
      if (vals !== undefined) {
        let val = vals.shift();
        if (!vals.length) {
          delete ctx.__mailbox[waitforwhat];
        }
        ctx.__waiting = null;
        if (ctx.__timeout !== null) {
          clearTimeout(ctx.__timeout);
          ctx.__timeout = null;
        }
        iterate(ctx, {pattern: waitforwhat, data: JSON.parse(val)});
        return;
      }
    }
    if (timeout) {
      ctx.__timeout = setTimeout(function() {
        ctx.__timeout = null;
        ctx.__waiting = null;
        vm.runInContext("__g.throw(new Error('timeout'));", ctx, "mainloop.js");
      }, timeout);
    }
    ctx.__waiting = waitfor;
  }

  function iterate(ctx, val) {
    ctx.__val = val;
    let result = vm.runInContext("__g.next(__val);", ctx, "mainloop.js");
    //console.log(result);
    if (!result.done) {
      if (result.value.sleep !== undefined) {
        setTimeout(iterate, result.value.sleep, ctx);
      } else if (result.value.recv !== undefined) {
        check_mailbox(ctx, result.value.recv, result.value.timeout);
      }
    } else {
      if (ctx.__name !== undefined) {
        delete actors[ctx.__name];
      }
      //broadcast("done", ctx.__name);
      //console.log("DONE", actors);
      //console.log("DONE", result.value, ctx);
    }
  }

  function address(name) {
    //console.log("looking up ", name, "in", Object.getOwnPropertyNames(actors));
    if (actors[name] === undefined) {
      actors[name] = {
        early_mailbox: [],
        cast: function cast(pattern, msg) {
          if (actors[name].early_mailbox !== undefined) {
            actors[name].early_mailbox.push([pattern, JSON.stringify(msg)]);            
          } else {
            actors[name].cast(pattern, msg);
          }
        }
      };
    }
    return actors[name].cast;
  }

  function spawn(code, name, ui) {
    let ctx = vm.createContext({
      __name: name,
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
        return {recv: Array.prototype.slice.call(arguments, 1), timeout: time};
      },
      spawn: spawn,
      address: address
    });
    vm.runInContext('"use strict"; ' + code, ctx, "main.js");
    vm.runInContext("var __g; if (this['main']) { __g = main(); } else { __g = {next: function() { return {done: false, value: {} } } } }", ctx, "mainloop.js");

    let cast = function cast(pattern, msg) {
      //console.log("casting", pattern, msg);
      if (ctx.__mailbox[pattern] === undefined) {
        ctx.__mailbox[pattern] = [];
      }
      if (msg === undefined) {
        msg = {};
      }
      ctx.__mailbox[pattern].push(JSON.stringify(msg));
      if (ctx.__waiting !== null) {
        process.nextTick(function() {
          check_mailbox(ctx, ctx.__waiting);        
        });
      }
    }
    if (name) {
      let early_mailbox = null;
      if (actors[name] !== undefined) {
        early_mailbox = actors[name].early_mailbox;
      }
      actors[name] = {cast: cast, code: code, name: name};
      if (early_mailbox) {
        for (let i = 0; i < early_mailbox.length; i++) {
          let pattern = early_mailbox[i][0];
          let data = early_mailbox[i][1];
          cast(pattern, data);
        }
      }
    }

    iterate(ctx);

    return cast;
  }

  this.address = address;
  this.spawn = spawn;
};
