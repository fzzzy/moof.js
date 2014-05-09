
"use strict";

let actors = require('./actors.js'),
    fs = require('fs'),
    uuid = require('node-uuid');

let vat = actors.Vat();

function act(name) {
  return fs.readFileSync("actors/" + name + ".act");
}

let room_id = uuid.v4();
let room = vat.spawn(act("room"), room_id);

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
  let logged_in = false;
  let my_act = null;

  socket.on('message', function(data) {
    var msg = JSON.parse(data);
    if (logged_in) {
      my_act(msg.pattern, msg.data);
      return;
    }
    if (msg.pattern !== "login") {
      console.log("ignored message because not logged in", data);
      return;
    }

    function ui_func(pat, data) {
      //console.log("ui said", pat, data);
      socket.send(JSON.stringify({pattern: pat, data: data}));
    }
    var pos = random(16) + "," + random(16);
    socket.send(JSON.stringify(
      {pattern: 'login', data: {name: msg.data.name, pos: pos}}));
    my_act = vat.spawn(act("player"), socket.id, ui_func);
    my_act('join', room_id);
    room('join', {
      addr: socket.id,
      name: msg.data.name,
      pos: "" + pos});
//    console.log("connected");
    logged_in = true;
  });

  socket.on('close', function () {
    console.log("close");
    room('part', {addr: socket.id});
  });
});

console.log("server listening on http://localhost:8080/");

