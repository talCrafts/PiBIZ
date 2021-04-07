const DataStore = require('../DataStores/DataStore');
const CryptoHelper = require('./cryptoHelper');
const _ = require("./lowDash");


//__________________find
const find = async (identity, params = {}, isAccess, fireUser) => {
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
                Qry = DataStore.getOwnQry(query, fireUser);
            } else if (isAccess.access == 'group') {
                Qry = DataStore.getGroupQry(query, fireUser);
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
        docs.forEach(doc => items.push(DataStore.transForm(doc, pick, omit)));
        return items;
    }

    throw new Error(`find failed`);
};


//__________________findOne
const findOne = async (identity, params, isAccess, fireUser) => {
    const { query = {}, pick = [], omit = [] } = params;
    DataStore.checkQry(query, identity);

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
                Qry = DataStore.getOwnQry(query, fireUser);
            } else if (isAccess.access == 'group') {
                Qry = DataStore.getGroupQry(query, fireUser);
            }
        }
    }

    if (Qry) {
        const res = DataStore.getCollection(identity).chain().find(Qry).data({ removeMeta: true });;
        const doc = res[0];
        return DataStore.transForm(doc, pick, omit);
    }

    throw new Error(`findOne failed`);
};


//__________________create
const create = async (identity, { item }, isAccess, fireUser) => {
    if (isAccess !== 'admin') {
        if (isAccess.fields && isAccess.fields.length) {
            if (isAccess.mode == 'pick') {
                item = _.pick(item, isAccess.fields);
            } else if (isAccess.mode == 'omit') {
                item = _.omit(item, isAccess.fields);
            }
        }
    }

    const jModel = DataStore.getCollection("collections").findOne({ identity });
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

    let newDoc = DataStore.parseItem(item);

    const isValid = DataStore.validate(newDoc, vFields);
    if (isValid !== true) {
        if (isValid.error) {
            throw new Error(`${isValid.error}`);
        }
        throw new Error(`Document not valid`);
    }

    const proms = [];
    pwds.forEach(field => {
        proms.push(
            new Promise(async (resolve, reject) => {
                if (field in newDoc && newDoc[field]) {
                    newDoc[field] = CryptoHelper.HashPassword(newDoc[field]);
                }
                resolve();
            })
        )
    });
    await Promise.all(proms);


    if (jModel.stamped) {
        newDoc.createdAt = Date.now();
        newDoc.updatedAt = Date.now();
    }

    newDoc.createdBy = fireUser ? fireUser.uid : -1;
    newDoc.updatedBy = fireUser ? fireUser.uid : -1;

    if (identity === "collections") {
        newDoc.kind = "more";
    }


    const res = DataStore.getCollection(identity).insert(newDoc);
    if (res.$loki) {
        if (identity === 'accounts' && fireUser && fireUser.group === 'admin') {
            DataStore.getCollection(identity).chain().find({ $loki: res.$loki }).update((doc) => {
                doc.createdBy = res.$loki;
                doc.updatedBy = res.$loki;
            });
        }

        if (identity === "collections") {
            const jM = DataStore.getCollection(identity).findOne({ $loki: res.$loki });
            DataStore.setCollection(jM, true);
        }

        return res.$loki;
    }

    throw new Error(`create failed`);
}



//__________________update
const update = async (identity, { query = {}, item }, isAccess, fireUser) => {
    DataStore.checkQry(query, identity);

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
                Qry = DataStore.getOwnQry(query, fireUser);
            } else if (isAccess.access == 'group') {
                Qry = DataStore.getGroupQry(query, fireUser);
            }
        }
    }

    if (Qry) {
        const jModel = DataStore.getCollection("collections").findOne({ identity });
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

        let updDoc = DataStore.parseItem(item);

        for (const [field, value] of Object.entries(updDoc)) {
            if (vFields[field]) {
                const isValid = DataStore.validate({ [`${field}`]: value }, { [`${field}`]: vFields[field] });
                if (isValid !== true) {
                    throw new Error(`Invalid update data - ${field}`);
                }
            }
        }


        const proms = [];
        pwds.forEach(field => {
            proms.push(
                new Promise(async (resolve, reject) => {
                    if (field in updDoc && updDoc[field]) {
                        updDoc[field] = CryptoHelper.HashPassword(updDoc[field]);
                    }
                    resolve();
                })
            )
        });
        await Promise.all(proms);


        if (jModel.stamped) {
            updDoc.updatedAt = Date.now();
        }

        updDoc.updatedBy = fireUser ? fireUser.uid : -1;

        if (identity === "collections") {
            updDoc.kind = "more";
        }

        DataStore.getCollection(identity).chain().find(Qry)
            .update((doc) => {
                for (let prop in updDoc) {
                    if (updDoc.hasOwnProperty(prop)) {
                        doc[prop] = updDoc[prop];
                    }
                }
            });

        if (identity === "collections") {
            const jM = DataStore.getCollection(identity).findOne(Qry);
            DataStore.setCollection(jM, true);
        }
        return true;
    }

    throw new Error(`Update failed`);
}


//__________________remove
const remove = async (identity, { query = {} }, isAccess, fireUser) => {
    DataStore.checkQry(query, identity);

    let Qry;
    if (isAccess === 'admin') {
        Qry = query;
    } else {
        if (isAccess.group == 'public' || isAccess.access == 'all') {
            Qry = query;
        } else {
            if (isAccess.access == 'own') {
                Qry = DataStore.getOwnQry(query, fireUser);
            } else if (isAccess.access == 'group') {
                Qry = DataStore.getGroupQry(query, fireUser);
            }
        }
    }

    if (Qry) {
        if (identity === "collections") {
            const jM = DataStore.getCollection(identity).findOne(Qry);
            DataStore.removeCollection(jM.identity);
        }

        DataStore.getCollection(identity).chain().find(Qry).remove();
        return true;
    }

    throw new Error(`remove failed`);
}


//__________________count
const count = async (identity, { query = {} }, isAccess, fireUser) => {
    return DataStore.getCollection(identity).chain().find(query).count();
}


exports.find = find;
exports.findOne = findOne;
exports.create = create;
exports.update = update;
exports.remove = remove;
exports.count = count;