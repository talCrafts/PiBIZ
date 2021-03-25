/*
______________________________________  ENV */
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;


module.exports.attach = (socket) => {

  const Helper = require('../Utils/helper');
  const PibizHelper = require('../Utils/pibizHelper');


  let validateLoginDetails = async (request) => {
    let apiKey = Helper.GetApiKey(socket.request);

    let { username, password } = request.data;

    let Qry = { username, status: 'on' };
    if (apiKey === ADMIN_API_KEY) {
      Qry.group = 'admin';
    } else {
      const hasKey = PibizHelper.GetCollection('apikeys').findOne({ key: apiKey });
      if (hasKey && hasKey._id) {
        Qry.group = { '$ne': 'admin' }
      } else {
        let Err = new Error(`No  Access Token Key`);
        Err.name = 'ApiKeyError';
        await Helper.DelayRes();
        return request.error(Err);
      }
    }

    const Accounts = PibizHelper.GetCollection("accounts");
    const User = Accounts.findOne(Qry);
    if (User && User._id) {
      const isPwdOk = await Helper.CheckPassword(password, User.password);
      if (isPwdOk) {
        socket.setAuthToken({ uid: User._id, group: User.group }, { expiresIn: "12h" });
        return request.end();
      }
    }

    let loginError = new Error('Invalid username or password');
    loginError.name = 'LoginError';
    await Helper.DelayRes();
    return request.error(loginError);
  };

  (async () => {
    for await (request of socket.procedure('login')) {
      validateLoginDetails(request);
    }
  })();
};