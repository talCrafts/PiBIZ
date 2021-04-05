const url = require('url');
const formidable = require('formidable');
const path = require('path');
const fse = require('fs-extra')
const { nanoid } = require('nanoid/non-secure');

const DataStore = require('../DataStores/DataStore');

const GetUid = () => nanoid();
const DelayRes = (ms = 500) => new Promise(resolve => setTimeout(resolve, ms));

const SendErr = (res, status = 500, message = 'Unexpected server error1') => {
    res.setHeader('X-Powered-By', 'PiBIZ');
    res.writeHead(status, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ status, message }))
}

const SendRes = (res, result, status = 200) => {
    res.setHeader('X-Powered-By', 'PiBIZ');
    res.writeHead(status, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ result }))
}

// Get API Key from request
const GetApiKey = (req) => {
    const query = url.parse(req.url, true).query;
    const headers = req.headers;

    let apiKey;
    if (headers['apikey']) {
        apiKey = headers['apikey'];
    } else if (query['apikey']) {
        apiKey = query['apikey'];
    }
    return apiKey;
};

// Get Auth TokenId from request
const GetIdToken = (req) => {
    const query = url.parse(req.url, true).query;
    const headers = req.headers;

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


/**
 * 
 * -------------------------------- POST PARAMS
 * 
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

const uploadDir = path.join(__dirname, `../../_STORAGE/UPLOADS`);




// Get POST Data (including multipart) from request
const GetParams = (req, res, fireUser = {}) => {
    return new Promise(async (resolve) => {
        const form = formidable({ keepExtensions: true, uploadDir });
        form.parse(req, async (err, fields = {}, files = {}) => {
            if (err) {
                return SendErr(res, 400, err.message);
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
                                await fse.remove(sampleFile.path);
                            } catch (err) { }

                            return SendErr(res, 400, `Invalid File type - ${sampleFile.type}`);
                        }

                        const asset = GetUid();
                        const filPth = sampleFile.path.split(`${uploadDir}/`);

                        const item = { asset, name: sampleFile.name, mime: sampleFile.type, path: filPth[1], folder: fldr };
                        item.createdAt = Date.now();
                        item.updatedAt = Date.now();
                        item.createdBy = fireUser.uid || -1;
                        item.updatedBy = fireUser.uid || -1;

                        DataStore.getCollection('assets').insert(item);
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

exports.SendErr = SendErr;
exports.SendRes = SendRes;

exports.GetApiKey = GetApiKey;
exports.GetIdToken = GetIdToken;
exports.GetParams = GetParams;

exports.GetUid = GetUid;
exports.DelayRes = DelayRes;