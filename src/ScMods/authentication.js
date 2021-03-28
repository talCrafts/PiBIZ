/*
______________________________________  ENV */
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;


module.exports.attach = (socket) => {
  const DataStore = require('../DataStores/DataStore');
  const HttpHelper = require('../Utils/httpHelper');
  const { GetLogin } = require('../Utils/apiHelper');


  const validateLoginDetails = async (request) => {
    try {
      let apiKey = HttpHelper.GetApiKey(socket.request);
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

      // let { username, password } = request.data;     
      const User = await GetLogin({ params: request.data, hasKey });
      socket.setAuthToken({ uid: User._id, group: User.group }, { expiresIn: "12h" });
      return request.end();
    } catch (error) {
      await HttpHelper.DelayRes();
      request.error(error);
    }
  };

  (async () => {
    for await (request of socket.procedure('login')) {
      await validateLoginDetails(request);
    }
  })();
};