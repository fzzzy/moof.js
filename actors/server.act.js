
var first_room_id = "3,3";
var rooms = new Map();
for (let x = 0; x < 16; x++) {
  for (let y = 0; y < 16; y++) {
    rooms["" + x + "," + y] = true;
  }
}

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
      first_room("join", {join: msg.data.login, name: msg.data.name, pos: "7,7,7"});
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
      let old_pos = msg.data.pos;
      let split_pos = msg.data.pos.split(",")
      split_pos[0] = parseInt(split_pos[0]);
      split_pos[1] = parseInt(split_pos[1]);
      if (split_pos[0] === 0 || split_pos[0] === 15) {
        split_pos[0] = -(split_pos[0] - 15);
      }
      if (split_pos[1] === 0 || split_pos[1] === 15) {
        split_pos[1] = -(split_pos[1] - 15);        
      }
      new_room("join", {join: msg.data.player, name: msg.data.name, pos: split_pos.join(",")});
    } else if (msg.pattern === "close") {
      // todo use actual room player was in!
      first_room("part", {part: msg.data.close});
    }
  }
}
