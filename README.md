# Withings Oauth Testing

1. Create a Withings application https://account.withings.com/partner/add_oauth2
    - Callback URI: http://localhost:3000/get_token
    - Environment: Dev
2. Copy from the app dashboard into `server.ts`
    - `CLIENT_ID` = Client Id
    - `CLIENT_SECRET` = Consumer Secret
3. `npm run start:watch`
4. Visit http://localhost:3000/
5. :handshake: