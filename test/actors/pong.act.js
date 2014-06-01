

function* main() {
  let ping = address('ping');
  while (true) {
    yield recv('ping');
    console.log('ping');
    ping('pong');
  }
}

