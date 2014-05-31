moof.js
=======

A multiuser web thing

Requires node 0.11 or higher with --harmony, because of the use of generators. Rename the node 0.11 binary to node-raw, and create the following shell script where the node binary used to be:

    #!/usr/bin/env sh
    
    node-raw --harmony "$@"

To install dependencies:
------------------------

> npm install

To run tests:
-------------

> ./run_tests

The integration tests currently require Chrome and the Selenium WebDriver for Chrome.

To run the server:
------------------

> ./server

Then visit http://localhost:8080/ in your favorite browser.
