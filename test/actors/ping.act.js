

function* main() {
  let i = 2;
  let pong = address('pong');
  while (i--) {
    pong('ping');
    yield recv('pong');
    console.log('pong');
  }
}

