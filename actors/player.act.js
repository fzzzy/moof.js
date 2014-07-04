

let room_messages = new Map();
room_messages['room_msg'] = true;
room_messages['room_join'] = true;
room_messages['room_part'] = true;
room_messages['room_go'] = true;
room_messages['room_dig'] = true;
room_messages['room_link'] = true;


function* main() {
  ui('msg', 'hello worlddddd');

  let server_id = null,
      server = null,
      room_id = null,
      room = null,
      player_name = null;

  let msg = yield recv("room");

  server_id = msg.data.server;
  server = address(server_id);
  room_id = msg.data.room;
  room = address(room_id);
  player_name = msg.data.name;
  ui('room', msg.data);

  //console.log(name, player_name, "player roommsg", JSON.stringify(msg));

  while (true) {
    msg = yield recv();
    //console.log(name, player_name, "player msg", JSON.stringify(msg));

    if (msg.pattern === "room") {
      ui('room', msg.data);
      room_id = msg.data.name;
      room = address(room_id);
      player_name = msg.data.name;
      //console.log("player name", player_name);
    } else if (msg.pattern in room_messages) {
      ui(msg.pattern, msg.data);
    } else if (msg.pattern === "msg") {
      room(msg.pattern, {msg: msg.data, player: name});
    } else if (msg.pattern === "go") {
      room("go", {go: msg.data, server: server_id, player: name});
    } else if (msg.pattern === "dig") {
      room("dig", msg.data);
    } else if (msg.pattern === "link") {
      //console.log("player sending link message", server_id);
      server("link", {link: msg.data.link, from_room: room_id, pos: msg.data.pos, player: name});
//      server("enter", {enter: msg.data.link, name: name, from_room: room_id});
    } else if (msg.pattern === "enter") {
      server("enter", {enter: msg.data.enter, from_room: room_id, player: name});
    }
  }
}

