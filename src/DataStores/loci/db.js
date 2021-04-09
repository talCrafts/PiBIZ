const loki = require("lokijs");
const lfsca = require('./loki-fs-structured-cipher-adapter');

const jModels = require("../../JModels/index");
const CryptoHelper = require('../../Utils/cryptoHelper');

var db;


const GetDbSchema = (jM) => {
    const unique = [], indices = [];
    const identity = jM.identity;

    (jM.fields || []).forEach(field => {
        if (field.unique === true) {
            unique.push(field.name);
        } else if (field.indexed === true) {
            indices.push(field.name);
        }
    });

    return { identity, unique, indices };
}




//_________Init  Db
const initDb = () => {
    return new Promise((resolve, reject) => {
        if (db) {
            console.log("trying initiaing DB again...")
            return resolve(db);
        }

        try {
            db = new loki('_STORAGE/DB/pibiz.db', {
                adapter: new lfsca(),
                autoload: true,
                autosave: true,
                autoloadCallback: onConnected
            });
        } catch (error) {
            reject(error)
        }

        function onConnected() {

            for (const jModel in jModels) {
                setCollection(jModels[jModel], true);
            }

            //______________----____________________________ Admin Account Setup
            let Accounts = getCollection('accounts');
            const isAdmin = Accounts.findOne({ username: 'admin@pibiz.local' });
            console.log("isAdminExists", !!isAdmin);

            if (!isAdmin) {
                const item = {
                    username: 'admin@pibiz.local',
                    password: CryptoHelper.HashPassword('s152207'),
                    group: 'admin',
                    displayName: 'The Owner2',
                    status: 'on'
                }

                Accounts.insert(item);
                console.log("newAdmin");
            }
            resolve(db);
        }
    })
}

//_________Get  Db
const getDb = () => {
    return db;
}



const getCollection = (identity) => getDb().getCollection(`${identity}`);

const setCollection = (jModel, transForm = true) => {
    if (transForm == true) {
        jModel = GetDbSchema(jModel);
    }

    const { identity, unique = [], indices = [], ttl = false } = jModel;

    const _OPTS = { disableMeta: true, unique, indices };
    if (ttl && Number(ttl) && Number(ttl) > 999) {
        _OPTS.ttl = Number(ttl);
    }
    const Collection = getDb().addCollection(`${identity}`, _OPTS);
    Collection.ensureAllIndexes(true);
    _OPTS.unique.forEach(uFld => Collection.ensureUniqueIndex(uFld));

    Collection.on('insert', doc => doc._id = `u${doc.$loki}`);
    return Collection;
}

const getJModel = (identity) => {
    return jModels[identity];
}

const getJModels = () => {
    return jModels;
}



exports.initDb = initDb;
exports.getDb = getDb;

exports.getCollection = getCollection;
exports.setCollection = setCollection;

exports.getJModel = getJModel;
exports.getJModels = getJModels;