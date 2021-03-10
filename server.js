require('dotenv').config();

const http = require('http');
const url = require('url');


const { initDb } = require("./src/Libs/db");

/*
______________________________________  ENV */
const ADMIN_API_KEY = process.env.ADMIN_API_KEY;


initDb((error) => {
    if (error) throw error;

    //API Routes Entry File    
    const ApiRoutes = require("./src/apiRoutes");

    const Helper = require('./src/Utils/helper');
    const PibizHelper = require('./src/Utils/pibizHelper');


    const server = http.createServer(async (req, res) => {
        const reqUrl = url.parse(req.url, true);

        let apiKey = ApiRoutes.GetApiKey(req.headers, reqUrl.query);
        if (!apiKey) {
            return Helper.SendErr(res, 401, "Unauthorized API Access");
        }

        let fireUser;
        let idToken = ApiRoutes.GetIdToken(req.headers, reqUrl.query);
        if (idToken) {
            try {
                const decoded = await Helper.VerifyAuth(idToken);
                if (decoded) {
                    fireUser = decoded;
                }
            } catch (error) {
                Helper.SendErr(res, 401, "Unauthorized Access");
            }
        }

        const pSplits = reqUrl.pathname.split("/", 5);

        //-> /api
        const endPoint1 = pSplits[1];
        if (endPoint1 === 'api' && (req.method === 'POST' || req.method === 'GET')) {
            try {
                let params = {};
                if (req.method === 'POST') {
                    params = await ApiRoutes.GetParams(req, res, fireUser);
                }

                //->  /[admin|[login|exec|asset]]
                const endPoint2 = pSplits[2];
                if (endPoint2 === 'admin') {
                    if (apiKey != ADMIN_API_KEY) {
                        await Helper.DelayRes();
                        return Helper.ThrowErr('No  Access Token Key');
                    }

                    const endPoint3 = pSplits[3];

                    if (endPoint3 === 'login' && req.method === 'POST') {
                        req.ctx = { params };
                        await ApiRoutes.AdminLogin(req, res);
                        return;
                    } else if (endPoint3 === 'exec' && req.method === 'POST') {
                        if (!fireUser || fireUser.group != 'admin') {
                            await Helper.DelayRes();
                            return Helper.ThrowErr('Invalid  OPAccess A1');
                        }

                        const action = pSplits[4];
                        req.ctx = { action, fireUser, params };
                        await ApiRoutes.AdminExec(req, res);
                        return;
                    } else if (endPoint3 === 'asset' && req.method === 'GET') {
                        if (!fireUser || fireUser.group != 'admin') {
                            await Helper.DelayRes();
                            return Helper.ThrowErr('Invalid  OPAccess A1');
                        }

                        const asset = pSplits[4];
                        req.ctx = { asset };
                        await ApiRoutes.AdminAsset(req, res);
                        return;
                    }

                    return Helper.ThrowErr('Invalid  OPAccess L1');
                } else if (endPoint2 === 'login' || endPoint2 === 'exec' || endPoint2 === 'asset') {
                    if (fireUser && fireUser.group === 'admin') {
                        return Helper.ThrowErr('Invalid  OPAccess A2');
                    }

                    const hasKey = PibizHelper.GetCollection('apikeys').findOne({ key: apiKey });
                    if (!hasKey || !hasKey._id) {
                        await Helper.DelayRes();
                        return Helper.ThrowErr('No  Access Token Key');
                    }

                    if (endPoint2 === 'login' && req.method === 'POST') {
                        req.ctx = { params };
                        await ApiRoutes.Login(req, res);
                        return;
                    } else if (endPoint2 === 'exec' && req.method === 'POST') {
                        const ctrl = pSplits[3];
                        if (hasKey.ismaster != 'on' && (hasKey.scope || []).includes(ctrl) === false) {
                            await Helper.DelayRes();
                            return Helper.ThrowErr('Invalid  Access Scope');
                        }
                        const action = pSplits[4];

                        req.ctx = { ctrl, action, fireUser, params };
                        await ApiRoutes.Exec(req, res);
                        return;
                    } else if (endPoint2 === 'asset' && req.method === 'GET') {
                        if (!fireUser || !fireUser.group) {
                            await Helper.DelayRes();
                            return Helper.ThrowErr('Invalid  OPAccess A2');
                        }

                        const asset = pSplits[3];
                        req.ctx = { asset };

                        await ApiRoutes.Asset(req, res);
                        return;
                    }
                    return Helper.ThrowErr('Invalid  OPAccess L1');
                }
            } catch (error) {
                Helper.SendErr(res, 401, (error.name == 'pibizError' ? error.message : "Not Allowed"));
            }
        } else {
            Helper.SendErr(res, 404, "Not Found");
        }
    });


    server.listen(process.env.APP_PORT, process.env.APP_HOST, () => {
        console.log(`Listening on http://${process.env.APP_HOST}:${process.env.APP_PORT}`);
    });
})