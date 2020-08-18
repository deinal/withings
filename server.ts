import * as express from 'express'
import * as buildUrl from 'build-url'
import * as querystring from 'querystring'
import * as moment from 'moment';
import axios from 'axios'

const fs = require('fs');

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

        const tokenUrl = buildUrl(ACCOUNT_URL, {
            path: 'oauth2/token'
        })
        console.log(tokenUrl)

        const data = {
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
            console.log(accessToken.data)

            const startdateymd = '2020-08-17'
            const enddateymd = '2020-08-17'

            // List data of returned user
            const apiUrl = buildUrl(WBSAPI_URL, {
                path: 'measure',
                queryParams: {
                    action: 'getmeas',
                    meastype: '1',
                    category: '1',
                    startdateymd: moment(startdateymd).format('YYYY-MM-DD'),
                    enddateymd: moment(enddateymd).format('YYYY-MM-DD')
                }
            })
            const result = await axios.get(apiUrl, {
                headers:{
                    Authorization: `Bearer ${accessToken.data.access_token}`
                }
            })
            fs.writeFile('data.json', JSON.stringify(result.data, null, 4), 'utf8', (err) => {if (err) throw err})
            const [measurement] = result.data.body.measuregrps[0].measures
            const weight = measurement.value * 10 ** measurement.unit
            res.json(weight)
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
