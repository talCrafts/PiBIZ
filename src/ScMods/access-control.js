/*
______________________________________  ENV */
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;


module.exports.attach = function (scServer) {

    const DataStore = require('../DataStores/DataStore');
    const HttpHelper = require('../Utils/httpHelper');

    scServer.setMiddleware(scServer.MIDDLEWARE_INBOUND, async (middlewareStream) => {
        for await (let action of middlewareStream) {
            if (action.type === action.INVOKE) {
                action.allow();
                continue;
            }

            if (action.type === action.PUBLISH_IN) {
                if (action.socket.authToken) {
                    action.allow();
                    continue;
                } else {
                    //action.socket.transmit('logout');
                    let Err = new Error(`Cannot publish to ${action.channel} channel without being logged in`);
                    Err.name = 'PublishError';
                    action.block(Err);
                    continue;
                }
            }

            if (action.type === action.SUBSCRIBE) {
                if (action.socket.authToken) {
                    action.allow();
                    continue;
                } else {
                    //action.socket.transmit('logout');
                    let Err = new Error(`Cannot subscribe to ${action.channel} channel without being logged in`);
                    Err.name = 'SubscribeError';
                    action.block(Err);
                    continue;
                }
            }
            //HaramKhor
            action.allow();
        }
    });

    scServer.setMiddleware(scServer.MIDDLEWARE_HANDSHAKE, async (middlewareStream) => {
        for await (let action of middlewareStream) {

            if (action.type === action.HANDSHAKE_WS) {
                try {
                    const apiKey = HttpHelper.GetApiKey(action.request);
                    if (!apiKey) {
                        throw new Error("Unauthorized API Access");
                    }

                    let hasKey;
                    if (apiKey === ADMIN_API_KEY) {
                        hasKey = true;
                    } else {
                        const res = DataStore.getCollection('apikeys').findOne({ key: apiKey });
                        if (res && res._id) {
                            hasKey = true;
                        }
                    }

                    if (hasKey !== true) {
                        throw new Error('No  Access Token Key');
                    }

                    action.allow();
                    continue;
                } catch (error) {
                    action.block(error);
                    continue;
                }
            }

            action.allow();
        }
    });
};