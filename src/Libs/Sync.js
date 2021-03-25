const Rsync = require('rsync');
const rsyncSource = '_STORAGE/';
const rsyncDest = '/mnt/pibizdisk/';

function runRsync() {
    const rsync = new Rsync();
    rsync.flags('avW');
    rsync.set('delete');
    //rsync.exclude('DB');
    rsync.exclude('.keep');
    rsync.source(rsyncSource);
    rsync.destination(rsyncDest);
    return new Promise((resolve, reject) => {
        try {
            let logData = "";
            rsync.execute(
                (error, code, cmd) => {
                    resolve({ error, code, cmd, data: logData });
                },
                (data) => {
                    logData += data;
                },
                (err) => {
                    logData = "" + err;
                }
            );
        } catch (error) {
            reject(error);
        }
    });
}

async function Sync() {
    try {
        //await runRsync();
        //const out = await runRsync();
        let out = 'synched';
        console.log(out);
    } catch (error) {
        console.log(error.message || error);
    }
};

module.exports = Sync;