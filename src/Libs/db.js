const loki = require("lokijs");
const lfsa = require('lokijs/src/loki-fs-structured-adapter.js');

var db;


//_________Init  Db
function initDb(callback) {
    if (db) {
        console.warn("Trying to init DB again!");
        return callback(null, db);
    }

    db = new loki('_STORAGE/DB/pibiz.db', {
        adapter: new lfsa(),
        autoload: true,
        autosave: true,
        autoloadCallback: onConnected
    });


    function onConnected() {
        return callback(null, db);
    }
}

//_________Get  Db
function getDb() {
    return db;
}

//_________Get Collection
function getCollection(identity) {
    return db.getCollection(`${identity}`);
}


//_________Remove Collection
function removeCollection(identity) {
    return db.removeCollection(`${identity}`);
}


//_________Set  Collection
function setCollection(jModel, transForm = true) {
    if (transForm == true) {
        jModel = getDbSchema(jModel);
    }

    const { identity, unique = [], indices = [], ttl = false } = jModel;

    const _OPTS = { disableMeta: true, unique, indices };
    if (ttl && Number(ttl) && Number(ttl) > 500) {
        _OPTS.ttl = Number(ttl);
    }
    const Collection = db.addCollection(`${identity}`, _OPTS);
    Collection.ensureAllIndexes(true);
    _OPTS.unique.forEach(uFld => Collection.ensureUniqueIndex(uFld));

    Collection.on('insert', doc => doc._id = `u${doc.$loki}`);
}

//_________ Set Collections
function setCollections() {
    let Collections = getCollection('collections');
    const jModels = Collections.find();
    jModels.forEach(jModel => {
        setCollection(jModel, true);
    });
}


function getDbSchema(jM) {
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



module.exports = {
    initDb,
    getDb,
    getDbSchema,
    getCollection,
    removeCollection,
    setCollection,
    setCollections
};