const jModel = {
    identity: "products",
    kind: 'custom',
    stamped: true,
    ttl: false,
    fields: [{
        name: 'name',
        rule: 'string|required',
        unique: true
    }, {
        name: 'category',
        rule: 'string|required',
        indexed: true
    }],
    status: 'on'
};

module.exports = jModel;