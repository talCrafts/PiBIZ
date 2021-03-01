const Validator = require('validatorjs');

const DB = require("../Libs/db");
const _ = require("./lowDash");


Validator.register('object', function (value) {
    return (typeof value == 'object' && !Array.isArray(value));
}, 'The :attribute is not an object');



/*
______________________________________  ENV */
const USER_GROUPS = process.env.USER_GROUPS;


const MetaFields = {
    $loki: 'numeric',
    _id: 'numeric',
    createdAt: 'numeric',
    updatedAt: 'numeric',
    createdBy: 'numeric',
    updatedBy: 'numeric'
}




// Get DB Collection Instance
const GetCollection = (identity) => {
    return DB.getCollection(identity);
}


//______________________________________  GetCollection DB
exports.GetCollection = (identity) => {
    return GetCollection(identity);
}


//______________________________________  Get Access Groups
exports.getAccessGroups = () => {
    const grps = USER_GROUPS.split(",");
    grps.splice(0, 0, 'public');
    return grps;
};

//______________________________________  Get Account Groups
exports.getAccountGroups = () => {
    const grps = USER_GROUPS.split(",");
    grps.splice(0, 0, 'admin');
    return grps;
};

//______________________________________  Get Exec Actions
exports.getActions = () => {
    return ['find', 'findOne', 'create', 'update', 'remove', 'count'];
};

//______________________________________  Get Access Actions
exports.getAccessActions = () => {
    return ['deny', 'own', 'group', 'allow'];
};

//______________________________________  Get FieldTypes
exports.getFieldTypes = () => {
    return [
        'array', 'boolean', 'radio', 'collection', 'select', 'date',
        'file', 'object', 'text', 'password', 'textarea', 'time'
    ];
};

//______________________________________  Get JModels
exports.getJModels = (kind = 'core') => {
    let Qry = {}
    if (kind != 'all') {
        Qry.kind = kind;
    }

    let Collections = GetCollection('collections');
    const jModels = Collections.find(Qry);
    return jModels;
};

//______________________________________  Get JModel By Identity
exports.getJModel = (identity) => {
    let Collections = GetCollection('collections');
    const jModel = Collections.findOne({ identity });
    return jModel;
};

//______________________________________  Get Fields By Identity
exports.getFields = (identity) => {
    let Collections = GetCollection('collections');
    const jModel = Collections.findOne({ identity });
    return jModel.fields;
};

//______________________________________  Parse FieldType
exports.parseFieldType = (field, validation = false) => {
    let attribs = { name: field.name, type: 'text' };
    if (validation) {
        if (field.rule && field.rule.includes("required")) {
            attribs['required'] = true;
        }
    }

    if (field.label) {
        attribs['label'] = field.label;
    }

    /*if (field.defaultValue || field.defaultValue === 0 || field.defaultValue === false) {
        attribs['defaultValue'] = field.defaultValue;
    }*/

    if (field.fieldType == 'textarea') {
        attribs['type'] = 'textarea';
    } else if (field.fieldType == 'password') {
        attribs['type'] = 'password';
    } else if (field.fieldType == 'file') {
        attribs['type'] = 'file';
    } else if (field.fieldType == 'date') {
        attribs['type'] = 'date';
    } else if (field.fieldType == 'array' || field.fieldType == 'checkbox') {
        attribs['type'] = 'checkbox';
        if (field.options) {
            attribs['options'] = field.options;
        }
    } else if (field.fieldType == 'collection') {
        attribs['type'] = 'select';
        if (field.multiple === true) {
            attribs['multiple'] = true;
            //attribs['type'] = 'checkbox';
        }


        let qry = {};
        if (field.query) {
            //qry = JSON.parse(JSON.stringify(field.query));
            qry = field.query;
        }
        attribs['options'] = GetCollection(field.identity).find(qry)
            .map(function (obj) {
                return { label: obj[field.displayField], value: obj._id }
            });
    } else if (field.fieldType == 'select') {
        attribs['type'] = 'select';
        if (field.multiple === true) {
            attribs['multiple'] = true;
        }
        if (field.options) {
            attribs['options'] = field.options;
        }
    } else if (field.fieldType == 'boolean' || field.fieldType == 'radio') {
        attribs['type'] = 'radio';
        if (field.options) {
            attribs['options'] = field.options;
        }
    }
    return attribs;
};

//______________________________________  CheckQry for Uniques
exports.checkQry = (query, identity) => {
    let Collections = GetCollection('collections');
    const jModel = Collections.findOne({ identity });

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
    const Err = Error(`Query not valid`);
    Err.name = 'pibizError';
    throw Err;
}

//______________________________________  Get Own Qry
exports.getOwnQry = (query = {}, fireUser) => {
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


//______________________________________  Get Group Qry
exports.getGroupQry = (query = {}, fireUser) => {
    const grpUsers = GetCollection('accounts').find({ group: fireUser.group })
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

//______________________________________  XForm Doc
exports.transForm = (doc, pick = [], omit = []) => {
    if (_.size(pick)) {
        doc = _.pick(doc, [...pick, '_id']);
    }

    doc = _.omit(doc, [...omit, '$loki']);

    return doc;
}

//______________________________________  Parse Item
exports.parseItem = (item) => {
    return _.omit(item, Object.keys(MetaFields));
}

//______________________________________  Validate Data
exports.validate = (data, rules) => {
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
