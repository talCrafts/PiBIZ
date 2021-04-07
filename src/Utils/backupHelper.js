const path = require('path');
const cron = require('node-cron');
const Rsync = require('rsync');

//const srcDir = path.join(__dirname, `../../_STORAGE/`);
//const DbDir = path.join(__dirname, `../../_STORAGE/DB/`);
//const UploadDir = path.join(__dirname, `../../_STORAGE/UPLOADS/`);

function runRsync(rsyncSource, rsyncDest) {
    const rsync = new Rsync();
    rsync.flags('avW');
    rsync.set('delete');
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
//__________________________________________ CRON SCHEDULE - BKP UPLOADS
exports.BkpTask = cron.schedule(
    '*/1 * * * *',
    async () => {
        const srcDir = path.join(__dirname, `../../_STORAGE/`);
        const BkpPath = `/mnt/pibizdisk/`;

        try {
            const out = await runRsync(srcDir, BkpPath);
            console.log('BKP success!', out);
        } catch (err) {
            console.log('BKP Failed!', err);
        }
    },
    { scheduled: false, timezone: "Asia/Kolkata" }
);