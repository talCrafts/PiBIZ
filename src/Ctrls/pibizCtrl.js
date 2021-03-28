const DataStore = require('../DataStores/DataStore');

//______________________________________  Get Access Groups
exports.getAccessGroups = async () => {
    const grps = DataStore.getCollection('groups').find().map(function (obj) {
        return obj.name;
    });

    grps.splice(0, 0, 'public');
    return grps;
};

//______________________________________  Get Account Groups
exports.getAccountGroups = async () => {
    const grps = DataStore.getCollection('groups').find().map(function (obj) {
        return obj.name;
    });

    grps.splice(0, 0, 'admin');
    return grps;
};

//______________________________________  Get Exec Actions
exports.getActions = async () => {
    return ['find', 'findOne', 'create', 'update', 'remove', 'count'];
};

//______________________________________  Get Access Actions
exports.getAccessActions = async () => {
    return ['deny', 'own', 'group', 'allow'];
};

//______________________________________  Get FieldTypes
exports.getFieldTypes = async () => {
    return [
        'array', 'boolean', 'radio', 'collection', 'select', 'date',
        'file', 'object', 'text', 'password', 'textarea', 'time'
    ];
};


//______________________________________  Get ListView
exports.getListView = async ({ identity }, isAccess, fireUser) => {
    let columns = ['_id'];
    let Collection = DataStore.getCollection("collections").findOne({ identity });
    (Collection.fields || []).forEach(field => {
        if (field.unique === true || field.indexed === true) {
            columns.push(field.name);
        }
    });

    return columns;
};


//______________________________________  Get FormView create/udate
exports.getFormView = async ({ identity, _id }, isAccess, fireUser) => {
    let Collection = DataStore.getCollection("collections").findOne({ identity });
    const formFields = [];

    (Collection.fields || []).forEach(field => {
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