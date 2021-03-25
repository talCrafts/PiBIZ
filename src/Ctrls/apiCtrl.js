const DB = require("../Libs/db");
const ApiKrud = require('../Libs/ApiKrud');

const Helper = require('../Utils/helper');

const jModelAccess = require("../JModels/access");
const jModelAccounts = require("../JModels/accounts");
const jModelAssets = require("../JModels/assets");
const jModelCollections = require("../JModels/collections");
const jModelApikeys = require("../JModels/apikeys");
const jModelGroups = require("../JModels/groups");



//DB MIGRATIONS
Migrate();

async function Migrate() {
    let Collections = DB.getCollection('collections');
    if (Collections) {
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
        const result = await Func(ctrl, params, fireUser);
        return result;
    }

    return Helper.ThrowErr('No Access L1');
};