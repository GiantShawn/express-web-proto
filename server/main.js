var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');

const config = require('../config.js');
const server_config = config.server.config

//var index = require(path.join(server_config.outdir, 'routes/index'));
//var users = require(path.join(server_config.outdir, 'routes/users'));

var app = express();

// view engine setup
app.set('views', server_config.rt.dyn_pug_repo);
app.set('view engine', 'pug');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

if (config.env_class !== 'production')
{
    app.use(require('node-sass-middleware')({
      src: server_config.rt.dyn_sass_repo,
      dest: server_config.rt.null_dyn_html_repo,
      prefix: server_config.rt.null_dyn_html_repo.substr(server_config.rt.null_dyn_repo.length),
      sourceMap: true,
      debug: true
    }));
}

if (!config.env.static_frontend) {
    app.use(express.static(server_config.rt.sta_html_repo));
}
app.use(express.static(server_config.rt.dyn_html_repo)));

//app.use('/', index);
//app.use('/users', users);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
