import passport from 'passport';
import {Strategy as BearerStrategy} from 'passport-http-bearer';
import axios from 'axios';

//todo add
import jwt from 'jsonwebtoken';
import njwk from 'node-jwk';
import Boom from '@hapi/boom';

import config from '../config';

const jwtCheck = /^([A-Za-z0-9\-_~+\/]+[=]{0,2})\.([A-Za-z0-9\-_~+\/]+[=]{0,2})(?:\.([A-Za-z0-9\-_~+\/]+[=]{0,2}))?$/;
function isJWT(str) {
    return jwtCheck.test(str);
}
function isJson(check){
    try {
        JSON.parse(check);
        return true;
    } catch(e) {
        return false;
    }
}

async function getUser(authGroup, token) {
    const options = {
        url: `${config.OIDC}/me`,
        method: 'get',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    }
    return axios(options);
}

async function introspect(token, issuer, authGroup) {
    const options = {
        url: `${config.OIDC}/token/introspection`,
        method: 'post',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    }
    return axios(options);
}

async function runDecodedChecks(token, issuer, decoded, authGroup) {
    if(issuer !== decoded.iss) {
        // check iss
        throw Boom.unauthorized('Token issuer not recognized');
    }
    if(!decoded.group) {
        //check auth group exists
        throw Boom.unauthorized('No Auth Group detected in token');
    }
    if(decoded.group !== authGroup) {
        // check auth group matches
        throw Boom.unauthorized('Auth Group does not match');
    }
    if(typeof decoded.aud === 'string') {
        if(decoded.aud !== config.OIDC_CLIENT) {
            // check audience = client
            throw Boom.unauthorized('Token audience not specific to this auth group client');
        }
    }
    if(typeof decoded.aud === 'object') {
        if(!decoded.aud.includes(config.OIDC_CLIENT)) {
            // check audience = client
            throw Boom.unauthorized('Token audience not specific to this auth group client');
        }
    }
    if (decoded.client_id) {
        if(decoded.client_id !== config.OIDC_CLIENT) {
            throw Boom.unauthorized('Token client ID not specific to this auth group client');
        }
    }
    if(decoded.azp) {
        // client credential issuing client - azp
        if(decoded.azp !== config.OIDC_CLIENT) {
            throw Boom.unauthorized('Client Credential token not issued by group associated client');
        }
    }
    //check sub if present
    if(decoded.sub && decoded.scope) {
        const user = await getUser(authGroup, token);
        // console.info(oidc(authGroup.id).issuer);
        if(!user) throw Boom.unauthorized('User not recognized');
        // Check auth group
        if (!user.group && user.group !== decoded.group) {
            throw Boom.unauthorized('User not associated with indicated auth group');
        }
        return { ...user, decoded, subject_group: authGroup };
    }
    if(decoded.sub && !decoded.scope) {
        //id_token
        throw Boom.unauthorized('API Access requires the access-token not the id-token');
    }
    // client_credential - note, permissions may still stop the request
    return decoded;
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

async function getIssuerFromWK(wk) {
    const data = await axios.get(wk);
    console.info(data);
    return data.issuer;
}

passport.use('oidc-root', new BearerStrategy({
        passReqToCallback: true
    },
    async (req, token, next) => {
        try {
            // subject (user) auth group
            // this is distinct from the authGroup which was specified in the request and now under req.authGroup
            const wellKnown = `${config.OIDC}/.well-known/openid-configuration`
            const issuer = await getIssuerFromWK(wellKnown);
            const issueParts = issuer.split('/');
            const subAG = issueParts[issueParts.length-1];
            if(isJWT(token)){
                const preDecoded = jwt.decode(token, {complete: true});
                const pub = { keys: subAG.config.keys };
                const myKeySet = njwk.JWKSet.fromJSON(JSON.stringify(pub));
                const jwk = myKeySet.findKeyById(preDecoded.header.kid);
                const myPubKey = jwk.key.toPublicKeyPEM();
                return jwt.verify(token, myPubKey, async (err, decoded) => {
                    if(err) {
                        console.error(err);
                        return next(null, false);
                    }
                    if(decoded) {
                        try {
                            const result = await runDecodedChecks(token, issuer, decoded, subAG);
                            return next(null, result, { token });
                        } catch (error) {
                            console.error(error);
                            return next(null, false);
                        }
                    }
                });
            }
            //opaque token
            const inspect = await introspect(token, issuer, subAG);
            if(inspect) {
                if (inspect.active === false) return next(null, false);
                try {
                    const result = await runDecodedChecks(token, issuer, inspect, subAG);
                    return next(null, result, { token });
                } catch (error) {
                    console.error(error);
                    return next(null, false);
                }
            }
            return next(null, false);
        } catch (error) {
            console.error(error);
            return next(null, false);
        }
    }
));

passport.serializeUser((user, done) => {
    done(null, user._id || user);
});

passport.deserializeUser((user, done) => {
    done(null, user);
});

const authFactory = {
    isBearerAuthenticated: passport.authenticate('bearer', { session: false }),
    isOIDCAuthenticated: passport.authenticate('oidc-root', { session: false })
};

module.exports = authFactory;