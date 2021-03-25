require('dotenv').config();

const http = require('http');
const eetase = require('eetase');
const socketClusterServer = require('socketcluster-server');
const cron = require('node-cron');
const fse = require('fs-extra')

const { initDb } = require("./src/Libs/db");



// SC Options
let scOptions = {
    path: "/pibiz/",
    authKey: process.env.AUTH_SECRET,
    origins: "*:*"
};

//Create Servers (HTTP/WS)
let httpServer = eetase(http.createServer());
let scServer = socketClusterServer.attach(httpServer, scOptions);



initDb((error) => {
    if (error) throw error;


    const AccessControl = require("./src/ScMods/access-control");
    const Authentication = require("./src/ScMods/authentication");
    const Api = require("./src/ScMods/api");

    const HttpApp = require("./serverHTTP");


    //Attach ACL
    AccessControl.attach(scServer);

    //Attach API
    Api.attach(scServer);

    // WebSocket connection handling loop.
    (async () => {
        for await (let { socket } of scServer.listener('connection')) {
            //Attach Auth
            Authentication.attach(socket);
        }
    })();

    //Attach HTTP App
    HttpApp.attach(scServer);


    //Start SERVER
    httpServer.listen(process.env.APP_PORT, process.env.APP_HOST, () => {
        console.log(`Listening on http://${process.env.APP_HOST}:${process.env.APP_PORT}`);
    });

    const SC_LOG_LEVEL = process.env.SC_LOG_LEVEL || 2;


    if (SC_LOG_LEVEL >= 1) {
        (async () => {
            for await (let { error } of scServer.listener('error')) {
                console.error(error.name);
            }
        })();
    }

    if (SC_LOG_LEVEL >= 2) {
        (async () => {
            for await (let { warning } of scServer.listener('warning')) {
                console.warn(warning);
            }
        })();
    }


    //__________________________________________ CRON SCHEDULE
    cron.schedule(
        '* * * * *',
        () => {
            (async () => {
                try {
                    const noww = new Date();
                    const BkpPath = `/mnt/pibizdisk/Y${noww.getFullYear()}/M${noww.getMonth() + 1}`;

                    await fse.copy('./_STORAGE/', BkpPath)
                    console.log('BKP success!', BkpPath)
                } catch (err) {
                    console.log('BKP Failed!')
                    console.error(err)
                }
            })()
        },
        { scheduled: true, timezone: "Asia/Kolkata" }
    );
})