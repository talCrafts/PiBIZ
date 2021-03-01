const Status = ['on', 'off'];

const jModel = {
    identity: "collections",
    kind: 'core',
    stamped: true,
    ttl: false, // int - age of document (in ms.)
    fields: [{
        name: 'identity',
        rule: 'string|required|min:3',
        unique: true
    }, {
        name: 'kind',
        rule: 'string|in:core,more'
    }, {
        name: 'stamped',
        rule: 'boolean',
        fieldType: 'boolean'
    }, {
        name: 'ttl',
        rule: 'numeric',
    }, {
        name: 'fields',
        rule: 'array',
        fieldType: 'array'
    }, {
        name: 'status',
        rule: `string|in:${Status.join()}`,
        fieldType: 'select',
        default: 'off',
        options: Status.map(obj => ({ label: `${obj}`, value: `${obj}` })),
        indexed: true
    }],
    status: 'on'
};

module.exports = jModel;

