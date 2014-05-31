
"use strict";

exports.listen = function(port) {
  let actors = require('./actors.js'),
      uuid = require('node-uuid');

  let vat = actors.Vat();

  let server_id = uuid.v4();
  let server = vat.spawn("actors/server.act", server_id);

  let engine = require('engine.io');

  let ns = require('node-static');
  let files = new ns.Server('./static');

  let http = require('http').createServer(function(request, response) {
    request.addListener('end', function() {
      files.serve(request, response);
    }).resume();
  }).listen(port);

  console.log("server listening on http://localhost:" + port + "/");

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
        console.log("ui msg", pat, data);
        socket.send(JSON.stringify({pattern: pat, data: data}));
      }

      my_act = vat.spawn("actors/player.act", socket.id, ui_func);
      logged_in = true;

      server("login", {login: socket.id, name: msg.data.name});
    });

    socket.on('close', function () {
      console.log("close");
      server('close', {close: socket.id});
    });
  });

  return http;
};

