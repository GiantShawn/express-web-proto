'use strict';

//const config = require('../config.js');
//const server_config = config.server.config
const WebServer = require("./webserver.js");

const server = new WebServer();

var favicon = require('serve-favicon');
var logger = require('morgan');

//var index = require(path.join(server_config.outdir, 'routes/index'));
//var users = require(path.join(server_config.outdir, 'routes/users'));

server.setupGlobalConfig();

// uncomment after placing your favicon in /public
//server.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));

server.use(logger('dev'));

server.setupProcessors();

server.setupRoutes();
//app.use('/', index);
//app.use('/users', users);
//
server.setupErrorHanler();

module.exports = server;
