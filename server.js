
let {spawn} = require("child_process");

exports.listen = function(port, message_log, startup_actor) {
  console.log("Server starting on port " + port + "...");
  let start = new Date();
  let actors = require('./actors.js'),
      uuid = require('node-uuid');

  let vat = actors.Vat(undefined, message_log);

  let server_id = uuid.v4();
  let server = vat.spawn("actors/server.act.js", server_id);
  if (startup_actor) {
    let _sa = vat.spawn(startup_actor);
    _sa('startup', {startup: server_id});
  }

  let engine = require('engine.io');

  let ns = require('node-static');
  let files = new ns.Server('./static');

  let http = require('http').createServer(function(request, response) {
    request.addListener('end', function() {
      console.log(request.method, request.url);
      if (request.url === "/webhook") {
        spawn("git", ["pull"], {stdio: ["ignore", process.stdout, process.stderr]});
        response.end("");
      } else {
        files.serve(request, response);
      }
    }).resume();
  }).listen(port);

  let end = new Date();
  console.log("Startup time: " + (end - start) + " ms");
  console.log("Server listening on http://localhost:" + port + "/");

  engine.attach(http).on('connection', function (socket) {
    console.log("onconnection", socket.id);
    let logged_in = false;
    let my_act = null;

    socket.on('message', function(data) {
      var msg = JSON.parse(data);
      if (logged_in) {
        my_act(msg.pattern, msg.data);
        return;
      }

      if (msg.pattern !== "login") {
        return;
      }

      function ui_func(pat, data) {
        //console.log("ui msg", pat, data);
        socket.send(JSON.stringify({pattern: pat, data: data}));
      }

      my_act = vat.spawn("actors/player.act.js", socket.id, ui_func);
      logged_in = true;

      server("login", {login: socket.id, name: msg.data.name});
    });

    socket.on('close', function () {
      //console.log("close");
      server('close', {close: socket.id});
    });
  });

  return http;
};
