import auth from './auth';

export default {
    isBearerAuthenticated: auth.isBearerAuthenticated,
    isOIDCAuthenticated: auth.isOIDCAuthenticated
};