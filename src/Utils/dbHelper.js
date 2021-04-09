const Validator = require('validatorjs');

const DataStore = require('../DataStores/DataStore');
const _ = require("./lowDash");

Validator.register('object', function (value) {
    return (typeof value == 'object' && !Array.isArray(value));
}, 'The :attribute is not an object');


const MetaFields = {
    $loki: 'numeric',
    _id: 'numeric',
    createdAt: 'numeric',
    updatedAt: 'numeric',
    createdBy: 'numeric',
    updatedBy: 'numeric'
}


const checkQry = (query, identity) => {
    let jModel = DataStore.getJModel(identity);

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
    const grpUsers = DataStore.getCollection('accounts').find({ group: fireUser.group })
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


exports.checkQry = checkQry;
exports.getOwnQry = getOwnQry;
exports.getGroupQry = getGroupQry;

exports.transForm = transForm;
exports.parseItem = parseItem;
exports.validate = validate;
