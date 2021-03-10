const formidable = require('formidable');
const path = require('path');
const fs = require('fs');


const Helper = require('./Utils/helper');
const PibizHelper = require('./Utils/pibizHelper');

const ApiCtrl = require('./Api/apiCtrl');
const AdminCtrl = require('./Admin/adminCtrl');


/**
 * ____________________________________________________________________________________________________________________
 * 
 *          ---------------------------------------------- ADMIN ONLY ROUTES --------------------------------
 * ____________________________________________________________________________________________________________________
 */

// POST /api/admin/login - Admin Login
const AdminLogin = async (req, res) => {
    const { username, password } = req.ctx.params;

    const Accounts = PibizHelper.GetCollection("accounts");
    const User = Accounts.findOne({ username, group: 'admin', status: 'on' });
    if (User && User._id) {
        const isPwdOk = await Helper.CheckPassword(password, User.password);
        if (isPwdOk) {
            const token = await Helper.SignAuth({ uid: User._id, group: User.group, displayName: User.displayName });
            return Helper.SendRes(res, token, 201);
        }
    }

    await Helper.DelayRes();
    return Helper.SendErr(res, 400, 'Invalid  username or password');
};

// POST /api/admin/exec/:action - Admin API Provider
const AdminExec = async (req, res) => {
    const { action, fireUser, params } = req.ctx;

    try {
        const result = await AdminCtrl[action](params, fireUser);
        return Helper.SendRes(res, result);
    } catch (error) {
        return Helper.SendErr(res, 404, (error.name == 'pibizError' ? error.message : "Not Found"));
    }
};

// GET /api/admin/asset/:asset - Get Asset 
const AdminAsset = async (req, res) => {
    const { asset } = req.ctx;

    try {
        const result = PibizHelper.GetCollection('assets').findOne({ asset });
        if (result && result.asset && result.path) {
            res.setHeader('Content-Type', `${result.mime}`);
            res.setHeader('X-Powered-By', 'PiBIZ');
            const filePath = path.join(__dirname, `../_STORAGE/UPLOADS/${result.path}`);

            const readStream = fs.createReadStream(filePath);
            return readStream.pipe(res);
        }
    } catch (error) {
        return Helper.SendErr(res, 404, error.message || "Not Found");
    }
};

/**
 * ____________________________________________________________________________________________________________________
 * 
 *          ---------------------------------------------- API ONLY ROUTES --------------------------------
 * ____________________________________________________________________________________________________________________
 */

// POST /api/login - Account Login
const Login = async (req, res) => {
    const { username, password } = req.ctx.params;

    const Accounts = PibizHelper.GetCollection("accounts");
    const User = Accounts.findOne({ username, status: 'on', group: { '$ne': 'admin' } });
    if (User && User._id) {
        const isPwdOk = await Helper.CheckPassword(password, User.password);
        if (isPwdOk) {
            const token = await Helper.SignAuth({ uid: User._id, group: User.group, displayName: User.displayName });
            return Helper.SendRes(res, token, 201);
        }
    }

    await Helper.DelayRes();
    return Helper.SendErr(res, 400, 'Invalid  username or password');
};

// POST /api/exec/:ctrl/:action - API Provider
const Exec = async (req, res) => {
    const { action, ctrl, fireUser, params } = req.ctx;

    try {
        const result = await ApiCtrl.Exec({ ctrl, action, params, fireUser });
        return Helper.SendRes(res, result);
    } catch (error) {
        return Helper.SendErr(res, 404, (error.name == 'pibizError' ? error.message : "Not Found"));
    }
};

// GET /api/asset/:asset - Get Asset 
const Asset = async (req, res) => {
    const { asset } = req.ctx;

    try {
        const result = PibizHelper.GetCollection('assets').findOne({ asset });
        if (result && result.asset && result.path) {
            res.setHeader('Content-Type', `${result.mime}`);
            res.setHeader('X-Powered-By', 'PiBIZ');
            const filePath = path.join(__dirname, `../_STORAGE/UPLOADS/${result.path}`);

            const readStream = fs.createReadStream(filePath);
            return readStream.pipe(res);
        }
    } catch (error) {
        return Helper.SendErr(res, 404, error.message || "Not Found");
    }
};


/**
 * ____________________________________________________________________________________________________________________
 * 
 *          ---------------------------------------------- REQUEST HELPERS --------------------------------
 * ____________________________________________________________________________________________________________________
 */
const docs = [
    'application/x-abiword', 'text/csv', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.oasis.opendocument.presentation',
    'application/vnd.oasis.opendocument.spreadsheet',
    'application/vnd.oasis.opendocument.text',
    'application/pdf',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/rtf',
    'text/plain',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
];
const imgs = ['image/webp', 'image/gif', 'image/vnd.microsoft.icon', 'image/jpeg', 'image/png', 'image/svg+xml'];
const auds = ['audio/3gpp2', 'audio/3gpp', 'audio/webm', 'audio/aac', 'audio/midi', 'audio/x-midi', 'audio/mpeg', 'audio/ogg', 'audio/wav'];
const vids = ['video/3gpp2', 'video/3gpp', 'video/webm', 'video/x-msvideo', 'video/mpeg', 'video/ogg'];
const others = ['application/x-bzip', 'application/x-bzip2', 'application/gzip', 'application/x-tar', 'application/zip', 'application/x-7z-compressed'];

const uploadDir = path.join(__dirname, `../_STORAGE/UPLOADS`);

// Get API Key from request
const GetApiKey = (headers, query) => {
    let apiKey;
    if (headers['apikey']) {
        apiKey = headers['apikey'];
    } else if (query['apikey']) {
        apiKey = query['apikey'];
    }
    return apiKey;
};

// Get Auth TokenId from request
const GetIdToken = (headers, query) => {
    let idToken;
    if (headers['authorization']) {
        try {
            idToken = headers['authorization'].split("Bearer ")[1];
        } catch (error) { };
    } else if (query['authtoken']) {
        idToken = query['authtoken'];
    }
    return idToken;
};

// Get POST Data from request
const GetParams = (req, res, fireUser = {}) => {
    return new Promise(async (resolve) => {
        const form = formidable({ keepExtensions: true, uploadDir });
        form.parse(req, async (err, fields = {}, files = {}) => {
            if (err) {
                return Helper.SendErr(res, 400, err.message);
            }

            //const Flds = JSON.parse(JSON.stringify(fields));
            const fileItems = {};

            const proms = [];
            Object.keys(files).forEach(file => {
                proms.push(
                    new Promise(async (resolve2) => {
                        let sampleFile = files[file];

                        let fldr;
                        if (docs.includes(sampleFile.type)) {
                            fldr = "documents"
                        } else if (imgs.includes(sampleFile.type)) {
                            fldr = "images"
                        } else if (auds.includes(sampleFile.type)) {
                            fldr = "audios"
                        } else if (vids.includes(sampleFile.type)) {
                            fldr = "videos"
                        } else if (others.includes(sampleFile.type)) {
                            fldr = "others"
                        }
                        if (!fldr) {
                            try {
                                await fs.unlink(sampleFile.path);
                            } catch (err) { }
                            return Helper.SendErr(res, 400, `Invalid File type - ${sampleFile.type}`);
                        }

                        const asset = Helper.GetUid();
                        const filPth = sampleFile.path.split(`${uploadDir}/`);

                        const item = { asset, name: sampleFile.name, mime: sampleFile.type, path: filPth[1], folder: fldr };
                        item.createdAt = Date.now();
                        item.updatedAt = Date.now();
                        item.createdBy = fireUser.uid || -1;
                        item.updatedBy = fireUser.uid || -1;

                        PibizHelper.GetCollection('assets').insert(item);
                        fileItems[file] = asset;
                        resolve2();
                    })
                )
            });
            await Promise.all(proms);

            const fds = {};
            Object.keys(fields).forEach(field => {
                if (Object.keys(fileItems).length > 0 && (field == 'item' || field == 'query')) {
                    fds[field] = JSON.parse(fields[field]);
                } else {
                    fds[field] = fields[field];
                }
            })

            if (fds.item && Object.keys(fileItems).length > 0) {
                fds.item = { ...fds.item, ...fileItems }
            }

            resolve(fds)
        });
    })
};



exports.AdminLogin = AdminLogin;
exports.AdminExec = AdminExec;
exports.AdminAsset = AdminAsset;


exports.Login = Login;
exports.Exec = Exec;
exports.Asset = Asset;

exports.GetApiKey = GetApiKey;
exports.GetIdToken = GetIdToken;
exports.GetParams = GetParams;