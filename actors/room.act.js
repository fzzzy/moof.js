
function random(max) {
  return Math.floor(Math.random() * max);
}


function* main() {
  let participants = new Map();
  let tiles = [];
  let links = [];
  for (let y = 0; y < 16; y++) {
    let row = [];
    let linkrow = [];
    for (let x = 0; x < 16; x++) {
      row.push(0);
      linkrow.push("");
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
