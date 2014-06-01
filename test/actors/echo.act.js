

function* main() {
  while (true) {
    let msg = yield recv('msg');
    console.log(msg.data);
  }
}

