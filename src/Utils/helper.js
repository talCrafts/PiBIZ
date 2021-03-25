const url = require('url');
const { nanoid } = require('nanoid/non-secure');
const { CryptographyKey, SodiumPlus } = require('sodium-plus');
/*
______________________________________  ENV */
const DB_ENC_KEY = process.env.DB_ENC_KEY;


var sodiumIns;

// Get Sodium
const GetSodium = async () => {
    if (!sodiumIns) sodiumIns = await SodiumPlus.auto();
    return sodiumIns;
}

// Get Sodium CKey
const GetCKey = () => {
    return new CryptographyKey(Buffer.from(DB_ENC_KEY));
}

// Hash Password
const HashPassword = async (password) => {
    let sodium = await GetSodium();
    let hash = await sodium.crypto_pwhash_str(
        password,
        sodium.CRYPTO_PWHASH_OPSLIMIT_INTERACTIVE,
        sodium.CRYPTO_PWHASH_MEMLIMIT_INTERACTIVE
    );
    return hash;
}

// Check Password
const CheckPassword = async (password, hash) => {
    let sodium = await GetSodium();
    const isValid = await sodium.crypto_pwhash_str_verify(password, hash);
    return isValid;
}

const GetUid = () => {
    return nanoid();
}



const DelayRes = (ms = 500) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}


const ThrowErr = (message = 'Not Found') => {
    const Err = Error(message);
    Err.name = 'pibizError';
    throw Err;
}

const SendErr = (res, status = 500, message = 'Unexpected server error1') => {
    res.writeHead(status, { 'X-Powered-By': 'PiBIZ' });
    return res.end(`${message}`);
    //res.statusCode = status;
    //res.setHeader('Content-Type', 'application/json');
    //res.setHeader('X-Powered-By', 'PiBIZ');
    //return res.end(JSON.stringify({ status, message }))
}

const SendRes = (res, result, status = 200) => {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('X-Powered-By', 'PiBIZ');
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
    } else if (query['authKey']) {
        idToken = query['authKey'];
    }
    return idToken;
};



exports.HashPassword = HashPassword;
exports.CheckPassword = CheckPassword;

exports.GetUid = GetUid;

exports.DelayRes = DelayRes;

exports.ThrowErr = ThrowErr;
exports.SendErr = SendErr;
exports.SendRes = SendRes;

exports.GetApiKey = GetApiKey;
exports.GetIdToken = GetIdToken;
exports.GetSodium = GetSodium;
exports.GetCKey = GetCKey;


