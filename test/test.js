
"use strict";


let assert = require("assert"),
    fs = require("fs"),
    actors = require("../actors");


function act(name) {
  return fs.readFileSync("test/actors/" + name + ".act");
}

describe('actors', function() {
  let o;
  beforeEach(function() {
    let logs = [];
    function logger() {
      for (let i = 0; i < arguments.length; i++) {
        logs.push(arguments[i]);
      }
    }
    o = {logs: logs, vat: actors.Vat(logger)};
  });

  describe('spawn', function() {
  
    it('should log to the logging function', function() {
      o.vat.spawn("console.log('hello')");
      assert.equal(o.logs.length, 1);
      assert.equal(o.logs[0], 'hello');
    });
  
    it('should log twice', function() {
      o.vat.spawn("console.log('hello')");
      o.vat.spawn("console.log('goodbye')");
      assert.equal(o.logs.length, 2);
      assert.equal(o.logs[0], 'hello');
      assert.equal(o.logs[1], 'goodbye');
    });

  });

  describe('cast', function() {
    it('should output the message cast in', function(done) {
      let a = o.vat.spawn(act('echo'));
      a('msg', 'message');
      process.nextTick(function() {
        assert.equal(o.logs.length, 1);
        assert.equal(o.logs[0], 'message');
        done();
      });
    });
  });

  describe('pingpong', function() {
    it('should ping pong back and forth', function(done) {
      let ping = act("ping");  
      let pong = act("pong");

      o.vat.spawn(ping, "ping");
      o.vat.spawn(pong, "pong");

      process.nextTick(function() {
        process.nextTick(function() {
          process.nextTick(function() {
            // We only need two ticks, but do an extra tick
            // to make sure we don't keep going
            assert.equal(o.logs.length, 4);
            assert.equal(o.logs.join(" "), 'ping pong ping pong');
            done();
          });
        });
      });

    });
  });

  describe('ui', function() {
    it('should be able to call the ui function passed in', function() {
      let output = '';
      function ui(what) {
        output = what;
      }
      o.vat.spawn("ui('hello')", 'ui', ui);
      assert.equal(output, "hello");
    });
  });

});

