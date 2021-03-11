import * as express from 'express'
import * as buildUrl from 'build-url'
import * as querystring from 'querystring'
import * as moment from 'moment';
import axios from 'axios'

const ACCOUNT_URL = 'https://account.withings.com'
const WBSAPI_URL = 'https://wbsapi.withings.net'

const CALLBACK_URI = 'http://localhost:3000/get_token'
const CLIENT_ID = '<clientId>'
const CLIENT_SECRET = '<clientSecret>'
const STATE = 'walkingOnSunshine'
const SCOPE = ['user.info', 'user.metrics', 'user.activity']

express()
    .use((req, res, next) => {
        console.log(req.path)
        next()
    })
    .get('/', (req, res, next) => {
        // https://developer.withings.com/oauth2/#operation/oauth2-authorize
        // The authentication code is available for 30 seconds.

        const authUrl = buildUrl(ACCOUNT_URL, {
            path: 'oauth2_user/authorize2',
            queryParams: {
                response_type: 'code',
                client_id: CLIENT_ID,
                state: STATE,
                scope: SCOPE,
                redirect_uri: CALLBACK_URI,
                mode: 'demo' // Demo user
            }
        })
        console.log(authUrl)
        res.redirect(authUrl)
    })
    .get('/get_token', async (req, res, next) => {
        // https://developer.withings.com/oauth2/#operation/oauth2-getaccesstoken

        const {code, state} = req.query
        console.log('code:', code)
        console.log('state:', state)

        const tokenUrl = buildUrl(WBSAPI_URL, {
            path: 'v2/oauth2'
        })
        console.log(tokenUrl)

        const data = {
            action: 'requesttoken',
            grant_type: 'authorization_code',
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            redirect_uri: CALLBACK_URI,
            code: code as string
        }
        console.log(querystring.stringify(data).replace(/%2F/gi, '/'))

        try {
            // Parameters must be set in the body request as form-data
            // https://github.com/axios/axios#using-applicationx-www-form-urlencoded-format
            const accessToken = await axios.post(tokenUrl, querystring.stringify(data), {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                }
            })
            console.log(accessToken.data.body)

            const refreshUrl = buildUrl(WBSAPI_URL, {
                path: 'v2/oauth2',
            })
            const refreshToken = accessToken.data.body.refresh_token
            const dataToken = {
                action: 'requesttoken',
                grant_type: 'refresh_token',
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                refresh_token: refreshToken,
            }
            const refreshedToken = await axios.post(refreshUrl, querystring.stringify(dataToken), {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                }
            })
            console.log('refreshed:', refreshedToken.data.body)

            const startdateymd = '2020-08-17'
            const enddateymd = '2020-08-17'
            // const date = '2020-08-17'
            // const startdate = moment(date).unix().toString(),
            // const enddate = moment(date).add(1, 'day').unix().toString(),

            // List data of returned user
            const apiUrl = buildUrl(WBSAPI_URL, {
                path: 'v2/measure'
            })
            const activity = {
                action: 'getactivity',
                startdateymd: startdateymd,
                enddateymd: enddateymd,
                data_fields: 'steps,distance,elevation,soft,moderate,intense,active,calories,totalcalories,hr_average,hr_min,hr_max,hr_zone_0,hr_zone_1,hr_zone_2,hr_zone_3',
            }
            const result = await axios.post(apiUrl, querystring.stringify(activity), {
                headers: {
                    Authorization: `Bearer ${refreshedToken.data.body.access_token}`,
                    'Content-Type': 'multipart/form-data',
                },
            })
            res.json(result.data.body)
        } catch (error) {
            console.log(error)
            res.end(error.message)
        }
    })
    .post('/ping', (req, res, next) => {
        console.log(req.body)
        res.end('ping')
    })
    .listen(3000)
