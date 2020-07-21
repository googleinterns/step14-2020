$ npm install browserify -g
$ cd step14-2020/proj/src/main/webapp
$ npm install
$ cd ../../..
$ browserify src/main/webapp/app.js -o src/main/webapp/bundle.js
$ mvn package appengine:run

Things broken:
Firebase.message?
Creating a test that can load the page and interact with elements on the page. It can load the page and interact with elements, but the $(...).on('keyup',...) doesn't get called when I try to edit the password.

https://docs.google.com/document/d/1HwaVOhOfw3eYc8nfSR29PavnXAx55qeRCdhHjkdCG3o/edit