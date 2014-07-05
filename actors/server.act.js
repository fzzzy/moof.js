
var first_room_id = "first-room";
var rooms = new Map();
rooms[first_room_id] = true;

function* main() {
  for (let room_id in rooms) {
	  let room = spawn("actors/room.act.js", room_id);
	  room("server_started", {server: name});
  }
  let first_room = address(first_room_id);

  while (true) {
    let msg = yield recv();
    //console.log(name, "server msg", JSON.stringify(msg));
    if (msg.pattern === "login") {
      first_room("join", {join: msg.data.login, name: msg.data.name});
    } else if (msg.pattern === "link") {
      let from_room = address(msg.data.from_room);
      //console.log("rooms", rooms);
      let new_room = null;
      if (!(msg.data.link in rooms)) {
        rooms[msg.data.link] = true;
        new_room = spawn("actors/room.act.js", msg.data.link);
        new_room("server_started", {server: name});
      } else {
  	    new_room = address(msg.data.link);
      }
      from_room("server_link", {link: msg.data.link, pos: msg.data.pos, player: msg.data.player});
    } else if (msg.pattern === "enter") {
      let from_room = address(msg.data.from_room);
      //console.log("enter", rooms);
      from_room("part", {part: msg.data.player});
      let new_room = address(msg.data.enter);
      new_room("join", {join: msg.data.player, name: msg.data.name});
    } else if (msg.pattern === "close") {
      // todo use actual room player was in!
      first_room("part", {part: msg.data.close});
    }
  }
}
