require('babel-polyfill');
import serverless from 'serverless-http';
import express from 'express';
import bodyParser from 'body-parser';
import axios from 'axios';

const auth = require('./auth/api');
const config = require('./config');

const app = express();

app.use(bodyParser.json({limit: '1mb'}));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, HEAD, POST, DELETE, PUT, PATCH, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, api_key, Authorization");
    next();
});

app.get('/ue', (req, res) => {
    res.status(200).send('running');
});

app.post('/ue/mail/send', auth.isBearerAuthenticated, (req, res) => {
    //todo replace request with axios here
    request({
        method: 'POST',
        headers: {
            'Content-Type' : 'application/json',
            'Authorization': `bearer ${config.SG_API}`
        },
        uri: 'https://api.sendgrid.com/v3/mail/send',
        json: req.body
    }, (error, response, body) => {
        if(error) return res.status(500).json(error);
        return res.status(response.statusCode).json(body);
    });
});

module.exports.handler = serverless(app);