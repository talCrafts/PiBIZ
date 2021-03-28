const Validator = require('validatorjs');
const loki = require("lokijs");

const lfsca = require('./loki-fs-structured-cipher-adapter');
const _ = require("../../Utils/lowDash");

Validator.register('object', function (value) {
    return (typeof value == 'object' && !Array.isArray(value));
}, 'The :attribute is not an object');


var db;
const MetaFields = {
    $loki: 'numeric',
    _id: 'numeric',
    createdAt: 'numeric',
    updatedAt: 'numeric',
    createdBy: 'numeric',
    updatedBy: 'numeric'
}


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
                autoloadCallback: () => resolve(db)
            });
        } catch (error) {
            reject(error)
        }
    })
}

//_________Get  Db
const getDb = () => {
    return db;
}



const getCollection = (identity) => getDb().getCollection(`${identity}`);
const removeCollection = (identity) => getDb().removeCollection(`${identity}`);

const setCollection = (jModel, transForm = true) => {
    if (transForm == true) {
        jModel = GetDbSchema(jModel);
    }

    const { identity, unique = [], indices = [], ttl = false } = jModel;

    const _OPTS = { disableMeta: true, unique, indices };
    if (ttl && Number(ttl) && Number(ttl) > 500) {
        _OPTS.ttl = Number(ttl);
    }
    const Collection = getDb().addCollection(`${identity}`, _OPTS);
    Collection.ensureAllIndexes(true);
    _OPTS.unique.forEach(uFld => Collection.ensureUniqueIndex(uFld));

    Collection.on('insert', doc => doc._id = `u${doc.$loki}`);
}

const setCollections = () => {
    let jModels = getCollection('collections').find();
    jModels.forEach(jModel => setCollection(jModel, true));
}

const checkQry = (query, identity) => {
    let jModel = getCollection('collections').findOne({ identity });

    const unique = ['_id'];
    (jModel.fields || []).forEach(field => {
        if (field.unique === true) {
            unique.push(field.name);
        }
    });

    const Qry = _.pick(query, unique);
    if (_.size(Qry)) {
        return Qry;
    }
    throw new Error(`Query not valid`);
}

const getOwnQry = (query = {}, fireUser) => {
    return {
        '$and': [{
            '$or': [
                { 'createdBy': fireUser.uid },
                { 'updatedBy': fireUser.uid }
            ],
            ...query
        }]
    };
}

const getGroupQry = (query = {}, fireUser) => {
    const grpUsers = getCollection('accounts').find({ group: fireUser.group })
        .map(function (obj) {
            return obj._id;
        });

    return {
        '$and': [{
            '$or': [
                { 'createdBy': { '$in': grpUsers } },
                { 'updatedBy': { '$in': grpUsers } }
            ],
            ...query
        }]
    };
}

const transForm = (doc, pick = [], omit = []) => {
    if (_.size(pick)) {
        doc = _.pick(doc, [...pick, '_id']);
    }
    doc = _.omit(doc, [...omit, '$loki']);
    return doc;
}

const parseItem = (item) => {
    return _.omit(item, Object.keys(MetaFields));
}

const validate = (data, rules) => {
    let validation = new Validator(data, rules);
    if (validation.passes()) {
        return true;
    }

    try {
        const allErrs = validation.errors.all();
        const ks = Object.keys(allErrs);
        const error = allErrs[ks[0]][0];
        //console.log('#validation errors =', ks[0], error);

        return { error };
    } catch (error) {
        console.log('#validation errors =', error.message);
    }

    return false;
}


exports.initDb = initDb;
exports.getDb = getDb;

exports.getCollection = getCollection;
exports.removeCollection = removeCollection;
exports.setCollection = setCollection;
exports.setCollections = setCollections;


exports.checkQry = checkQry;
exports.getOwnQry = getOwnQry;
exports.getGroupQry = getGroupQry;

exports.transForm = transForm;
exports.parseItem = parseItem;
exports.validate = validate;
