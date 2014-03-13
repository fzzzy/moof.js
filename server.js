
"use strict";

let actors = require('./actors.js'),
    fs = require('fs');

let vat = actors.Vat();

function act(name) {
  return fs.readFileSync("actors/" + name + ".act");
}

let room = vat.spawn(act("room"), "room-id");

let engine = require('engine.io');

let ns = require('node-static');
let files = new ns.Server('./static');

let http = require('http').createServer(function(request, response) {
  request.addListener('end', function() {
    files.serve(request, response);
  }).resume();
}).listen(8080);

engine.attach(http).on('connection', function (socket) {
  function ui_func(pat, data) {
    //console.log("ui said", pat, data);
    socket.send(JSON.stringify({pattern: pat, data: data}));
  }
  vat.spawn(act("player"), socket.id, ui_func);
  room('join', socket.id);
  console.log("connected");
  socket.on('message', function(data) {
    console.log("got message", data);
    var msg = JSON.parse(data);
    if (msg.pattern === "msg") {
      room("msg", msg.data);
    }
  });
  socket.on('close', function () {
    console.log("close");
  });
});

console.log("server listening on http://localhost:8080/");

