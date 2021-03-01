require('dotenv').config();

const http = require('http');
const url = require('url');


const { initDb } = require("./src/Libs/db");
const Helper = require('./src/Utils/helper');


initDb((error) => {
    if (error) throw error;

    //Main Router Entry File
    const Router = require("./src/Router");

    const server = http.createServer(async (req, res) => {
        const reqUrl = url.parse(req.url, true);

        let isAccessToken = Router.GetAccessToken(req.headers, reqUrl.query);
        if (!isAccessToken) {
            return Helper.SendErr(res, 401, "Unauthorized Access");
        }

        let fireUser;
        let idToken = Router.GetIdToken(req.headers, reqUrl.query);
        if (idToken) {
            try {
                const decoded = await Helper.VerifyAuth(idToken);
                if (decoded) {
                    fireUser = decoded;
                }
            } catch (error) {
                Helper.SendErr(res, 401, "Unauthentic Access");
            }
        }


        const pSplits = reqUrl.pathname.split("/", 5);
        const endPoint1 = pSplits[1]; //-> api       

        if (endPoint1 === 'api' && (req.method === 'POST' || req.method === 'GET')) {
            let params = {};
            if (req.method === 'POST') {
                params = await Router.GetParams(req, res, fireUser);
            }

            try {
                //->  api/[admin|[login|exec|asset]]
                const endPoint2 = pSplits[2]; //endPoint2

                if (endPoint2 === 'admin') {
                    //->  api/admin/[login|exec|asset]
                    const endPoint3 = pSplits[3];  //endPoint3
                    //->  api/admin/[exec|asset]/[:action|:asset]
                    const endPoint4 = pSplits[4];  //endPoint4
                    req.ctx = { params, fireUser, isAccessToken, endPoint3, endPoint4 };

                    await Router.execAdminApi(req, res);
                    return;
                } else if (endPoint2 === 'login' || endPoint2 === 'exec' || endPoint2 === 'asset') {
                    if (fireUser && fireUser.group == 'admin') {
                        return Helper.ThrowErr('Invalid  OPAccess2');
                    }

                    //->  api/[exec|asset]/[:ctrl|:asset]
                    const endPoint3 = pSplits[3]; //-> endPoint3
                    //->  api/exec/:ctrl/:action
                    const endPoint4 = pSplits[4]; //-> endPoint4
                    req.ctx = { params, fireUser, isAccessToken, endPoint2, endPoint3, endPoint4 };

                    await Router.execApi(req, res);
                    return;
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