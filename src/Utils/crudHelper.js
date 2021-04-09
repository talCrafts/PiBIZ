const DataStore = require('../DataStores/DataStore');
const DbHelper = require('./dbHelper');
const CryptoHelper = require('./cryptoHelper');
const _ = require("./lowDash");


//__________________find
const find = (identity, params = {}, isAccess, fireUser) => {
    const { query = {}, limit = 500, offset = 0, sort = ['_id', false], pick = [], omit = [] } = params;

    let Qry;
    if (isAccess === 'admin') {
        Qry = query;
    } else {
        if (isAccess.fields && isAccess.fields.length) {
            if (isAccess.mode == 'pick') {
                const nArr = [];
                if (_.size(pick)) {
                    for (let i of pick) {
                        if (isAccess.fields.includes(i)) {
                            nArr.push(i);
                        }
                    }
                } else {
                    nArr = isAccess.fields;
                }
                pick = nArr;
            } else if (isAccess.mode == 'omit') {
                omit = [...omit, ...isAccess.fields];
            }
        }

        if (isAccess.group == 'public' || isAccess.access == 'all') {
            Qry = query;
        } else {
            if (isAccess.access == 'own') {
                Qry = DbHelper.getOwnQry(query, fireUser);
            } else if (isAccess.access == 'group') {
                Qry = DbHelper.getGroupQry(query, fireUser);
            }
        }
    }

    if (Qry) {
        const items = [];
        const docs = DataStore.getCollection(identity)
            .chain().find(Qry)
            .simplesort(`${sort[0]}`, { desc: Boolean(sort[1]) })
            .offset(offset).limit(limit)
            .data({ removeMeta: true });
        docs.forEach(doc => items.push(DbHelper.transForm(doc, pick, omit)));
        return items;
    }

    throw new Error(`find failed`);
};


//__________________findOne
const findOne = (identity, params, isAccess, fireUser) => {
    const { query = {}, pick = [], omit = [] } = params;
    DbHelper.checkQry(query, identity);

    let Qry;
    if (isAccess === 'admin') {
        Qry = query;
    } else {
        if (isAccess.fields && isAccess.fields.length) {
            if (isAccess.mode == 'pick') {
                const nArr = [];
                if (_.size(pick)) {
                    for (let i of pick) {
                        if (isAccess.fields.includes(i)) {
                            nArr.push(i);
                        }
                    }
                } else {
                    nArr = isAccess.fields;
                }
                pick = nArr;
            } else if (isAccess.mode == 'omit') {
                omit = [...omit, ...isAccess.fields];
            }
        }


        if (isAccess.group == 'public' || isAccess.access == 'all') {
            Qry = query;
        } else {
            if (isAccess.access == 'own') {
                Qry = DbHelper.getOwnQry(query, fireUser);
            } else if (isAccess.access == 'group') {
                Qry = DbHelper.getGroupQry(query, fireUser);
            }
        }
    }

    if (Qry) {
        const res = DataStore.getCollection(identity).chain().find(Qry).data({ removeMeta: true });;
        const doc = res[0];
        return DbHelper.transForm(doc, pick, omit);
    }

    throw new Error(`findOne failed`);
};


//__________________create
const create = (identity, { item }, isAccess, fireUser) => {
    if (isAccess !== 'admin') {
        if (isAccess.fields && isAccess.fields.length) {
            if (isAccess.mode == 'pick') {
                item = _.pick(item, isAccess.fields);
            } else if (isAccess.mode == 'omit') {
                item = _.omit(item, isAccess.fields);
            }
        }
    }

    const jModel = DataStore.getJModel(identity);
    const vFields = {};
    const pwds = [];

    (jModel.fields || []).forEach(field => {
        if (field.rule) {
            vFields[field.name] = field.rule;
        }
        if (field.fieldType && field.fieldType === 'password') {
            pwds.push(field.name);
        }
    });

    let newDoc = DbHelper.parseItem(item);

    const isValid = DbHelper.validate(newDoc, vFields);
    if (isValid !== true) {
        if (isValid.error) {
            throw new Error(`${isValid.error}`);
        }
        throw new Error(`Document not valid`);
    }

    pwds.forEach(field => {
        if (field in newDoc && newDoc[field]) {
            newDoc[field] = CryptoHelper.HashPassword(newDoc[field]);
        }
    });

    if (jModel.stamped) {
        newDoc.createdAt = Date.now();
        newDoc.updatedAt = Date.now();
    }

    newDoc.createdBy = fireUser ? fireUser.uid : -1;
    newDoc.updatedBy = fireUser ? fireUser.uid : -1;




    const res = DataStore.getCollection(identity).insert(newDoc);
    if (res.$loki) {
        if (identity === 'accounts' && fireUser && fireUser.group === 'admin') {
            DataStore.getCollection(identity).chain().find({ $loki: res.$loki }).update((doc) => {
                doc.createdBy = res.$loki;
                doc.updatedBy = res.$loki;
            });
        }

        return res.$loki;
    }

    throw new Error(`create failed`);
}



//__________________update
const update = (identity, { query = {}, item }, isAccess, fireUser) => {
    DbHelper.checkQry(query, identity);

    let Qry;
    if (isAccess === 'admin') {
        Qry = query;
    } else {
        if (isAccess.fields && isAccess.fields.length) {
            if (isAccess.mode == 'pick') {
                item = _.pick(item, isAccess.fields);
            } else if (isAccess.mode == 'omit') {
                item = _.omit(item, isAccess.fields);
            }
        }

        if (isAccess.group == 'public' || isAccess.access == 'all') {
            Qry = query;
        } else {
            if (isAccess.access == 'own') {
                Qry = DbHelper.getOwnQry(query, fireUser);
            } else if (isAccess.access == 'group') {
                Qry = DbHelper.getGroupQry(query, fireUser);
            }
        }
    }

    if (Qry) {
        const jModel = DataStore.getJModel(identity);
        const vFields = {};
        const pwds = [];

        (jModel.fields || []).forEach(field => {
            if (field.rule) {
                vFields[field.name] = field.rule;
            }
            if (field.fieldType && field.fieldType === 'password') {
                pwds.push(field.name);
            }
        });

        let updDoc = DbHelper.parseItem(item);

        for (const [field, value] of Object.entries(updDoc)) {
            if (vFields[field]) {
                const isValid = DbHelper.validate({ [`${field}`]: value }, { [`${field}`]: vFields[field] });
                if (isValid !== true) {
                    throw new Error(`Invalid update data - ${field}`);
                }
            }
        }


        pwds.forEach(field => {
            if (field in updDoc && updDoc[field]) {
                updDoc[field] = CryptoHelper.HashPassword(updDoc[field]);
            }
        });


        if (jModel.stamped) {
            updDoc.updatedAt = Date.now();
        }

        updDoc.updatedBy = fireUser ? fireUser.uid : -1;


        DataStore.getCollection(identity).chain().find(Qry)
            .update((doc) => {
                for (let prop in updDoc) {
                    if (updDoc.hasOwnProperty(prop)) {
                        doc[prop] = updDoc[prop];
                    }
                }
            });
        return true;
    }

    throw new Error(`Update failed`);
}


//__________________remove
const remove = (identity, { query = {} }, isAccess, fireUser) => {
    DbHelper.checkQry(query, identity);

    let Qry;
    if (isAccess === 'admin') {
        Qry = query;
    } else {
        if (isAccess.group == 'public' || isAccess.access == 'all') {
            Qry = query;
        } else {
            if (isAccess.access == 'own') {
                Qry = DbHelper.getOwnQry(query, fireUser);
            } else if (isAccess.access == 'group') {
                Qry = DbHelper.getGroupQry(query, fireUser);
            }
        }
    }

    if (Qry) {
        DataStore.getCollection(identity).chain().find(Qry).remove();
        return true;
    }

    throw new Error(`remove failed`);
}


//__________________count
const count = (identity, { query = {} }, isAccess, fireUser) => {
    return DataStore.getCollection(identity).chain().find(query).count();
}


exports.find = find;
exports.findOne = findOne;
exports.create = create;
exports.update = update;
exports.remove = remove;
exports.count = count;