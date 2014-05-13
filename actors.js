
"use strict";

let vm = require("vm"),
    fs = require('fs'),
    uuid = require('node-uuid');


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
        iterate(ctx, {pattern: waitforwhat, data: JSON.parse(val.data), addr: val.addr});
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
      if (ctx.name !== undefined) {
        delete actors[ctx.name];
      }
      //broadcast("done", ctx.name);
      //console.log("DONE", actors);
      //console.log("DONE", result.value, ctx);
    }
  }

  function create_address(my_name) {
    function address(name) {
      //console.log(my_name, "looking up ", name, "in", Object.getOwnPropertyNames(actors));
      if (actors[name] === undefined) {
        actors[name] = {
          early_mailbox: [],
          cast: function cast(pattern, msg, return_address) {
            //console.log("address_cast", pattern, msg, return_address, my_name);
            if (return_address !== undefined) {
              return_address = my_name;
            } else {
              return_address = undefined;
            }
            if (actors[name].early_mailbox !== undefined) {
              actors[name].early_mailbox.push([pattern, JSON.stringify(msg), return_address]);
            } else {
              actors[name].cast(pattern, msg, return_address);
            }
          }
        };
      }
      let addr_cast = actors[name].cast;
      return function cast(pattern, msg, return_address) {
        //console.log("calling cast", my_name);
        if (return_address === true) {
          return_address = my_name;
        } else {
          return_address = undefined;
        }
        addr_cast(pattern, msg, return_address);
      }
    }
    return address;
  }

  function spawn(actor, name, ui) {
    let code = fs.readFileSync("actors/" + actor + ".act");
    return spawn_code(code, actor + ".act", name, ui);
  }

  function spawn_code(code, filename, name, ui) {
    if (name === undefined) {
      name = uuid.v4();
    }
    let ctx = vm.createContext({
      name: name,
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
      spawn_code: spawn_code,
      spawn: spawn,
      address: create_address(name),
      uuid: uuid.v4
    });
    //console.log('create_address', name);
    vm.runInContext('"use strict"; ' + code, ctx, filename + ".act");
    vm.runInContext("var __g; if (this['main']) { __g = main(); } else { __g = {next: function() { return {done: false, value: {} } } } }", ctx, "mainloop.js");

    let cast = function cast(pattern, msg, return_address) {
      //console.log("casting", pattern, msg);
      if (ctx.__mailbox[pattern] === undefined) {
        ctx.__mailbox[pattern] = [];
      }
      if (msg === undefined) {
        msg = {};
      }
      if (return_address === true) {
        return_address = name;
      }
      ctx.__mailbox[pattern].push({data: JSON.stringify(msg), addr: return_address});
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
          let return_address = early_mailbox[i][2];
          cast(pattern, data, return_address);
        }
      }
    }

    iterate(ctx);

    return cast;
  }

  this.address = create_address();
  this.spawn_code = spawn_code;
  this.spawn = spawn;
};
