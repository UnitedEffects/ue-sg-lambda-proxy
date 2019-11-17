const fs = require('fs');
const env = process.env.NODE_ENV || 'dev';
const dir = (fs.existsSync('./.env')) ? '.env' : '.env_ci';
const envVars = require(`../${dir}/env.${env}`);

const config = {
    ENV: process.env.NODE_ENV || envVars.NODE_ENV || 'dev',
    DOMAIN: process.env.DOMAIN || envVars.DOMAIN || 'https://domainqa.unitedeffects.com',
    SG_API: process.env.SG_API || envVars.SG_API || 'SENDGRIDAPIID',
    CUSTOM_DOMAIN: process.env.CUSTOM_DOMAIN || envVars.CUSTOM_DOMAIN || 'example.com'
};

module.exports = config;