
console.log("create_new_map");

function random(max) {
  return Math.floor(Math.random() * max);
}

function* main() {
  let msg = yield recv("startup"),
      server = address(msg.data.startup);

  var x = 128;
  var y = 128;
  var z = 65536 * 4;

  let tiles = [];
  for (let y = 0; y < 256; y++) {
    let row = [];
    for (let x = 0; x < 256; x++) {
      row.push(0);
    }
    tiles.push(row);
  }

  var scalers = {
    0: function(x) { return x; },
    1: function(x) { return x - 3 * x / 4; },
    2: function(x) { return x - x / 4; },
    5: function(x) { x = x / 2; return x - 7 * x / 8; }
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

  for (var t = 0; t < 8; t++) {
    for (var i = 0; i < z; i++) {
      if (t === 0 || t === 6 || t === 7 || tiles[y][x] === t - 1 || tiles[y][x] === 8) {
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
    if (scalers[t]) {
      z = scalers[t](z);
    } else {
      z = z / 2;
    }
  }

  let frequency = {};
  for (let f = 0; f < 8; f++) {
    frequency[f] = 0;
  }
  for (let ix = 0; ix < 255; ix++) {
    for (let iy = 0; iy < 255; iy++) {
      let tile_num = tiles[iy][ix];
      frequency[tile_num] = frequency[tile_num] + 1;
    }
  }
  for (let f = 0; f < 8; f++) {
    console.log(f, frequency[f]);
  }
}

