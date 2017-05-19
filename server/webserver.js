'use strict';

require('app-module-path').addPath('..');
const config = require('config')('server');
const express = require('express');
const path = require('path');
const fs = require('fs');
const webpack = require('webpack');
const lo = require('lodash');
const utils = require('utils');
var server_config = config.server.config;

utils.assert(lo.includes(['production', 'debug'], config.env_class), 'NODE_ENV can not be recognized: %s', config.env_class);
utils.logimp('RUN in ENV [%s]', config.env_class);

function WebServer()
{
    const express = require('express');
    const server = express();
    server.setupGlobalConfig = function ()
    {
        // view engine setup
        this.set('views', server_config.rtpath.dyn_pug_repo);
        this.set('view engine', 'pug');
    }

    server.setupProcessors = function ()
    {
        const cookieParser = require('cookie-parser');
        const bodyParser = require('body-parser');

        this.use(bodyParser.json());
        this.use(bodyParser.urlencoded({ extended: false }));
        this.use(cookieParser());


        if (config.env_class !== 'production')
        {
            this.use(require('node-sass-middleware')({
                src: server_config.rtpath.dyn_sass_repo,
                dest: server_config.rtpath.null_dyn_html_repo,
                prefix: server_config.rtpath.null_dyn_html_repo.substr(server_config.rtpath.null_dyn_repo.length),
                sourceMap: true,
                debug: true
            }));
        }

        if (!config.env.static_frontend) {
            utils.logtips('Server serve static s_resource at [%s]', server_config.rtpath.sta_html_repo);
            this.use(express.static(server_config.rtpath.sta_html_repo));
        }

        utils.logtips('Server serve static d_resource at [%s]', server_config.rtpath.dyn_html_repo);

        this.use(express.static(server_config.rtpath.dyn_html_repo));

        if (config.env_class === 'debug') {
            // setup dev middleware and hot middleware for each app
            require('./webpack_definition')(config.app);
            let q = [config.app];
            while (q.length) {
                const c = q.shift();
                if (c.webpack_module) {
                    const webpackConfig = c.webpack_module(config.env_class);
                    const compiler = webpack(webpackConfig);
                    utils.logtips("Setup webpack dev-middleware and hot-middleware for app[%s]", c.name);
                    //https://www.npmjs.com/package/webpack-hot-middleware
                    this.use(require("webpack-dev-middleware")(compiler, {
                            noInfo: true, publicPath: webpackConfig.output.publicPath
                    }));
                    this.use(require("webpack-hot-middleware")(compiler));
                }

                q = q.concat(c.children_seq);
            }
        }
    }

    server.setupErrorHandler = function () {
        // catch 404 and forward to error handler
        this.use(function(req, res, next) {
            var err = new Error('Not Found');
            err.status = 404;
            next(err);
        });

        // error handler
        this.use(function(err, req, res, next) {
            // set locals, only providing error in development
            res.locals.message = err.message;
            res.locals.error = req.app.get('env') === 'development' ? err : {};

            // render the error page
            res.status(err.status || 500);
            res.render('error');
        });
    }

    server.setupRoutes = function ()
    {
        //let route_root = server_config.rtpath.route_repo;
        //let route_root_rel = server_config.rtpath.route_repo_rel(); // from working dir
        //function route_rel(appname) {
            //let apppath = appname.replace(/\./g, path.sep);
            //let routepath = path.join(route_root_rel, apppath);
            //return path.join(routepath, 'index.js');
        //}
        require('./router_definition')(config.app);

        (function _setupRoute(app, prouter) {
            //const router = server.Router();
            /* router_def:
            *       {
            *            router: express.Router object
            *            beforeChildren: function ()
            *            afterChildren: function ()
            *       }
            */

            let routerdef;
            //try {
                //let router_js = route_rel(app.name);
                //console.log("Gonna setup router for ", app.name, router_js);
                //fs.accessSync(router_js, fs.constants.R_OK);
                //routerdef = require(router_js)(prouter);
                //console.log("Got routerdef", routerdef);
            //} catch (e) {
                //console.log(e);
            //} finally {
                //if (!routerdef) {
                    //routerdef = {
                        //router: express.Router(),
                        //beforeChildren() {},
                        //afterChildren() {}
                    //}
                    //prouter.use('/', routerdef.router);
                //}
            //}
            if (app.router_module) {
                routerdef = app.router_module(prouter);
            } else {
                routerdef = {
                    router: express.Router(),
                    beforeChildren() {},
                    afterChildren() {},
                }
                prouter.use('/', routerdef.router);
            }

            routerdef.beforeChildren();

            if (app.children_seq.length) {
                app.children_seq.forEach((capp) => {
                    _setupRoute.bind(this)(capp, routerdef.router);
                });
            }

            routerdef.afterChildren();
        }).bind(this)(config.app, server);
    }


    return server;
}

module.exports = WebServer;
