const Status = ['on', 'off'];

const jModel = {
    identity: "accounts",
    kind: 'core',
    stamped: true,
    ttl: false, // int - age of document (in ms.)
    fields: [{
        name: 'username',
        rule: 'string|required|min:3',
        unique: true
    }, {
        name: 'password',
        rule: 'string|required|min:6',
        fieldType: 'password'
    }, {
        name: 'group',
        rule: `string|required|not_in:public`,
        fieldType: 'select',
        indexed: true
    }, {
        name: 'displayName',
        rule: 'string|required'
    }, {
        name: 'params',
        rule: 'object',
        fieldType: 'object'
    }, {
        name: 'status',
        rule: `string|in:${Status.join()}`,
        fieldType: 'select',
        options: Status.map(obj => ({ label: `${obj}`, value: `${obj}` })),
        indexed: true
    }],
    status: 'on'
};

module.exports = jModel;