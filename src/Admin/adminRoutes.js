const fs = require('fs');
const path = require('path');

const AdminCtrl = require('./adminCtrl');
const Helper = require('../Utils/helper');
const PibizHelper = require('../Utils/pibizHelper');



// POST /api/admin/login - Admin Login
const login = async (req, res) => {
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
const exec = async (req, res) => {
    try {
        const { action, fireUser, params } = req.ctx;

        try {
            const result = await AdminCtrl[action](params, fireUser);
            return Helper.SendRes(res, result);
        } catch (error) {
            return Helper.SendErr(res, 404, (error.name == 'pibizError' ? error.message : "Not Found"));
        }
    } catch (error) {
        await Helper.DelayRes();
        return Helper.SendErr(res, 400, "Bad Request");
    }
};

// GET /api/admin/asset/:asset - Get Asset 
const asset = async (req, res) => {
    try {
        const { asset } = req.ctx;

        try {
            const result = PibizHelper.GetCollection('assets').findOne({ asset });
            if (result && result.asset && result.path) {
                res.setHeader('Content-Type', `${result.mime}`);
                res.setHeader('X-Powered-By', 'PiBIZ');
                const filePath = path.join(__dirname, `../../_STORAGE/UPLOADS/${result.path}`);

                const readStream = fs.createReadStream(filePath);
                return readStream.pipe(res);
            }
        } catch (error) {
            return Helper.SendErr(res, 404, error.message || "Not Found");
        }
    } catch (error) {
        await Helper.DelayRes();
        return Helper.SendErr(res, 400, "Bad Request");
    }
};



module.exports = {
    login,
    exec,
    asset
}