
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

function random(max) {
  return Math.floor(Math.random() * max);
}

engine.attach(http).on('connection', function (socket) {
  socket.on('message', function(data) {
    console.log("got message", data);
    var msg = JSON.parse(data);
    if (msg.pattern === "login") {
      function ui_func(pat, data) {
        //console.log("ui said", pat, data);
        socket.send(JSON.stringify({pattern: pat, data: data}));
      }
      var pos = random(16) + "," + random(16);
      socket.send(JSON.stringify(
        {pattern: 'login', data: {name: msg.data.name, pos: pos}}));
      vat.spawn(act("player"), socket.id, ui_func);
      room('join', {
        address: socket.id,
        name: msg.data.name,
        pos: "" + pos});
      console.log("connected");
    } else if (msg.pattern === "msg") {
      room("msg", {address: socket.id, msg: msg.data});
    } else if (msg.pattern === "go") {
      room("go", {address: socket.id, pos: msg.data});
    } else if (msg.pattern === "dig") {
      room("dig", msg.data);
    }
  });
  socket.on('close', function () {
    console.log("close");
    room('part', {address: socket.id});
  });
});

console.log("server listening on http://localhost:8080/");

