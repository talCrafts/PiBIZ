const formidable = require('formidable');
const path = require('path');
const fs = require('fs');


const Helper = require('./Utils/helper');
const PibizHelper = require('./Utils/pibizHelper');


const ApiRoutes = require("./Api/apiRoutes");
const AdminRoutes = require("./Admin/adminRoutes");

/*
______________________________________  ENV */
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;


// POST|GET /api/admin
const execAdminApi = async (req, res) => {
    const { fireUser, apiKey, endPoint3, endPoint4 } = req.ctx;

    if (apiKey != ADMIN_API_KEY) {
        return Helper.ThrowErr('No  Access Token');
    }

    if (endPoint3 === 'login' && req.method === 'POST') {
        return AdminRoutes.login(req, res);
    } else if (endPoint3 === 'exec' && req.method === 'POST') {
        if (!fireUser || fireUser.group != 'admin') {
            return Helper.ThrowErr('Invalid  OPAccess');
        }

        if (endPoint4) {
            req.ctx.action = endPoint4;
            return AdminRoutes.exec(req, res);
        }
    } else if (endPoint3 === 'asset' && req.method === 'GET') {
        if (!fireUser || fireUser.group != 'admin') {
            return Helper.ThrowErr('Invalid  OPAccess');
        }

        if (endPoint4) {
            req.ctx.asset = endPoint4;
            return AdminRoutes.asset(req, res);
        }
    }

    return Helper.ThrowErr('Not Allowed');
};

// POST|GET /api - API 
const execApi = async (req, res) => {
    const { fireUser, apiKey, endPoint2, endPoint3, endPoint4 } = req.ctx;

    const hasKey = PibizHelper.GetCollection('apikeys').findOne({ key: apiKey });
    if (!hasKey || !hasKey._id || apiKey != hasKey.key) {
        return Helper.ThrowErr('No  Access Token');
    }


    if (endPoint2 === 'login' && req.method === 'POST') {
        return ApiRoutes.login(req, res);
    } else if (endPoint2 === 'exec' && req.method === 'POST') {
        if (endPoint3 && endPoint4) {
            if (hasKey.ismaster != 'on' && (hasKey.scope || []).includes(endPoint3) === false) {
                return Helper.ThrowErr('Invalid  Access Scope');
            }
            req.ctx.ctrl = endPoint3;
            req.ctx.action = endPoint4;
            return ApiRoutes.exec(req, res);
        }
    } else if (endPoint2 === 'asset' && req.method === 'GET') {
        if (!fireUser || !fireUser.group) {
            return Helper.ThrowErr('Invalid  OPAccess3');
        }

        if (endPoint3) {
            req.ctx.asset = endPoint3;
            return ApiRoutes.asset(req, res);
        }
    }

    return Helper.ThrowErr('Not Allowed');
};


const GetApiKey = (headers, query) => {
    let apiKey;
    if (headers['apikey']) {
        apiKey = headers['apikey'];
    } else if (query['apikey']) {
        apiKey = query['apikey'];
    }
    return apiKey;
};

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


const GetParams = (req, res, fireUser = {}) => {
    return new Promise(async (resolve) => {
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

                        const asset = await Helper.GetUid();

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





exports.execAdminApi = execAdminApi;
exports.execApi = execApi;


exports.GetApiKey = GetApiKey;
exports.GetIdToken = GetIdToken;
exports.GetParams = GetParams;

