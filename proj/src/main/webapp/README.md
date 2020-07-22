Call these commands one at a time:

    $ npm install browserify -g
    $ cd step14-2020/proj/src/main/webapp
    $ npm install
    $ cd ../../..
    $ browserify src/main/webapp/app.js -o src/main/webapp/bundle.js
    $ mvn package appengine:run

To deploy (generally just run a test server instead):

    - Delete step14-2020/proj/target directory

    Starting from proj/
    $ browserify src/main/webapp/app.js -o src/main/webapp/bundle.js
    $ mvn package appengine:deploy
    $ cd src/main/webapp
    $ npm install