
console.log("create_new_map");

function random(max) {
  return Math.floor(Math.random() * max);
}

function* main() {
  let msg = yield recv("startup"),
      server = address(msg.data.startup);

  let x = 128;
  let y = 128;
  let z = 7;
  let o = 65536 * 4;

  let tiles = [];
  for (let z = 0; z < 16; z++) {
    let layer = [];
    for (let y = 0; y < 256; y++) {
      let row = [];
      for (let x = 0; x < 256; x++) {
        row.push(0);
      }
      layer.push(row);
    }
    tiles.push(layer);
  }

  let scalers = {
    0: function(x) { return x; },
    1: function(x) { return x - 3 * x / 4; },
    2: function(x) { return x - x / 4; },
    5: function(x) { x = x / 2; return x - 7 * x / 8; }
  }

  let rooms = new Map();

  function draw(x, y, z, t) {
    let room_x = Math.floor(x / 16),
        room_y = Math.floor(y / 16),
        tile_x = x % 16,
        tile_y = y % 16,
        room_address = "" + room_x + "," + room_y,
        room = rooms[room_address];

    if (room === undefined) {
      room = address(room_address);
      rooms[room_address] = room;
    }
    room("dig", {dig: "" + tile_x + "," + tile_y + "," + z, tile: t});
  }

  for (var t = 0; t < 8; t++) {
    for (var i = 0; i < o; i++) {
      if (t === 0 || t === 6 || t === 7 || tiles[7][y][x] === t - 1 || tiles[7][y][x] === 8) {
        tiles[z][y][x] = t;
        for (var zi = z - 1; zi >= 0; zi--) {
          tiles[zi][y][x] = t;
        }
        for (var zi = z + 1; zi < 16; zi++) {
          tiles[zi][y][x] = "transparent";
        }
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
      var updown = random(32);
      switch (updown) {
        case 0:
          z = z - 1;
          break;
        case 31:
          z = z + 1;
          break;
        default:
          break;
      }
      while (y < 5 || y > 250 || x < 5 || x > 250 || z < 2 || z > 13) {
        x = random(256);
        y = random(256);
        z = random(16);
      }
    }
    if (scalers[t]) {
      o = scalers[t](o);
    } else {
      o = o / 2;
    }
  }

  for (var rx = 0; rx < 16; rx++) {
    for (var ry = 0; ry < 16; ry++) {
      var update_room = [];
      for (let z = 0; z < 16; z++) {
        var update_layer = [];
        for (let y = 0; y < 16; y++) {
          var update_row = [];
          for (let x = 0; x < 16; x++) {
            update_row.push(tiles[z][y + ry * 16][x + rx * 16]);
          }
          update_layer.push(update_row);
        }
        update_room.push(update_layer);
      }
      var the_room = address("" + rx + "," + ry);
      the_room('load_room', {load_room: update_room});
    }
  }
  console.log("sent load_room");

  let frequency = {};
  for (let f = 0; f < 8; f++) {
    frequency[f] = 0;
  }
  for (let iz = 0; iz < 16; iz++) {
    for (let ix = 0; ix < 255; ix++) {
      for (let iy = 0; iy < 255; iy++) {
        let tile_num = tiles[iz][iy][ix];
        frequency[tile_num] = frequency[tile_num] + 1;
      }
    }
  }
  for (let f = 0; f < 8; f++) {
    console.log(f, frequency[f]);
  }
}

