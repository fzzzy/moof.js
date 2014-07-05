
var first_room_id = "7,7";
var rooms = new Map();
for (let x = 0; x < 16; x++) {
  for (let y = 0; y < 16; y++) {
    rooms["" + x + "," + y] = true;
  }
}

function random(max) {
  return Math.floor(Math.random() * max);
}

function* main() {
  for (let room_id in rooms) {
	  let room = spawn("actors/room.act.js", room_id);
	  room("server_started", {server: name});
  }
  let first_room = address(first_room_id);

  function draw(x, y) {
    let room_x = Math.floor(x / 16);
    let room_y = Math.floor(y / 16);
    let tile_x = x % 16;
    let tile_y = y % 16;
    let room = address("" + room_x + "," + room_y);
    room("dig", {dig: "" + tile_x + "," + tile_y, tile: 2});
  }

  var x = 128;
  var y = 128;

  for (var i = 0; i < 65536 * 2; i++) {
    draw(x, y);
    var direction = random(8);
    switch (direction) {
      case 0:
        y = y - 1;
        break;
      case 1:
        x = x + 1;
        y = y - 1;
        break;
      case 2:
        x = x + 1;
        break;
      case 3:
        x = x + 1;
        y = y + 1;
        break;
      case 4:
        y = y + 1;
        break;
      case 5:
        x = x - 1;
        y = y + 1;
        break;
      case 6:
        x = x - 1;
        break;
      case 7:
        x = x - 1;
        y = y - 1;
        break;
    }
    if (y < 0 || y > 256 || x < 0 || x > 256) {
      x = 128;
      y = 128;
    }
  }

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
