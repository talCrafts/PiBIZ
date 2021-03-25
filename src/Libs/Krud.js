const DB = require("./db");
const PibizHelper = require('../Utils/pibizHelper');
const Helper = require('../Utils/helper');


//______________________________________  find
const find = async (identity, { query = {}, limit = 500, offset = 0, sort = ['_id', false], pick = [], omit = [] }, fireUser) => {
    const items = [];
    const docs = PibizHelper.GetCollection(identity)
        .chain().find(query)
        .simplesort(`${sort[0]}`, { desc: Boolean(sort[1]) })
        .offset(offset).limit(limit)
        .data({ removeMeta: true });
    docs.forEach(doc => items.push(PibizHelper.transForm(doc, pick, omit)));
    return items;
}

//______________________________________  findOne
const findOne = async (identity, { query = {}, pick = [], omit = [] }, fireUser) => {
    const res = PibizHelper.GetCollection(identity).chain().find(query).data({ removeMeta: true });;
    const doc = res[0];
    if (doc) {
        return PibizHelper.transForm(doc, pick, omit);
    }
    return null;
}

//______________________________________  create
const create = async (identity, { item }, fireUser) => {
    const jModel = PibizHelper.getJModel(identity);
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

    let newDoc = PibizHelper.parseItem(item);

    const isValid = PibizHelper.validate(newDoc, vFields);
    if (isValid !== true) {
        if (isValid.error) {
            return Helper.ThrowErr(`${isValid.error}`);
        }
        return Helper.ThrowErr(`Document not valid`);
    }

    const proms = [];
    pwds.forEach(field => {
        proms.push(
            new Promise(async (resolve, reject) => {
                if (field in newDoc && newDoc[field]) {
                    newDoc[field] = await Helper.HashPassword(newDoc[field]);
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


    const res = PibizHelper.GetCollection(identity).insert(newDoc);

    if (identity === 'accounts' && fireUser && fireUser.group === 'admin') {
        PibizHelper.GetCollection(identity).chain().find({ $loki: res.$loki }).update((doc) => {
            doc.createdBy = res.$loki;
            doc.updatedBy = res.$loki;
        });
    }

    if (identity === "collections") {
        const jM = PibizHelper.GetCollection(identity).findOne({ $loki: res.$loki });
        DB.setCollection(jM, true);
    }



    return res.$loki;
}

//______________________________________  update
const update = async (identity, { query = {}, item }, fireUser) => {
    const jModel = PibizHelper.getJModel(identity);
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

    let updDoc = PibizHelper.parseItem(item);

    for (const [field, value] of Object.entries(updDoc)) {
        if (vFields[field]) {
            const isValid = PibizHelper.validate({ [`${field}`]: value }, { [`${field}`]: vFields[field] });
            if (isValid !== true) {
                return Helper.ThrowErr(`Invalid update data - ${field}`);
            }
        }
    }


    const proms = [];
    pwds.forEach(field => {
        proms.push(
            new Promise(async (resolve, reject) => {
                if (field in updDoc && updDoc[field]) {
                    updDoc[field] = await Helper.HashPassword(updDoc[field]);
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

    PibizHelper.GetCollection(identity).chain().find(query)
        .update((doc) => {
            for (let prop in updDoc) {
                if (updDoc.hasOwnProperty(prop)) {
                    doc[prop] = updDoc[prop];
                }
            }
        });

    if (identity === "collections") {
        const jM = PibizHelper.GetCollection(identity).findOne(query);
        DB.setCollection(jM, true);
    }


    return true;

}

//______________________________________  remove
const remove = async (identity, { query = {} }, fireUser) => {
    if (identity === "collections") {
        const jM = PibizHelper.GetCollection(identity).findOne(query);
        DB.removeCollection(jM.identity);
    }
    PibizHelper.GetCollection(identity).chain().find(query).remove();

    return true;
}

//______________________________________  count
const count = async (identity, { query = {} }, fireUser) => {
    return PibizHelper.GetCollection(identity).chain().find(query).count();
}


exports.find = find;
exports.findOne = findOne;
exports.create = create;
exports.update = update;
exports.remove = remove;
exports.count = count;

