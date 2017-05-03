'use strict';

//const config = require('../config.js');
//const server_config = config.server.config
const WebServer = require("./webserver.js");

const webserver = new WebServer();

var favicon = require('serve-favicon');
var logger = require('morgan');

//var index = require(path.join(server_config.outdir, 'routes/index'));
//var users = require(path.join(server_config.outdir, 'routes/users'));

/**
 * Get port from environment and store in Express.
 */

var port = normalizePort(process.env.PORT || '3000');
webserver.set('port', port);

webserver.setupGlobalConfig();

// uncomment after placing your favicon in /public
//webserver.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));

webserver.use(logger('dev'));

webserver.setupProcessors();

webserver.setupRoutes();

webserver.setupErrorHandler();


var debug = require('debug')('express-web-proto:server');
var http = require('http');

/**
 * Create HTTP server.
 */

var server = http.createServer(webserver);

/**
 * Listen on provided port, on all network interfaces.
 */

server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind = typeof port === 'string'
    ? 'Pipe ' + port
    : 'Port ' + port;

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
  var addr = server.address();
  var bind = typeof addr === 'string'
    ? 'pipe ' + addr
    : 'port ' + addr.port;
  debug('Listening on ' + bind);
}
