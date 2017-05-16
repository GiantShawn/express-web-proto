'use strict';

const express = require('express');
const fs = require('fs');

module.exports = function (prouter)
{
    let router = express.Router();
    router.route('/hitao').
        get(function (req, res, next) {
            console.log("GET /hitao");
            fs.readFile('html/index.html', (err, data) => {
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
