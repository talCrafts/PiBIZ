const pick = (object, keys) => {
    return Object.fromEntries(
        Object.entries(object)
            .filter(([key]) => keys.includes(key))
    );
}
const omit = (object, keys = []) => {
    return Object.fromEntries(
        Object.entries(object)
            .filter(([key]) => !keys.includes(key))
    );
};

const size = (collection) => {
    if (Array.isArray(collection)) {
        return collection.length;
    }
    return Object.keys(collection).length;
};

exports.pick = pick;
exports.omit = omit;
exports.size = size;