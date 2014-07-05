
var first_room_id = "3,3";
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

  let tiles = [];
  for (let y = 0; y < 256; y++) {
    let row = [];
    for (let x = 0; x < 256; x++) {
      row.push(0);
    }
    tiles.push(row);
  }

  function draw(x, y, t) {
    tiles[y][x] = t;
    let room_x = Math.floor(x / 16);
    let room_y = Math.floor(y / 16);
    let tile_x = x % 16;
    let tile_y = y % 16;
    let room = address("" + room_x + "," + room_y);
    room("dig", {dig: "" + tile_x + "," + tile_y, tile: t});
  }

  var x = 128;
  var y = 128;
  var z = 65536 * 4;

  for (var t = 0; t < 7; t++) {
    for (var i = 0; i < z; i++) {
      if (t === 0 || tiles[y][x] === t - 1 || tiles[y][x] === 8) {
        draw(x, y, t);
      }
      var direction = random(4) * 2;
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
      while (y < 5 || y > 250 || x < 5 || x > 250) {
        x = random(256);
        y = random(256);
      }
    }
    z = z / 2;
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
