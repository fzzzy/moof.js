
function random(max) {
  return Math.floor(Math.random() * max);
}


function* main() {
  let splitname = name.split(",");
  let my_x = null;
  let my_y = null;
  if (splitname.length === 2) {
    my_x = parseInt(splitname[0]);
    my_y = parseInt(splitname[1]);
  }
  let participants = new Map();
  let tiles = [];
  let links = [];
  for (let y = 0; y < 16; y++) {
    let row = [];
    let linkrow = [];
    for (let x = 0; x < 16; x++) {
      row.push(8);
      if (my_x !== null && my_y !== null) {
        if (x === 0) {
          if (my_x === 0) {
            linkrow.push("15," + my_y);
          } else {
            linkrow.push("" + (my_x - 1) + "," + my_y);
          }
        } else if (x === 15) {
          if (my_x === 15) {
            linkrow.push("0," + my_y);
          } else {
            linkrow.push("" + (my_x + 1) + "," + my_y);
          }
        } else if (y === 0) {
          if (my_y === 0) {
            linkrow.push("" + my_x + ",15");
          } else {
            linkrow.push("" + my_x + "," + (my_y - 1));
          }
        } else if (y === 15) {
          if (my_y === 15) {
            linkrow.push("" + my_x + ",0");
          } else {
            linkrow.push("" + my_x + "," + (my_y + 1));
          }
        } else {
          linkrow.push("");
        }
      } else {
        linkrow.push("");
      }
    }
    tiles.push(row);
    links.push(linkrow);
  }
  let started = yield recv("server_started");
  let server = started.data.server;

  //console.log("hello room", name);

  while (true) {
    let msg = yield recv();
    if (msg.pattern === 'join') {
      let pos = random(16) + "," + random(16);
      msg.data.addr = msg.data.join;
      msg.data.pos = pos;

      let joiner_id = msg.data.join;
      let joiner = address(joiner_id);

      participants[joiner_id] = {
        cast: joiner,
        addr: joiner_id,
        pos: pos,
        name: msg.data.name};

      let players = [];
      for (let i in participants) {
        players.push({
          name: participants[i].name,
          pos: participants[i].pos,
          addr: participants[i].addr});
        if (participants[i].addr !== joiner_id) {
          participants[i].cast(
            'room_join',
            msg.data);
        }
      }
      joiner('room', {room: name, tiles: tiles, players: players, server: server, pos: pos, name: msg.data.name});
    } else if (msg.pattern === 'part') {
      //console.log("Part", msg.data.part, participants);
      delete participants[msg.data.part];
      for (let i in participants) {
        participants[i].cast('room_part', msg.data);
      }
    } else if (msg.pattern === 'msg') {
      for (let i in participants) {
        participants[i].cast(
          'room_msg',
          {msg: participants[msg.data.player].name + ': ' + msg.data.msg,
          addr: msg.data.player});
      }
    } else if (msg.pattern === 'go') {
      let split = msg.data.go.split(",");
      //console.log(name, "links", links);
      let link = links[parseInt(split[1])][parseInt(split[0])];
      if (link) {
        let player = address(msg.data.player);
        if (link.indexOf("http://") !== 0 && link.indexOf("https://") !== 0) {
          player("enter", {enter: link});
        } else {
          player("room_link", {room_link: link});
        }
      }
      for (let i in participants) {
        participants[i].cast('room_go', {go: msg.data.go, addr: msg.data.player});
      }        
    } else if (msg.pattern === 'dig') {
      let split = msg.data.dig.split(",");
      tiles[parseInt(split[1])][parseInt(split[0])] = parseInt(msg.data.tile);
      //console.log("NEWTILES", tiles);
      for (let i in participants) {
        participants[i].cast('room_dig', {dig: msg.data.dig, tile: msg.data.tile, addr: msg.addr});
      }
    } else if (msg.pattern === "server_link") {
      let split = msg.data.pos.split(",");
      links[parseInt(split[1])][parseInt(split[0])] = msg.data.link;
      let player = address(msg.data.player);
      player("go", msg.data.pos);
    }
  }
}
