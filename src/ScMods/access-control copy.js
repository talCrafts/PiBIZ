/*
______________________________________  ENV */
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;


module.exports.attach = function (scServer) {

    const Helper = require('../Utils/helper');
    const PibizHelper = require('../Utils/pibizHelper');

    scServer.setMiddleware(scServer.MIDDLEWARE_INBOUND, async (middlewareStream) => {
        for await (let action of middlewareStream) {
            if (action.type === action.INVOKE) {
                if (action.procedure == 'api') {
                    console.log("action.data-> ", action.data)
                    action.allow();
                    continue;

                    let apiKey = Helper.GetApiKey(action.socket.request);
                    let fireUser = action.socket.authToken;

                    /* if (fireUser && fireUser.group === 'admin' && apiKey === ADMIN_API_KEY) {
                         action.allow({ ...action.data, isAccess: 'admin' });
                         continue;
                     } else {
                         const { ctrl } = action.data;
                         const hasKey = PibizHelper.GetCollection('apikeys').findOne({ key: apiKey });
 
                         if (hasKey.ismaster === 'on' || (hasKey.scope || []).includes(`${ctrl}`) === true) {
                             const isAccess = PibizHelper.GetCollection('access').findOne({ cag: `${ctrl}_${action.data.action}_${fireUser ? fireUser.group : 'public'}` });
                             if (isAccess && isAccess.access != 'deny') {
                                 action.allow({ ...action.data, isAccess });
                                 continue;
                             } else {
                                 let Err = new Error(`Unauthorized Access`);
                                 Err.name = 'AccessError';
                                 action.block(Err);
                                 continue;
                             }
                         } else {
                             let Err = new Error(`Unauthorized Scope Access`);
                             Err.name = 'AccessError';
                             action.block(Err);
                             continue;
                         }
                     }*/
                } else {
                    action.allow();
                    continue;
                }
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
};