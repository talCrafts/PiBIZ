const Folders = ['images', 'documents', 'audios', 'videos', 'others'];

const jModel = {
    identity: "assets",
    kind: 'core',
    stamped: true,
    ttl: false, // int - age of document (in ms.)
    fields: [{
        name: 'asset',
        rule: 'string|required',
        unique: true
    }, {
        name: 'name',
        rule: 'string|required'
    }, {
        name: 'mime',
        rule: 'string|required'
    }, {
        name: 'path',
        rule: 'string|required',
        indexed: true
    }, {
        name: 'folder',
        rule: `string|required|in:${Folders.join()}`,
        fieldType: 'select',
        options: Folders.map(obj => ({ label: `${obj}`, value: `${obj}` })),
        indexed: true
    }],
    status: 'on'
};

module.exports = jModel;