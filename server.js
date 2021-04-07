require('dotenv').config();

const http = require('http');
const eetase = require('eetase');
const socketClusterServer = require('socketcluster-server');

const { initDb } = require("./src/DataStores/DataStore");


const AUTH_SECRET = process.env.AUTH_SECRET;
const DB_BACKUP = process.env.DB_BACKUP || 'off';


let scOptions = {
    path: "/pibiz/",
    authKey: AUTH_SECRET,
    origins: "*:*"
};

let httpServer = eetase(http.createServer());
let scServer = socketClusterServer.attach(httpServer, scOptions);


(async () => {
    await initDb();

    const AccessControl = require("./src/ScMods/access-control");
    const Authentication = require("./src/ScMods/authentication");
    const Api = require("./src/ScMods/api");

    const HttpApp = require("./serverHTTP");
    const BackupHelper = require("./src/Utils/backupHelper");


    HttpApp.attach(scServer);
    AccessControl.attach(scServer);
    Api.attach(scServer);

    (async () => {
        for await (let { socket } of scServer.listener('connection')) {
            Authentication.attach(socket);
        }
    })();

    httpServer.listen(process.env.APP_PORT, process.env.APP_HOST, () => {
        console.log(`Listening on http://${process.env.APP_HOST}:${process.env.APP_PORT}`);
        if (DB_BACKUP == 'on') {
            BackupHelper.BkpTask.start();
        }
    });
})();

(async () => {
    for await (let { error } of scServer.listener('error')) {
        console.log(error.name, error.message);
    }
})();