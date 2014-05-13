
"use strict";

let actors = require('./actors.js'),
    uuid = require('node-uuid');

let vat = actors.Vat();

let server_id = uuid.v4();
let server = vat.spawn("server", server_id);

let engine = require('engine.io');

let ns = require('node-static');
let files = new ns.Server('./static');

let http = require('http').createServer(function(request, response) {
  request.addListener('end', function() {
    files.serve(request, response);
  }).resume();
}).listen(8080);

engine.attach(http).on('connection', function (socket) {
  let logged_in = false;
  let my_act = null;

  socket.on('message', function(data) {
    var msg = JSON.parse(data);
    console.log("server id", server_id);
    console.log("server.js msg", data);
    if (logged_in) {
      my_act(msg.pattern, msg.data);
      return;
    }

    if (msg.pattern !== "login") {
      console.log("ignored message because not logged in", data);
      return;
    }

    function ui_func(pat, data) {
      console.log("ui msg", pat, data);
      socket.send(JSON.stringify({pattern: pat, data: data}));
    }

    my_act = vat.spawn("player", socket.id, ui_func);
    logged_in = true;

    server("login", {login: socket.id, name: msg.data.name, server: server_id});
  });

  socket.on('close', function () {
    console.log("close");
    server('close', {close: socket.id});
  });
});

console.log("server listening on http://localhost:8080/");

