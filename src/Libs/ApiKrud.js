const Krud = require('./Krud');

const PibizHelper = require('../Utils/pibizHelper');
const Helper = require('../Utils/helper');
const _ = require("../Utils/lowDash");


//__________________find
const find = async (identity, params = {}, fireUser) => {
    const { query = {}, pick = [], omit = [], isAccess } = params;

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
                Qry = PibizHelper.getOwnQry(query, fireUser);
            } else if (isAccess.access == 'group') {
                Qry = PibizHelper.getGroupQry(query, fireUser);
            }
        }
    }

    if (Qry) {
        const result = await Krud.find(identity, { ...params, query: Qry, pick, omit }, fireUser);
        return result;
    }

    return Helper.ThrowErr(`find failed`);
};


//__________________findOne
const findOne = async (identity, params, fireUser) => {
    const { query = {}, pick = [], omit = [], isAccess } = params;
    PibizHelper.checkQry(query, identity);

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
                Qry = PibizHelper.getOwnQry(query, fireUser);
            } else if (isAccess.access == 'group') {
                Qry = PibizHelper.getGroupQry(query, fireUser);
            }
        }
    }

    if (Qry) {
        const result = await Krud.findOne(identity, { query: Qry, pick, omit }, fireUser);
        return result;
    }
    return Helper.ThrowErr(`findOne failed`);
};


//__________________create
const create = async (identity, { item, isAccess }, fireUser) => {
    if (isAccess !== 'admin') {
        if (isAccess.fields && isAccess.fields.length) {
            if (isAccess.mode == 'pick') {
                item = _.pick(item, isAccess.fields);
            } else if (isAccess.mode == 'omit') {
                item = _.omit(item, isAccess.fields);
            }
        }
    }

    const result = await Krud.create(identity, { item }, fireUser);
    return result;
}



//__________________update
const update = async (identity, { query = {}, item, isAccess }, fireUser) => {
    PibizHelper.checkQry(query, identity);

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
                Qry = PibizHelper.getOwnQry(query, fireUser);
            } else if (isAccess.access == 'group') {
                Qry = PibizHelper.getGroupQry(query, fireUser);
            }
        }
    }

    if (Qry) {
        const result = await Krud.update(identity, { query: Qry, item }, fireUser);
        return result;
    }

    return Helper.ThrowErr(`Update failed`);
}


//__________________remove
const remove = async (identity, { query = {}, isAccess }, fireUser) => {
    PibizHelper.checkQry(query, identity);

    let Qry;
    if (isAccess === 'admin') {
        Qry = query;
    } else {
        if (isAccess.group == 'public' || isAccess.access == 'all') {
            Qry = query;
        } else {
            if (isAccess.access == 'own') {
                Qry = PibizHelper.getOwnQry(query, fireUser);
            } else if (isAccess.access == 'group') {
                Qry = PibizHelper.getGroupQry(query, fireUser);
            }
        }
    }

    if (Qry) {
        const result = await Krud.remove(identity, { query: Qry }, fireUser);
        return result;
    }

    return Helper.ThrowErr(`Remove failed`);
}


//__________________count
const count = async (identity, { isAccess, ...params }, fireUser) => {
    const result = await Krud.count(identity, params, fireUser);
    return result;
}


exports.find = find;
exports.findOne = findOne;
exports.create = create;
exports.update = update;
exports.remove = remove;
exports.count = count;