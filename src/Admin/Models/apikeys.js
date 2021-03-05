const AccMode = ['on', 'off'];

const jModel = {
    identity: "apikeys",
    kind: 'core',
    stamped: true,
    ttl: false,
    fields: [{
        name: 'key',
        rule: 'string|required|min:24',
        unique: true
    }, {
        name: 'scope',
        rule: 'array',
        fieldType: 'array'
    }, {
        name: 'ismaster',
        rule: `string|in:${AccMode.join()}`,
        fieldType: 'select',
        options: AccMode.map(obj => ({ label: `${obj}`, value: `${obj}` }))
    }],
    status: 'on'
};

module.exports = jModel;