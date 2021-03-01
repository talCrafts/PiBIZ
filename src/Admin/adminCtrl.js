const PibizHelper = require('../Utils/pibizHelper');
const Krud = require('../Libs/Krud');




//______________________________________  Get Fields By Identity
exports.getFields = async ({ identity }, fireUser) => {
    return PibizHelper.getFields(identity);
};


//______________________________________  Get Access Groups
exports.getAccessGroups = async () => {
    return PibizHelper.getAccessGroups();
};

//______________________________________  Get Account Groups
exports.getAccountGroups = async () => {
    return PibizHelper.getAccountGroups();
};

//______________________________________  Get Exec Actions
exports.getActions = async () => {
    return PibizHelper.getActions();
};

//______________________________________  Get Access Actions
exports.getAccessActions = async () => {
    return PibizHelper.getAccessActions();
};

//______________________________________  Get FieldTypes
exports.getFieldTypes = async () => {
    return PibizHelper.getFieldTypes();
};


//______________________________________  Get ListView
exports.getListView = async ({ identity }, fireUser) => {
    let columns = ['_id'];
    let Flds = PibizHelper.getFields(identity);

    (Flds || []).forEach(field => {
        if (field.unique === true || field.indexed === true) {
            columns.push(field.name);
        }
    });

    return columns;
};


//______________________________________  Get FormView create/udate
exports.getFormView = async ({ identity, _id }, fireUser) => {
    let Flds = PibizHelper.getFields(identity);
    const formFields = [];

    (Flds || []).forEach(field => {
        formFields.push(PibizHelper.parseFieldType(field, !_id));
    });

    return formFields;
};

//______________________________________  Find Entries By Identity
exports.findEntries = async ({ identity, ...params }, fireUser) => {
    const result = await Krud.find(identity, params, fireUser);
    return result;
};

//______________________________________  Find Entry By Identity
exports.findEntry = async ({ identity, ...params }, fireUser) => {
    PibizHelper.checkQry(params.query, identity);

    const result = await Krud.findOne(identity, params, fireUser);
    return result;
};

//______________________________________  Create Entry By Identity
exports.createEntry = async ({ identity, ...params }, fireUser) => {
    const result = await Krud.create(identity, params, fireUser);
    return result;
};


//______________________________________  Update Entry
exports.updateEntry = async ({ identity, ...params }, fireUser) => {
    PibizHelper.checkQry(params.query, identity);

    const result = await Krud.update(identity, params, fireUser);
    return result;
};

//______________________________________  Remove Entry
exports.removeEntry = async ({ identity, ...params }, fireUser) => {
    PibizHelper.checkQry(params.query, identity);

    const result = await Krud.remove(identity, params, fireUser);
    return result;
};