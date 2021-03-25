const url = require('url');
const formidable = require('formidable');
const path = require('path');
const fs = require('fs');

/*
______________________________________  ENV */
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;

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

const uploadDir = path.join(__dirname, `./_STORAGE/UPLOADS`);


module.exports.attach = (scServer) => {

    const ApiCtrl = require('./src/Ctrls/apiCtrl');
    const PibizCtrl = require('./src/Ctrls/pibizCtrl');

    const Helper = require('./src/Utils/helper');
    const PibizHelper = require('./src/Utils/pibizHelper');

    let httpServer = scServer.httpServer;

    // HTTP request handling loop.
    (async () => {
        for await (let requestData of httpServer.listener('request')) {
            App.apply(null, requestData);
        }
    })();

    async function App(req, res) {
        const apiKey = Helper.GetApiKey(req);
        if (!apiKey) {
            return Helper.SendErr(res, 401, "Unauthorized API Access");
        }

        let fireUser;
        let idToken = Helper.GetIdToken(req);
        if (idToken) {
            try {
                const decoded = await scServer.auth.verifyToken(idToken, scServer.signatureKey);
                if (decoded) {
                    fireUser = decoded;
                }
            } catch (error) {
                Helper.SendErr(res, 401, "Unauthorized Access");
            }
        }

        const reqUrl = url.parse(req.url, true);
        const pSplits = reqUrl.pathname.split("/", 5);

        //-> /api
        const endPoint1 = pSplits[1];
        if (endPoint1 === 'api' && (req.method === 'POST' || req.method === 'GET')) {
            try {
                let hasKey;
                if (apiKey === ADMIN_API_KEY) {
                    hasKey = { _id: 'admin', ismaster: 'on', key: apiKey };
                } else {
                    hasKey = PibizHelper.GetCollection('apikeys').findOne({ key: apiKey });
                }
                if (!hasKey || !hasKey._id) {
                    await Helper.DelayRes();
                    return Helper.ThrowErr('No  Access Token Key');
                }


                let params = {};
                if (req.method === 'POST') {
                    params = await GetParams(req, res, fireUser);
                }
                //->  /[login|exec|asset]
                const endPoint2 = pSplits[2];
                if (endPoint2 === 'login' && req.method === 'POST') {
                    req.ctx = { params, hasKey };
                    await Login(req, res);
                    return;
                } else if (endPoint2 === 'exec' && req.method === 'POST') {
                    const ctrl = pSplits[3];
                    const action = pSplits[4];
                    req.ctx = { ctrl, action, fireUser, params, hasKey };
                    await Exec(req, res);
                    return;
                } else if (endPoint2 === 'asset' && req.method === 'GET') {
                    if (!fireUser || !fireUser.group) {
                        await Helper.DelayRes();
                        return Helper.ThrowErr('Invalid  OPAccess A2');
                    }

                    const asset = pSplits[3];
                    req.ctx = { asset };

                    await Asset(req, res);
                    return;
                }

            } catch (error) {
                return Helper.SendErr(res, 401, (error.name == 'pibizError' ? error.message : "Not Allowed"));
            }
        } else {
            return Helper.SendErr(res, 404, "Not Found");
        }

    };


    // POST /api/login - Account Login
    async function Login(req, res) {
        const { username, password } = req.ctx.params;
        const hasKey = req.ctx.hasKey;

        let Qry = { username, status: 'on' };
        if (hasKey._id === 'admin') {
            Qry.group = 'admin';
        } else {
            Qry.group = { '$ne': 'admin' };
        }

        const Accounts = PibizHelper.GetCollection("accounts");
        const User = Accounts.findOne(Qry);
        if (User && User._id) {
            const isPwdOk = await Helper.CheckPassword(password, User.password);
            if (isPwdOk) {
                const token = await scServer.auth.signToken({ uid: User._id, group: User.group }, scServer.signatureKey, { expiresIn: "12h" });
                return Helper.SendRes(res, token, 201);
            }
        }

        await Helper.DelayRes();
        return Helper.SendErr(res, 400, 'Invalid  username or password');
    };

    // POST /api/exec/:ctrl/:action - API Provider
    async function Exec(req, res) {
        const { action, ctrl, fireUser, params, hasKey } = req.ctx;

        try {
            let result;
            if (fireUser && fireUser.group === 'admin' && hasKey._id === 'admin') {
                if (ctrl === 'pibiz') {
                    result = await PibizCtrl[action]({ ...params, isAccess: 'admin' }, fireUser);
                } else {
                    result = await ApiCtrl.Exec({ ctrl, action, params: { ...params, isAccess: 'admin' }, fireUser });
                }
            } else {
                if (hasKey.ismaster === 'on' || (hasKey.scope || []).includes(`${ctrl}`) === true) {
                    const isAccess = PibizHelper.GetCollection('access')
                        .findOne({ cag: `${ctrl}_${action}_${fireUser ? fireUser.group : 'public'}` });
                    if (isAccess && isAccess.access != 'deny') {
                        result = await ApiCtrl.Exec({ ctrl, action, params: { ...params, isAccess }, fireUser });
                    } else {
                        return Helper.ThrowErr('Unauthorized Access');
                    }
                } else {
                    return Helper.ThrowErr('Unauthorized Scope Access');
                }
            }
            return Helper.SendRes(res, result);
        } catch (error) {
            return Helper.SendErr(res, 404, (error.name == 'pibizError' ? error.message : "Not Found"));
        }
    };

    // GET /api/asset/:asset - Get Asset 
    async function Asset(req, res) {
        const { asset } = req.ctx;

        try {
            const result = PibizHelper.GetCollection('assets').findOne({ asset });
            if (result && result.asset && result.path) {
                res.setHeader('Content-Type', `${result.mime}`);
                res.setHeader('X-Powered-By', 'PiBIZ');
                const filePath = path.join(__dirname, `./_STORAGE/UPLOADS/${result.path}`);

                const readStream = fs.createReadStream(filePath);
                return readStream.pipe(res);
            } else {
                return Helper.SendErr(res, 400, "Not Found");
            }
        } catch (error) {
            return Helper.SendErr(res, 404, error.message || "Not Found");
        }
    };


    // Get POST Data from request
    function GetParams(req, res, fireUser = {}) {
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

};