const CrudHelper = require('../Utils/crudHelper');

exports.Exec = ({ ctrl, action, params = {}, isAccess, fireUser }) => {
    let Func = CrudHelper[`${action}`];
    if (Func) {
        const result = Func(ctrl, params, isAccess, fireUser);
        return result;
    }

    throw new Error('No Access L1');
};