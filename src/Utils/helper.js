const jwt = require("jsonwebtoken");
const bcrypt = require('bcrypt');
const { nanoid } = require('nanoid/non-secure');

/*
______________________________________  ENV */
const AUTH_SECRET = process.env.AUTH_SECRET;

// Verify Auth Token
const VerifyAuth = (token) => {
    return new Promise((resolve, reject) => {
        jwt.verify(token, AUTH_SECRET, null, (error, decoded) => {
            if (error) {
                return reject(error);
            }
            return resolve(decoded);
        })
    })
}
// Sign Auth Token
const SignAuth = (data) => {
    return new Promise((resolve, reject) => {
        jwt.sign(data, AUTH_SECRET, {
            expiresIn: "12h"
        }, (error, token) => {
            if (error) {
                return reject(error);
            }
            return resolve(token);
        })
    })
}

// Hash Password
const HashPassword = async (password) => {
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    return hash;
}

// Check Password
const CheckPassword = async (password, hash) => {
    const isValid = await bcrypt.compare(password, hash);
    return isValid;
}


const DelayRes = (ms = 500) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const GetUid = () => {
    return nanoid();
}

const ThrowErr = (message = 'Not Found') => {
    const Err = Error(message);
    Err.name = 'pibizError';
    throw Err;
}

const SendErr = (res, status = 500, message = 'Unexpected server error1') => {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('X-Powered-By', 'PiBIZ');
    return res.end(JSON.stringify({ status, message }))
}

const SendRes = (res, result, status = 200) => {
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('X-Powered-By', 'PiBIZ');
    return res.end(JSON.stringify({ result }))
}




exports.VerifyAuth = VerifyAuth;
exports.SignAuth = SignAuth;
exports.HashPassword = HashPassword;
exports.CheckPassword = CheckPassword;


exports.DelayRes = DelayRes;
exports.GetUid = GetUid;

exports.ThrowErr = ThrowErr;
exports.SendErr = SendErr;
exports.SendRes = SendRes;
