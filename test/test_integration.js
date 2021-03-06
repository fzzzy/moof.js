
var assert = require('assert'),
    child = require('child_process'),
    fs = require('fs'),
    test = require('selenium-webdriver/testing'),
    webdriver = require('selenium-webdriver');

test.describe('Integration tests', function() {
  var d;
  var s;
  var l;
  before(function() {

    var cont = true;
    d = new webdriver.Builder()
      .withCapabilities(webdriver.Capabilities.chrome())
      .build();

    l = fs.openSync("message.log", "w");
    s = require("../server.js").listen(
      8080,
      function(name, pattern, data) {
        fs.writeSync(l, name + " " + pattern + " " + JSON.stringify(data) + "\n")
      }
    );
  });

  beforeEach(function() {
    d.get('http://localhost:8080/');
    var searchBox = d.findElement(webdriver.By.name('name'));
    searchBox.sendKeys('asdf\n');
    return d.wait(function() {
      return d.findElements(webdriver.By.className('player')).then(function(elements) {
        if (elements.length) {
          return elements[0].getText().then(function(txt) {
            assert.equal(txt, "asdf");
            return elements[0];
          });
        }
      });
    }, 5000, 'Failed to find player after 5 second');
  });

  after(function(done) {
//    done();
    d.quit().then(done); s.close();
  });

  test.it('should be able to go to a tile', function() {
    return d.findElement(webdriver.By.id("1,1")).then(function(el) {
      el.click();
      return d.wait(function() {
        return d.findElement(webdriver.By.id('player-position')).then(function(element) {
          return element.getText().then(function(txt) {
            assert.equal(txt, "1,1");
            return element;
          });
        });
      }, 1000, 'Failed to update position after 1 second');
    });
  });

  test.it('should be able to send a message', function() {
    d.findElement(webdriver.By.name("msg")).then(function (el) {
      el.sendKeys("hello world\n");
    });

    return d.wait(function() {
      return d.findElement(webdriver.By.className("room_msg")).then(function(element) {
        return element.getText().then(function (txt) {
          assert.equal(txt.trim(), "asdf: hello world");
          return element;
        });
      });
    }, 1000, 'Failed to update position after 1 second');
  });

  test.it('should be able to dig a tile', function() {
    d.findElement(webdriver.By.id("dig")).then(function(dig) {
      dig.sendKeys("2");
      d.findElement(webdriver.By.id("7,0")).then(function(el) {
        el.click();
      });
    });

    return d.wait(function() {
      return d.findElement(webdriver.By.id("7,0")).then(function(element) {
        return element.getAttribute("src").then(function (txt) {
          var split = txt.split("/");
          assert.equal(split[split.length - 1], "2.png");
          return element;
        });
      });
    }, 1000, 'Failed to update tile after 1 second');

  });

  test.it('should be able to create a link', function() {
    d.findElement(webdriver.By.id("dig")).then(function(dig) {
      dig.sendKeys("link");
      d.findElement(webdriver.By.id("8,8")).then(function(el) {
          el.click();
          d.switchTo().alert().accept();
      });
    });

    return d.wait(function() {
      return d.findElement(webdriver.By.id("room-name")).then(function(element) {
        return element.getText().then(function (txt) {
          assert.equal(txt, "new-room");
          return element;
        });
      });
    }, 1000, 'Failed to go to new room after 1 second');

  });
});

