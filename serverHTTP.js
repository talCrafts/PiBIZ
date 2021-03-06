const url = require('url');
const path = require('path');
const fs = require('fs');
const AdmZip = require('adm-zip');

const ADMIN_API_KEY = process.env.ADMIN_API_KEY;


module.exports.attach = (scServer) => {
    const DataStore = require('./src/DataStores/DataStore');
    const HttpHelper = require('./src/Utils/httpHelper');
    const ApiCtrl = require('./src/Ctrls/index');

    let httpServer = scServer.httpServer;

    (async () => {
        for await (let [req, res] of httpServer.listener('request')) {
            App(req, res);
        }
    })();

    async function App(req, res) {
        const apiKey = HttpHelper.GetApiKey(req);
        if (!apiKey) {
            return HttpHelper.SendErr(res, 401, "Unauthorized API Access");
        }

        let fireUser;
        let idToken = HttpHelper.GetIdToken(req);
        if (idToken) {
            try {
                const decoded = await scServer.auth.verifyToken(idToken, scServer.signatureKey);
                if (decoded) {
                    fireUser = decoded;
                }
            } catch (error) {
                return HttpHelper.SendErr(res, 401, "Unauthorized Access");
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
                    hasKey = DataStore.getCollection('apikeys').findOne({ key: apiKey });
                }
                if (!hasKey || !hasKey._id) {
                    await HttpHelper.DelayRes();
                    throw new Error('No  Access Token Key');
                }


                let params = {};
                if (req.method === 'POST') {
                    params = await HttpHelper.GetParams(req, res, fireUser);
                }

                const endPoint2 = pSplits[2];
                if (endPoint2 === 'login' && req.method === 'POST') {
                    const User = await ApiCtrl.GetLogin({ params, hasKey });
                    const token = await scServer.auth.signToken(
                        { uid: User._id, group: User.group },
                        scServer.signatureKey,
                        { expiresIn: "12h" }
                    );
                    return HttpHelper.SendRes(res, token, 201);

                } else if (endPoint2 === 'exec' && req.method === 'POST') {
                    const ctrl = pSplits[3];
                    const action = pSplits[4];
                    const result = await ApiCtrl.GetExec({ ctrl, action, params, fireUser, hasKey });
                    return HttpHelper.SendRes(res, result);

                } else if (endPoint2 === 'asset' && req.method === 'GET') {
                    if (!fireUser || !fireUser.group) {
                        await HttpHelper.DelayRes();
                        throw new Error('Invalid  OPAccess A2');
                    }

                    const asset = pSplits[3];

                    if (asset === 'backup' && fireUser.group === 'admin') {
                        const StorageDir = path.join(__dirname, `/_STORAGE/`);
                        const bkpDir = fs.readdirSync(StorageDir + 'DB');

                        const zip = new AdmZip();
                        for (let i = 0; i < bkpDir.length; i++) {
                            zip.addLocalFile(StorageDir + 'DB' + '/' + bkpDir[i]);
                        }
                        const data = zip.toBuffer();

                        const noww = new Date();
                        const downloadName = `Y${noww.getFullYear()}-M${noww.getMonth() + 1}-D${noww.getDate()}.zip`;

                        res.setHeader(`Content-Type`, `application/octet-stream`);
                        res.setHeader('X-Powered-By', 'PiBIZ');
                        res.setHeader(`Content-Disposition`, `attachment; filename=${downloadName}`);
                        res.setHeader(`Content-Length`, data.length);
                        return res.end(data);
                    } else {
                        const result = await ApiCtrl.GetAsset(asset);

                        res.setHeader('Content-Type', `${result.mime}`);
                        res.setHeader('X-Powered-By', 'PiBIZ');
                        const filePath = path.join(__dirname, `./_STORAGE/UPLOADS/${result.path}`);
                        const readStream = fs.createReadStream(filePath);
                        return readStream.pipe(res);
                    }
                } else {
                    await HttpHelper.DelayRes();
                    throw new Error('Invalid  OPAccess A3');
                }
            } catch (error) {
                await HttpHelper.DelayRes();
                return HttpHelper.SendErr(res, 401, error.message);
            }
        } else {
            return HttpHelper.SendErr(res, 404, "Not Found");
        }
    };

};