/*
______________________________________  ENV */
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;


module.exports.attach = (scServer) => {

    const ApiCtrl = require('../Ctrls/apiCtrl');
    const PibizCtrl = require('../Ctrls/pibizCtrl');

    const Helper = require('../Utils/helper');
    const PibizHelper = require('../Utils/pibizHelper');



    const AttachSocket = (socket) => {
        (async () => {
            for await (let request of socket.procedure('api')) {
                try {
                    const apiKey = Helper.GetApiKey(socket.request);
                    const fireUser = socket.authToken;
                    const { ctrl, action, params = {} } = request.data;

                    let result;

                    if (fireUser && fireUser.group === 'admin' && apiKey === ADMIN_API_KEY) {
                        if (ctrl === 'pibiz') {
                            result = await PibizCtrl[action]({ ...params, isAccess: 'admin' }, fireUser);
                        } else {
                            result = await ApiCtrl.Exec({ ctrl, action, params: { ...params, isAccess: 'admin' }, fireUser });
                        }
                    } else {
                        const hasKey = PibizHelper.GetCollection('apikeys').findOne({ key: apiKey });
                        if (hasKey.ismaster === 'on' || (hasKey.scope || []).includes(`${ctrl}`) === true) {
                            const isAccess = PibizHelper.GetCollection('access')
                                .findOne({ cag: `${ctrl}_${action}_${fireUser ? fireUser.group : 'public'}` });
                            if (isAccess && isAccess.access != 'deny') {
                                result = await ApiCtrl.Exec({ ctrl, action, params: { ...params, isAccess }, fireUser });
                            } else {
                                return Helper.ThrowErr('Unauthorized Access');
                            }
                        } else {
                            return Helper.ThrowErr('Unauthorized Scope Access');
                        }
                    }

                    request.end({ result });
                } catch (error) {
                    let apiError = new Error((error.name == 'pibizError' ? error.message : "Not Found"));
                    apiError.name = 'ApiError';
                    request.error(apiError);
                    continue;
                }
            }
        })();
    }

    (async () => {
        let consumer = scServer.listener('handshake').createConsumer();
        while (true) {
            let packet = await consumer.next();
            if (packet.value && packet.value.socket) {
                AttachSocket(packet.value.socket);
            }
        }
    })();

}