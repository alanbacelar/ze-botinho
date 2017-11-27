'use strict';

const fs = require('fs');
const dotenv = require('dotenv');
const env_config = dotenv.config();

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const index = require('./routes/index');

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());

app.use('/', index);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    const err = new Error('Not Found');
    err.status = 404;

    next(err);
});

// error handler
app.use(function(err, req, res, next) {
    const type = err.name.toLowerCase();
    const message = err.message;
    const errors = err.errors;

    const status = err.status || 500;
    const error = {status, message, type, errors};

    // render the error page
    res.status(status).json({error});
});

module.exports = app;
