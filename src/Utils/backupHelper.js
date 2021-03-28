const path = require('path');
const cron = require('node-cron');
const fse = require('fs-extra')


const DbDir = path.join(__dirname, `../../_STORAGE/DB/`);
const UploadDir = path.join(__dirname, `../../_STORAGE/UPLOADS/`);


//__________________________________________ CRON SCHEDULE - BKP DB
exports.DbTask = cron.schedule(
    '*/5 * * * *',
    async () => {
        const noww = new Date();
        const BkpPath = `/mnt/pibizdisk/DB/Y${noww.getFullYear()}/M${noww.getMonth() + 1}/D${noww.getDate()}`;

        try {
            await fse.copy(DbDir, BkpPath)
            console.log('DB BKP success!', BkpPath)
        } catch (err) {
            console.log('DB BKP Failed!')
            console.error(err)
        }
    },
    { scheduled: false, timezone: "Asia/Kolkata" }
);


//__________________________________________ CRON SCHEDULE - BKP UPLOADS
exports.UploadsTask = cron.schedule(
    '*/15 * * * *',
    async () => {
        const BkpPath = `/mnt/pibizdisk/UPLOADS/`;

        try {
            await fse.copy(UploadDir, BkpPath)
            console.log('UPLOADS BKP success!', BkpPath)
        } catch (err) {
            console.log('UPLOADS BKP Failed!')
            console.error(err)
        }
    },
    { scheduled: false, timezone: "Asia/Kolkata" }
);