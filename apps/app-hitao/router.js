'use strict';

const express = require('express');
const fs = require('fs');
const utils = require('utils');

module.exports = function (prouter)
{
    let router = express.Router();
    router.route('/hitao').
        get(function (req, res, next) {
            utils.logdebug("GET /hitao");
            fs.readFile('dynamic/app-hitao.html', (err, data) => {
                res.set('Content-Type', 'text/html');
                res.send(data);
            });
        });

    prouter.use('/', router);

    return {
        router: router,
        beforeChildren() {},
        afterChildren() {},
    };
}
