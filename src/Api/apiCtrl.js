const DB = require("../Libs/db");
const ApiKrud = require('./apiKrud');

const Helper = require('../Utils/helper');

const jModelAccess = require("../Admin/Models/access");
const jModelAccounts = require("../Admin/Models/accounts");
const jModelAssets = require("../Admin/Models/assets");
const jModelCollections = require("../Admin/Models/collections");
const jModelApikeys = require("../Admin/Models/apikeys");
const jModelGroups = require("../Admin/Models/groups");



//DB MIGRATIONS
Migrate();

async function Migrate() {
    let Collections = DB.getCollection('collections');
    if (Collections) {
        // Collections.chain().find({ identity: "apikeys" }).remove();
        //Collections.insert(jModelApikeys);
        DB.setCollections();
    } else {
        //Step-1
        DB.setCollection(jModelCollections, true);

        //Step-2
        Collections = DB.getCollection('collections');
        Collections.insert(jModelCollections);
        Collections.insert(jModelAccess);
        Collections.insert(jModelAccounts);
        Collections.insert(jModelAssets);
        Collections.insert(jModelApikeys);
        Collections.insert(jModelGroups);

        //Step-3
        DB.setCollections();

        //______________----____________________________ Admin Account Setup
        let Accounts = DB.getCollection('accounts');

        const isAdmin = Accounts.findOne({ username: 'admin' });
        console.log("isAdminExists", !!isAdmin);

        if (!isAdmin) {
            const item = {
                username: 'admin',
                password: await Helper.HashPassword('s152207'),
                group: 'admin',
                displayName: 'The Owner2',
                params: {},
                status: 'on'
            }

            Accounts.insert(item);
            console.log("newAdmin");
        }
    }
}


exports.Exec = async ({ ctrl, action, params = {}, fireUser }) => {
    let Func = ApiKrud[`${action}`];
    if (Func) {
        let Access = DB.getCollection('access');
        const isAccess = Access.findOne({ cag: `${ctrl}_${action}_${fireUser ? fireUser.group : 'public'}` });
        if (isAccess && isAccess._id && isAccess.access != 'deny') {
            const result = await Func(ctrl, params, isAccess, fireUser);
            return result;
        }
    }

    return Helper.ThrowErr('No Access L1');
};