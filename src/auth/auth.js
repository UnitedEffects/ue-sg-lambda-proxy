import passport from 'passport';
import {Strategy as BearerStrategy} from 'passport-http-bearer';
import axios from 'axios';

import config from '../config';
function isJson(check){
    try {
        JSON.parse(check);
        return true;
    } catch(e) {
        return false;
    }
}

passport.use('bearer', new BearerStrategy(
    async (accessToken, callback) => {
        try {
            if (!accessToken) return callback(null, false);
            const fullToken = Buffer.from(accessToken.replace(/%3D/g, '='), 'base64').toString('ascii');
            const lookup = fullToken.split('.');
            if (!lookup.length >= 2) return callback(null, false);
            const product =  (lookup[2]) ? lookup[2] : null;
            const domain = (lookup[3]) ? lookup[3] : null;

            if(!product) return callback(null, false);
            if(!domain) return callback(null, false);

            return getBearerToken(accessToken, (err, result) => callback(err, result));
        }catch(error){
            error['detail']='Unhandled Error caught at Bearer Auth';
            log.error('Unhandled Error caught at Bearer Auth');
            return callback(error, false);
        }
    }
));

async function getBearerToken(accessToken, callback){
    try {
        const response = await axios.get(`${config.DOMAIN}/api/validate`, { headers: { authorization: `bearer ${accessToken}`}});
        if (response.status !== 200) return callback(null, false);
        const returned = (isJson(response.data)) ? JSON.parse(response.data) : response.data;
        if(returned.data) return callback(null, returned.data);
        return callback(null, false);
    } catch (error) {
        error["detail"] = 'Bearer Auth validation error from domain service.';
        return callback(error, false);
    }
}

passport.serializeUser((user, done) => {
    done(null, user._id);
});

passport.deserializeUser((user, done) => {
    done(null, user);
});

const authFactory = {
    isBearerAuthenticated: passport.authenticate('bearer', { session: false })
};

module.exports = authFactory;