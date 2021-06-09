const fs = require('fs');
const env = process.env.NODE_ENV || 'dev';
const dir = (fs.existsSync('./.env')) ? '.env' : '.env_ci';
const envVars = require(`../${dir}/env.${env}`);

const config = {
    ENV: process.env.NODE_ENV || envVars.NODE_ENV || 'dev',
    DOMAIN: process.env.DOMAIN || envVars.DOMAIN || 'https://domainqa.unitedeffects.com',
    SG_API: process.env.SG_API || envVars.SG_API || 'SENDGRIDAPIID',
    SG_URL: process.env.SG_URL || envVars.SG_URL || 'api.sendgrid.com',
    SG_VERSION: process.env.SG_VERSION || envVars.SG_VERSION || 'v3',
    CUSTOM_DOMAIN: process.env.CUSTOM_DOMAIN || envVars.CUSTOM_DOMAIN || 'example.com',
    OIDC: process.env.OIDC || envVars.OIDC || 'https://qa.ueauth.io/root',
    OIDC_CLIENT: process.env.OIDC_CLIENT || envVars.OIDC_CLIENT || undefined,
    OIDC_CLIENT_SECRET: process.env.OIDC_CLIENT_SECRET || envVars.OIDC_CLIENT_SECRET || undefined,
    NOTIFY_PW_ID: process.env.NOTIFY_PW_ID || envVars.NOTIFY_PW_ID || undefined
};

module.exports = config;