const cryptoLib = require('crypto');
/*
______________________________________  ENV */
const DB_ENC_KEY = process.env.DB_ENC_KEY;

const CKEY = cryptoLib.createSecretKey(Buffer.from(DB_ENC_KEY));

// Hash Password
const HashPassword = (password) => {
    const nonce = cryptoLib.randomBytes(16);
    let hash = cryptoLib.pbkdf2Sync(password, nonce, 1000, 32, `sha1`).toString(`base64`);
    return `${nonce.toString('hex')}:${hash}`;
}

// Check Password
const CheckPassword = (password, hash) => {
    let textParts = hash.split(':');
    const nonce = Buffer.from(textParts.shift(), 'hex');
    let hash2 = cryptoLib.pbkdf2Sync(password, nonce, 1000, 32, `sha1`).toString(`base64`);
    return textParts.join(':') == hash2;
}

const Encrypt = (message) => {
    const nonce = cryptoLib.randomBytes(16);
    const cipher = cryptoLib.createCipheriv('aes-128-ofb', CKEY, nonce);
    const ciphertext = cipher.update(message, 'utf8', 'base64') + cipher.final('base64');
    return `${nonce.toString('hex')}:${ciphertext}`;
}

const Decrypt = (ciphertext) => {
    let textParts = ciphertext.split(':');
    const nonce = Buffer.from(textParts.shift(), 'hex');
    const decipher = cryptoLib.createDecipheriv('aes-128-ofb', CKEY, nonce);
    const decrypted = decipher.update(textParts.join(':'), 'base64', 'utf8') + decipher.final('utf8');
    return decrypted;
}

exports.HashPassword = HashPassword;
exports.CheckPassword = CheckPassword;

exports.Encrypt = Encrypt;
exports.Decrypt = Decrypt;


