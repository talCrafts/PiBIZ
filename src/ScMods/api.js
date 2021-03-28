/*
______________________________________  ENV */
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;


module.exports.attach = (scServer) => {

    const DataStore = require('../DataStores/DataStore');
    const HttpHelper = require('../Utils/httpHelper');
    const { GetExec } = require('../Utils/apiHelper');


    const AttachSocket = async (socket) => {
        for await (let request of socket.procedure('api')) {
            try {
                const apiKey = HttpHelper.GetApiKey(socket.request);
                if (!apiKey) {
                    throw new Error("Unauthorized API Access");
                }

                let hasKey;
                if (apiKey === ADMIN_API_KEY) {
                    hasKey = { _id: 'admin', ismaster: 'on', key: apiKey };
                } else {
                    hasKey = DataStore.getCollection('apikeys').findOne({ key: apiKey });
                }
                if (!hasKey || !hasKey._id) {
                    throw new Error('No  Access Token Key');
                }

                const fireUser = socket.authToken;
                const { ctrl, action, params = {} } = request.data;

                const result = await GetExec({ ctrl, action, params, fireUser, hasKey });
                request.end({ result });
            } catch (error) {
                request.error(error);
                continue;
            }
        }
    }

    (async () => {
        let consumer = scServer.listener('handshake').createConsumer();
        while (true) {
            let packet = await consumer.next();
            if (packet.value && packet.value.socket) {
                await AttachSocket(packet.value.socket);
            }
        }
    })();

}