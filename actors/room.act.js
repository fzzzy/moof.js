
function random(max) {
  return Math.floor(Math.random() * max);
}

function tile(x, y) {
  return "" + x + "," + y;
}

function tileval(tiles, x, y) {
  if (x === -1) {
    x = 15;
  } else if (x === 16) {
    x = 0;
  }
  if (y === -1) {
    y = 15;
  } else if (y === 16) {
    y = 0;
  }
  return tiles[y][x];
}

function make_tiles(name, my_x, my_y) {
  let tiles = [];
  //
  
  let tile_actors = [];
  let links = [];
  for (let y = 0; y < 16; y++) {
    let row = [];
    //let tilerow = [];
    let linkrow = [];
    for (let x = 0; x < 16; x++) {
      let tilename = name + ":"  + tile(x, y);
      //let tileactor = spawn("actors/tile.act.js", tilename);

      //tilerow.push(tileactor);
      row.push(BLANK_TILE);

      if (my_x === null && my_y === null) {
        linkrow.push("");
        continue;
      }

      if (x === 0) {
        if (my_x === 0) {
          linkrow.push(tile(15, my_y));
        } else {
          linkrow.push(tile(my_x - 1, my_y));
        }
      } else if (x === 15) {
        if (my_x === 15) {
          linkrow.push(tile(0, my_y));
        } else {
          linkrow.push(tile(my_x + 1, my_y));
        }
      } else if (y === 0) {
        if (my_y === 0) {
          linkrow.push(tile(my_x, 15));
        } else {
          linkrow.push(tile(my_x, my_y - 1));
        }
      } else if (y === 15) {
        if (my_y === 15) {
          linkrow.push(tile(my_x, 0));
        } else {
          linkrow.push(tile(my_x, my_y + 1));
        }
      } else {
        linkrow.push("");
      }
    }
    tiles.push(row);
    links.push(linkrow);
  }
  return {tiles: tiles, links: links};
}

function tile_evolve(room_ref, self, neighbors) {
  let reduction = neighbors.reduce(function(x,y) { return x + y | 0 });
  if (self !== BLANK_TILE) {
    if (reduction === BLANK_TILE * 8) {
      return BLANK_TILE;
    }
    if (self === 1) {
      if (random(12) === 0) {
        room_ref('announce', {announce: 'Tree dropped apple.'});
      }
    }
  }
  return self;
}

let BLANK_TILE = 8;

function* main() {
  let self_ref = address(name);
  let splitname = name.split(",");
  let my_x = null;
  let my_y = null;
  if (splitname.length === 2) {
    my_x = parseInt(splitname[0]);
    my_y = parseInt(splitname[1]);
  }
  let participants = new Map(),
      room_map = make_tiles(name, my_x, my_y),
      tiles = room_map.tiles,
      links = room_map.links;

  let started = yield recv("server_started");

  let server = started.data.server,
      msg = null,
      timeout_no = 0;

  function room_tick(tiles) {
    //console.log("tick");
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        let tile_name = tile(x, y),
            old_tile = tileval(tiles, x, y),
            new_tile = tile_evolve(
              self_ref,
              old_tile,
              [tileval(tiles, x - 1, y - 1),
              tileval(tiles, x, y - 1),
              tileval(tiles, x + 1, y - 1),
              tileval(tiles, x + 1, y),
              tileval(tiles, x + 1, y + 1),
              tileval(tiles, x, y + 1),
              tileval(tiles, x - 1, y + 1),
              tileval(tiles, x - 1, y)]);
          if (new_tile !== old_tile) {
            self_ref('dig', {dig: tile_name, tile: new_tile});
          }
      }
    }
  }

  while (true) {
    try {
      msg = yield time_recv(5000);
    } catch (e) {
      //console.log(name, "timeout", ++timeout_no);
      room_tick(tiles);
      continue;
    }
    if (msg.pattern === 'join') {
      msg.data.addr = msg.data.join;

      let joiner_id = msg.data.join;
      let joiner = address(joiner_id);

      participants[joiner_id] = {
        cast: joiner,
        addr: joiner_id,
        pos: msg.data.pos,
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
      joiner('room', {room: name, tiles: tiles, players: players, server: server, pos: msg.data.pos, name: msg.data.name});
    } else if (msg.pattern === 'part') {
      //console.log("Part", msg.data.part, participants);
      delete participants[msg.data.part];
      for (let i in participants) {
        participants[i].cast('room_part', msg.data);
      }
    } else if (msg.pattern === 'announce') {
      for (let i in participants) {
        participants[i].cast(
          'room_msg', {msg: msg.data.announce});
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
          player("enter", {enter: link, pos: msg.data.go});
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
