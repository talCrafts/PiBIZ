const Acts = ['find', 'findOne', 'create', 'update', 'remove', 'count'];
const AccActs = ['deny', 'own', 'group', 'allow'];
const AccMode = ['pick', 'omit'];

const jModel = {
    identity: "access",
    kind: 'core',
    stamped: true,
    ttl: false, // int - age of document (in ms.)
    fields: [{
        name: 'cag',
        rule: 'string|required',
        unique: true
    }, {
        name: 'collection',
        rule: 'string|required',
        indexed: true
    }, {
        name: 'action',
        rule: `string|required|in:${Acts.join()}`,
        fieldType: 'select',
        options: Acts.map(obj => ({ label: `${obj}`, value: `${obj}` })),
        indexed: true
    }, {
        name: 'group',
        rule: `string|required|not_in:admin`,
        fieldType: 'select',
        indexed: true
    }, {
        name: 'access',
        rule: `string|in:${AccActs.join()}`,
        fieldType: 'select',
        options: AccActs.map(obj => ({ label: `${obj}`, value: `${obj}` }))
    }, {
        name: 'mode',
        rule: `string|in:${AccMode.join()}`,
        fieldType: 'select',
        options: AccMode.map(obj => ({ label: `${obj}`, value: `${obj}` }))
    }, {
        name: 'fields',
        rule: 'array',
        fieldType: 'array'
    }],
    status: 'on'
};

module.exports = jModel;