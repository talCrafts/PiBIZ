module.exports.attach = function (scServer) {

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
};