
"use strict";

let assert = require("assert"),
    fs = require("fs"),
    actors = require("../actors");


describe('Unit tests', function() {
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
      o.vat.spawn_code("console.log('hello')");
      assert.equal(o.logs.length, 1);
      assert.equal(o.logs[0], 'hello');
    });
  
    it('should log twice', function() {
      o.vat.spawn_code("console.log('hello')");
      o.vat.spawn_code("console.log('goodbye')");
      assert.equal(o.logs.length, 2);
      assert.equal(o.logs[0], 'hello');
      assert.equal(o.logs[1], 'goodbye');
    });

  });

  describe('cast', function() {
    it('should output the message cast in', function(done) {
      let a = o.vat.spawn('test/actors/echo.act');
      a('msg', 'message');
      process.nextTick(function() {
        assert.equal(o.logs.length, 1);
        assert.equal(o.logs[0], 'message');
        done();
      });
    });
  });

  describe('queue', function() {
    it('should be able to queue multiple messages', function(done) {
      let a = o.vat.spawn('test/actors/echo.act');
      a('msg', 'message1');
      a('msg', 'message2');
      process.nextTick(function() {
        assert.equal(o.logs.length, 2);
        assert.equal(o.logs[0], 'message1');
        assert.equal(o.logs[1], 'message2');
        done();
      })
    });
  });

  describe('pingpong', function() {
    it('should ping pong back and forth', function(done) {
      o.vat.spawn('test/actors/ping.act', "ping");
      o.vat.spawn('test/actors/pong.act', "pong");

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
      o.vat.spawn_code("ui('hello')", "?", 'ui', ui);
      assert.equal(output, "hello");
    });
  });

  describe('sleep', function() {
    it('should be able to sleep', function(done) {
      o.vat.spawn_code("function* main() { yield sleep(0.001); ui() }", "?", 'sleep', done);
    });
  });

  describe('timeout', function() {
    it('should raise a timeout error', function(done) {
      o.vat.spawn_code("function* main() { try { yield time_recv(0.005); } catch (e) { ui() } }", "?", 'timeout', done);
    });
  });

  describe('time_recv', function() {
    it('should clear the timeout on recv', function(done) {
      let act = o.vat.spawn_code("function* main() { yield time_recv(1); ui() }", "?", 'time_recv', done);
      // send any message to clear the timeout
      act("hello", {hello: "world"});
    });
  });

  describe('time_recv specific message', function() {
    it('should clear the timeout on recv', function(done) {
      function ui(what) {
        if (what === "world") {
          done();
        }
      }
      let act = o.vat.spawn_code("function* main() { let msg = yield time_recv(1, 'hello'); ui(msg.data.hello) }", "?", 'time_recv_specific', ui);
      // send the hello message to clear the timeout
      act("goodbye", {goodbye: "ohno"});
      act("hello", {hello: "world"});
    });
  });

  describe('return address', function() {
    it('should be able to send the return address to another actor', function(done) {
        o.vat.spawn('test/actors/returner.act', 'returner');
        o.vat.spawn('test/actors/returnee.act', 'returnee');
        process.nextTick(function() {
          assert.equal(o.logs.length, 1);
          assert.equal(o.logs[0], 'return address: returner');
          done();
        });
    });
  });

  describe('null address', function() {
    it('should not be able to make an undefined address', function(done) {
      o.vat.spawn_code("try { address() } catch (e) { console.log(e.message); ui() }", "?", "null address", done);
      assert.equal(o.logs.length, 1);
      assert.equal(o.logs[0], "address cannot be undefined");
    });
  });

  describe('duplicate', function() {
    it('should not be able to make a duplicate actor', function(done) {
      o.vat.spawn_code("console.log('hello1')", "?", "unique_name");
      try {
        o.vat.spawn_code("console.log('hello2')", "?", "unique_name");      
      } catch (e) {
        done();
      }
    });
  });

  describe('global_logger', function(done) {
    it('should call console.log if a logger is not passed to the vat', function(done) {
      let oldlog = console.log;
      let output = [];
      function log() {
        for (let i in arguments) {
          output.push(arguments[i]);
        }
      }
      console.log = log;
      let v = actors.Vat();
      v.spawn_code("console.log('hello')", "?", "global_logger");
      process.nextTick(function() {
        console.log = oldlog;
        assert.equal(output.length, 1);
        assert.equal(output[0], 'hello');
        done();
      });
    });
  });
});

