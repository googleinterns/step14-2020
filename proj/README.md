All commands should be done from the ~/step14-2020/proj directory
To run a local server:
    Setup. Only needs to be called once or whenever package.json changes:
        $ npm install
        $ npm install -g browserify

    To run locally:
        $ npm run-script run

To run tests:
    $ npm test

To deploy (generally just run a test server instead):
    Setup. Only needs to be called once:
        $ gcloud components install docker-credential-gcr
        $ gcloud auth configure-docker
        $ gcloud components install cloud-build-local

    To deploy:
        $ npm run-script deploy