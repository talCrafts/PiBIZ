const { CryptographyKey, SodiumPlus } = require('sodium-plus');
/*
______________________________________  ENV */
const DB_ENC_KEY = process.env.DB_ENC_KEY;


var sodiumIns;

(async () => {
    if (!sodiumIns) sodiumIns = await SodiumPlus.auto();
})();

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


exports.GetSodium = GetSodium;
exports.GetCKey = GetCKey;

exports.HashPassword = HashPassword;
exports.CheckPassword = CheckPassword;

