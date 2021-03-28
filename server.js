require('dotenv').config();

const http = require('http');
const eetase = require('eetase');
const socketClusterServer = require('socketcluster-server');

const { initDb } = require("./src/DataStores/DataStore");


// SC Options
let scOptions = {
    path: "/pibiz/",
    authKey: process.env.AUTH_SECRET,
    origins: "*:*"
};

//Create Servers (HTTP/WS)
let httpServer = eetase(http.createServer());
let scServer = socketClusterServer.attach(httpServer, scOptions);


(async () => {
    await initDb();

    const AccessControl = require("./src/ScMods/access-control");
    const Authentication = require("./src/ScMods/authentication");
    const Api = require("./src/ScMods/api");

    const HttpApp = require("./serverHTTP");
    const BackupHelper = require("./src/Utils/backupHelper");


    //Attach HTTP App
    HttpApp.attach(scServer);

    //Attach ACL
    AccessControl.attach(scServer);

    // WebSocket connection handling loop.
    (async () => {
        for await (let { socket } of scServer.listener('connection')) {
            //Attach Auth
            Authentication.attach(socket);
        }
    })();

    //Attach API
    Api.attach(scServer);

    //Start SERVER
    httpServer.listen(process.env.APP_PORT, process.env.APP_HOST, () => {
        console.log(`Listening on http://${process.env.APP_HOST}:${process.env.APP_PORT}`);

        BackupHelper.DbTask.start();
        BackupHelper.UploadsTask.start();
    });
})();

//__________________________________________ LISTEN ERRORS
(async () => {
    for await (let { error } of scServer.listener('error')) {
        console.log(error.name, error.message);
    }
})();