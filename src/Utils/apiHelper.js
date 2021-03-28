const DataStore = require('../DataStores/DataStore');
const CryptoHelper = require('./cryptoHelper');

const ApiCtrl = require('../Ctrls/apiCtrl');
const PibizCtrl = require('../Ctrls/pibizCtrl');

//Account Login
async function GetLogin({ params, hasKey }) {
    const { username, password } = params;
    let query = { username, status: 'on' };
    if (hasKey._id === 'admin') {
        query.group = 'admin';
    } else {
        query.group = { '$ne': 'admin' };
    }

    const User = DataStore.getCollection("accounts").findOne(query);
    if (User && User._id) {
        const isPwdOk = await CryptoHelper.CheckPassword(password, User.password);
        if (isPwdOk) {
            return User;
        }
    }
    throw new Error('Invalid  username or password');
};

// API Exec
async function GetExec({ action, ctrl, params, fireUser, hasKey }) {
    let result;
    if (fireUser && fireUser.group === 'admin' && hasKey._id === 'admin') {
        const isAccess = 'admin';
        if (ctrl === 'pibiz') {
            result = await PibizCtrl[action](params, isAccess, fireUser);
        } else {
            result = await ApiCtrl.Exec({ ctrl, action, params, isAccess, fireUser });
        }
    } else {
        if (hasKey.ismaster === 'on' || (hasKey.scope || []).includes(`${ctrl}`) === true) {
            const qry = { cag: `${ctrl}_${action}_${fireUser ? fireUser.group : 'public'}` };
            const isAccess = DataStore.getCollection('access').findOne(qry);
            if (isAccess && isAccess.access != 'deny') {
                result = await ApiCtrl.Exec({ ctrl, action, params, isAccess, fireUser });
            } else {
                throw new Error('Unauthorized Access');
            }
        } else {
            throw new Error('Unauthorized Scope Access');
        }
    }
    return result;
};

//Get Asset 
async function GetAsset(asset) {
    const result = DataStore.getCollection('assets').findOne({ asset });
    if (result && result.asset && result.path) {
        return result;
    }
    throw new Error('Not Found');
};

exports.GetLogin = GetLogin;
exports.GetExec = GetExec;
exports.GetAsset = GetAsset;