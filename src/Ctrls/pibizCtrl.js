const DataStore = require('../DataStores/DataStore');
const _ = require("../Utils/lowDash");

//______________________________________  Get Access Groups
exports.getAccessGroups = () => {
    const grps = DataStore.getCollection('groups').find().map(function (obj) {
        return obj.name;
    });

    grps.splice(0, 0, 'public');
    return grps;
};

//______________________________________  Get Account Groups
exports.getAccountGroups = () => {
    const grps = DataStore.getCollection('groups').find().map(function (obj) {
        return obj.name;
    });

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

//______________________________________  Get JModel
exports.getJModel = ({ identity, pick = [] }) => {
    let jModel = DataStore.getJModel(identity);
    if (_.size(pick)) {
        jModel = _.pick(jModel, [...pick, 'identity']);
    }
    return jModel;
}

//______________________________________  Get ALL JModels
exports.getJModels = ({ kind, pick = [] }) => {
    const jModels = DataStore.getJModels();
    const arr = [];
    if (kind == 'all') {
        for (const jModelKey in jModels) {
            let jModel = jModels[jModelKey];
            if (_.size(pick)) {
                jModel = _.pick(jModel, [...pick, 'identity']);
            }
            arr.push(jModel);
        }
    } else if (kind == 'core') {
        for (const jModelKey in jModels) {
            let jModel = jModels[jModelKey];
            if (jModel.kind === 'core') {
                if (_.size(pick)) {
                    jModel = _.pick(jModel, [...pick, 'identity']);
                }
                arr.push(jModel);
            }
        }
    } else {
        for (const jModelKey in jModels) {
            let jModel = jModels[jModelKey];
            if (jModel.kind !== 'core') {
                if (_.size(pick)) {
                    jModel = _.pick(jModel, [...pick, 'identity']);
                }
                arr.push(jModel);
            }
        }
    }

    return arr;
}

//______________________________________  Get ListView
exports.getListView = ({ identity }, isAccess, fireUser) => {
    let columns = ['_id'];
    //let Collection = DataStore.getCollection("collections").findOne({ identity });
    let jModel = DataStore.getJModel(identity);
    (jModel.fields || []).forEach(field => {
        if (field.unique === true || field.indexed === true) {
            columns.push(field.name);
        }
    });

    return columns;
};


//______________________________________  Get FormView create/udate
exports.getFormView = ({ identity, _id }, isAccess, fireUser) => {
    //let Collection = DataStore.getCollection("collections").findOne({ identity });
    let jModel = DataStore.getJModel(identity);
    const formFields = [];

    (jModel.fields || []).forEach(field => {
        formFields.push(parseFieldType(field, !_id));
    });

    return formFields;
};


//______________________________________  Parse FieldType
function parseFieldType(field, validation = false) {
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
    } else if (field.fieldType == 'array') {
        if (field.options) {
            attribs['options'] = field.options;
        }
    } else if (field.fieldType == 'checkbox') {
        attribs['type'] = 'checkbox';
        if (field.options) {
            attribs['options'] = field.options;
        }
    } else if (field.fieldType == 'collection') {
        attribs['type'] = 'select';
        if (field.multiple === true) {
            attribs['multiple'] = true;
        }


        let qry = {};
        if (field.query) {
            //qry = JSON.parse(JSON.stringify(field.query));
            qry = field.query;
        }
        attribs['options'] = DataStore.getCollection(field.identity).find(qry)
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