'use strict';

var config = require('../config.js');
var server_config = config.server;

function WebServer()
{
    var server = require('express')();
    server.setupGlobalConfig = function ()
    {
        // view engine setup
        this.set('views', server_config.rt.dyn_pug_repo);
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
                src: server_config.rt.dyn_sass_repo,
                dest: server_config.rt.null_dyn_html_repo,
                prefix: server_config.rt.null_dyn_html_repo.substr(server_config.rt.null_dyn_repo.length),
                sourceMap: true,
                debug: true
            }));
        }

        if (!config.env.static_frontend) {
            this.use(express.static(server_config.rt.sta_html_repo));
        }
        this.use(express.static(server_config.rt.dyn_html_repo)));
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
        route_root = server_config.rt.route_repo;
        route_root_rel = server_config.rt.route_repo_rel(); // from working dir
        function route_rel(appname) {
            let apppath = appname.replace(/\./g, path.sep);
            let routepath = path.join(route_root_rel, apppath);
            return path.join(routepath, 'index.js');
        }

        (function _setupRoute(app, prouter) {
            //const router = server.Router();
            /* router_def:
            *       {
            *            router: express.Router object
            *            beforeChildren: function ()
            *            afterChildren: function ()
            *       }
            */

            routerdef = require(route_rel(app.name))(prouter);

            routerdef.beforeChildren();

            if (app.children_seq.length) {
                app.children_seq.forEach((capp) => {
                    _setupRoute(capp, routerdef.router).bind(this);
                });
            }

            routerdef.afterChildren();
        }).bind(this)(config.app, server);
    }


    return server;
}

module.exports = WebServer;
