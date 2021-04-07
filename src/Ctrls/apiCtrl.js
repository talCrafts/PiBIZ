const DataStore = require('../DataStores/DataStore');

const CryptoHelper = require('../Utils/cryptoHelper');
const CrudHelper = require('../Utils/crudHelper');



//DB MIGRATIONS
Migrate();

async function Migrate() {
    let Collections = DataStore.getCollection('collections');
    if (Collections) {
        DataStore.setCollections();
    } else {
        const jModelAccess = require("../JModels/access");
        const jModelAccounts = require("../JModels/accounts");
        const jModelAssets = require("../JModels/assets");
        const jModelCollections = require("../JModels/collections");
        const jModelApikeys = require("../JModels/apikeys");
        const jModelGroups = require("../JModels/groups");


        //Step-1
        DataStore.setCollection(jModelCollections, true);

        //Step-2
        Collections = DataStore.getCollection('collections');
        Collections.insert(jModelCollections);
        Collections.insert(jModelAccess);
        Collections.insert(jModelAccounts);
        Collections.insert(jModelAssets);
        Collections.insert(jModelApikeys);
        Collections.insert(jModelGroups);

        //Step-3
        DataStore.setCollections();

        //______________----____________________________ Admin Account Setup
        let Accounts = DataStore.getCollection('accounts');
        const isAdmin = Accounts.findOne({ username: 'admin' });
        console.log("isAdminExists", !!isAdmin);

        if (!isAdmin) {
            const item = {
                username: 'admin',
                password: CryptoHelper.HashPassword('s152207'),
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


exports.Exec = async ({ ctrl, action, params = {}, isAccess, fireUser }) => {
    let Func = CrudHelper[`${action}`];
    if (Func) {
        const result = await Func(ctrl, params, isAccess, fireUser);
        return result;
    }

    throw new Error('No Access L1');
};