
var assert = require('assert'),
    test = require('selenium-webdriver/testing'),
    webdriver = require('selenium-webdriver'),
    child = require('child_process');

test.describe('Integration tests', function() {
  var d;
  var s;
  before(function() {

    var cont = true;
    d = new webdriver.Builder()
      .withCapabilities(webdriver.Capabilities.chrome())
      .build();

    s = require("../server.js").listen(8080);
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
    }, 1000, 'Failed to find player after 1 second');
  });

  after(function(done) {
//    done();
    d.quit().then(done); s.close();
  });

  test.it('should be able to go to a tile', function() {
    d.findElement(webdriver.By.id("0,0")).then(function(el) {
        el.click();
    });
  });

  test.it('should be able to send a message', function() {
    d.findElement(webdriver.By.name("msg")).then(function (el) {
      el.sendKeys("hello world\n");
    });
  });

  test.it('should be able to dig a tile', function() {
    d.findElement(webdriver.By.id("dig")).then(function(dig) {
      dig.sendKeys("2");
      d.findElement(webdriver.By.id("7,0")).then(function(el) {
          el.click();
      });
    });
  });

  test.it('should be able to create a link', function() {
    d.findElement(webdriver.By.id("dig")).then(function(dig) {
      dig.sendKeys("link");
      d.findElement(webdriver.By.id("8,8")).then(function(el) {
          el.click();
          d.switchTo().alert().accept();
      });
    });
  });
});

