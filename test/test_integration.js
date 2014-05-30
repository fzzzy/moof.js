
var assert = require('assert'),
    test = require('selenium-webdriver/testing'),
    webdriver = require('selenium-webdriver'),
    child = require('child_process');

test.describe('Integration tests', function() {
  var d;
  function overrideLogger() {
    // disable temporarily
    return;
    logs = [];
    function logger() {
      for (var i = 0; i < arguments.length; i++) {
        logs.push(arguments[i]);
      }
    }
    console.log = logger;
  }
  before(function(done) {
    overrideLogger();

    var cont = true;
    d = new webdriver.Builder()
      .withCapabilities(webdriver.Capabilities.chrome())
      .build();
    var server = child.spawn("node", ["--harmony", "server.js"]);
    server.stdout.on('data', function (data) {
      console.log(data.toString());
      if (cont) {
        done();
        cont = false;
      }
    });
  });

  var logs = [];
  beforeEach(function() {
    overrideLogger();
  });

  test.it('should be able to log in to the world', function() {
    d.get('http://localhost:8080/');
    var searchBox = d.findElement(webdriver.By.name('name'));
    searchBox.sendKeys('asdf\n');
    d.wait(function() {
      return d.findElements(webdriver.By.className('player')).then(function(elements) {
        if (elements.length) {
          return elements[0].getText().then(function(txt) {
            assert.equal(txt, "asdf");
            return elements[0];
          });
        }
      });
    }, 1000, 'Failed to find player after 1 second ' + logs.join(" "));

//    driver.quit();
  });
});

