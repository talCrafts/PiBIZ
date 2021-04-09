const jModel = {
    identity: "groups",
    kind: 'core',
    stamped: true,
    ttl: false,
    fields: [{
        name: 'name',
        rule: 'string|required|not_in:admin,public',
        unique: true
    }, {
        name: 'description',
        rule: 'string',
        fieldType: 'textarea'
    }],
    status: 'on'
};

module.exports = jModel;