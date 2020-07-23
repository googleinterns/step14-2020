
To run a local server:
    Setup. Only needs to be called once or whenever package.json changes:
        $ npm install browserify -g
        $ cd ~/step14-2020/proj/src/main/webapp
        $ npm install

    To run locally:
        $ cd ~/step14-2020/proj
        $ browserify src/main/webapp/app.js -o src/main/webapp/bundle.js
        $ mvn package appengine:run

To run tests:
    $ cd ~/step14-2020/proj/src/main/webapp
    $ npm test

To deploy (generally just run a test server instead):
    Setup. Only needs to be called once:
        $ gcloud components install docker-credential-gcr
        $ gcloud auth configure-docker
        $ gcloud components install cloud-build-local

    To deploy:
        $ gcloud config configurations create arringtonh-step-2020-d
        $ gcloud config set project arringtonh-step-2020-d
        $ cd ~/step14-2020
        $ cloud-build-local --config=clouddeploy.json --dryrun=false .