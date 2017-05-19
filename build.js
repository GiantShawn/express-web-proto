#!/usr/bin/env node
/* Build this project as a whole or seperate apps
*/

require('app-module-path').addPath('.');
const assert = require('assert');
const mkdirp = require('mkdirp');
const path = require('path');
const fs = require('fs');
const utils = require('utils');
const lo = require('lodash');
//assert (require.main === module);

var argv;
if (require.main === module)
    argv = require('minimist')(process.argv.slice(2));
else
    argv = null;

//const build_target = argv._[0];
var config;
var build_mode;

function initBuild(env)
{
    const projutils = require('./utils/proj');
    projutils.setupProjBuildEnv(__dirname, env || 'debug');
    config = require('config')('build');
}

exports.initBuild = initBuild;


if (argv) {
    /* Command line arguments:
    * env: build environment. [production|debug|webpack-debug](debug)
    *
    * -------------------------
    * This script always build project in `global` mode
    */
    initBuild(argv.env);

    var rootapp = config.app;
    if (argv.app) {
        rootapp = config.getApp(argv.app);
        if (!rootapp)
            process.exit(1);
    }
}


function setupServerDirectories()
{
    let repos_p = [];
    // server out dir
    //console.log("serverconfig", config.server.config);
    const build_config = config.server.config.build;
    let outdir_p = new Promise((rsv, rej) => {
        mkdirp(build_config.outdir, (err, made) => {
            if (err) rej(err);
            else rsv(made && `[New] ${build_config.outdir}` || `[Exist] ${build_config.outdir}`);
        }); });

    repos_p.push(outdir_p);

    const paths = utils.flattenIterable(build_config.sta_resdir, build_config.dyn_resdir, build_config.null_dyn_resdir);
    for (let p of paths) {
        repos_p.push(new Promise((rsv, rej) => {
            mkdirp(p, (err, made) => {
                if (err) rej(err);
                else rsv(made && `[New] ${p}` || `[Exist] ${p}`);
            })}));
    }


    return Promise.all(repos_p).then((paths) => {
        utils.logimp("Setup Server Directories Succeed.");
        for (let p of paths) {
            utils.loginfo("\t", p);
        }
    }, (err) => {
        utils.logerror("Setup Server Directories Fail with reason:%s", err);
    });
}

function buildExpress()
{
    const autodo = require('async/auto');
    function writeDefinitionFile(def_type, in_def_file_prop, default_def_files, out_def_file, out_name, callback)
    {

        const header = 
`'use strict';
module.exports = function (app) {
`;
        const tail = '\n}';

        let content = '';
        let app = config.app;
        //const app_path_root = path.join('..', config.app.root);
        //console.log('app_path_root', app_path_root);
        let q = [app];
        while (q.length) {
            let c = q.shift();
            const appname = c.name.split('.').slice(1);
            const apppath = c.apppath;
            let in_def_file = c.config.build.infiles[in_def_file_prop];
            if (!in_def_file) {
                for (let p of default_def_files) {
                    try {
                        fs.accessSync(path.join(apppath, p), fs.constants.R_OK);
                    } catch (e) {
                        continue;
                    }
                    in_def_file = p;
                    break;
                }
            }

            if (!in_def_file) {
                utils.logtips(`No ${def_type} definition is found for app[${c.name}]`);
                content += 'app' + appname.map((n) => ".children['" + n + "']") + '.' + out_name + ' = null;\n';
            } else {
                content += 'app' + appname.map((n) => ".children['" + n + "']");
                content += path.join('.' + out_name + ' = require("..', c.apppath, `${in_def_file}");\n`);
            }
            q = q.concat(c.children_seq);
        }

        fs.writeFile(out_def_file, header + content + tail, callback);
    }
    return new Promise((res, rej) => {
        autodo({
            out_router_def: function (cb) {
                writeDefinitionFile('router', 'router_js', ['router.ts', 'router.js'],
                    config.server.config.build.router_def, 'router_module', cb);
            },
            out_webpack_def: function (cb) {
                writeDefinitionFile('webpack', null, ['webpack.config.js'],
                    config.server.config.build.webpack_def, 'webpack_module', cb);
            },
            out_apps_def: function (cb) {
                fs.writeFile(config.apps_def, JSON.stringify(config.app.toRuntimeJSON()), cb);
            },
            webpack: ['out_router_def', 'out_apps_def', 'out_webpack_def', function (result, cb) {
                let webpack_config_js = path.join(config.server.config.build.indir, 'webpack.config.js');
                fs.access(webpack_config_js, fs.constants.R_OK, function (err) {
                    if (err) {
                        cb("No webpack.config.js found for server build");
                    } else {
                        const webpack = require('webpack');
                        let webpack_config = require(webpack_config_js);
                        let compiler = webpack(webpack_config);
                        compiler.run(function (err, stats) {
                            // compiled
                            if (err) {
                                cb('Webpack server Error!');
                            } else {
                                utils.logimp(`Webpack server Succeed!`);
                                cb(null);
                            }
                        });
                    }
                });
            }],
        }, (err, result) => {
            if (err) rej(err);
            else res();
        });
    });
}
    

const APP_BUILD_STEPS = [
    /* app typescript tsconfig.js generation */
    function (app, res, rej) {
        let tsconfig_def_file = path.join(app.root, 'tsconfig-def.js');
        fs.access(tsconfig_def_file, fs.constants.R_OK, function (err) {
            if (err) {
                utils.logtips(`No typescript files to transpile, do nothing for app[${app.name}].`);
                res();
            } else {
                let tsconfig = require(tsconfig_def_file);
                let tsconfig_file = path.join(app.root, 'tsconfig.json');
                fs.writeFile(tsconfig_file, JSON.stringify(tsconfig), function (err) {
                    if (err) {
                        rej(`Fail to write tsconfig.json to app[${app.name}].`);
                    } else {
                        utils.loginfo(`Generate tsconfig.js for app[${app.name}].`);
                        res();
                    }
                });
            }
        });
    },
    /* app webpack */
    function (app, res, rej) {
        const webpack = require('webpack');
        let webpack_config_js = path.join(app.root, 'webpack.config.js');
        fs.access(webpack_config_js, fs.constants.R_OK, function (err) {
            if (err) {
                utils.logtips(`Can not open webpack.config.js for app [${app.name}].`);
                res();
            } else {
                let webpack_config = require(webpack_config_js)(config.env_class);
                let compiler = webpack(webpack_config);
                compiler.run(function (err, stats) {
                    // compiled
                    if (err) {
                        rej(`Webpack app ${app.name} Error!`);
                    } else {
                        utils.logimp(`Webpack app ${app.name} Succeed!`);
                        utils.loginfo(stats.toString());
                        res();
                    }
                });
            }
        });
    },
]

function buildApp(rootapp)
{
    if (!rootapp) {
        return Promise.reject();
    }

    function _buildApp(app) {
        utils.logimp("Build App %s:%s", app.name, app.root);
        let prom = Promise.resolve();
        for (let step_func of APP_BUILD_STEPS) {
            prom = prom.then(() => new Promise(
                (res, rej) => step_func(app, res, rej)));
        }
        return prom;
    }
    
    let q = [rootapp];
    let prom = Promise.resolve();
    while (q.length) {
        let e = q.shift();
        prom = prom.then(() => _buildApp(e));
        q = q.concat(e.children_seq);
        //console.log(e.name, e.children_seq, q);
    }
    prom.then(function () {
        utils.logimp("Build Apps Succeed!");
    }).catch(function (err) {
        utils.logerror_noexit("Build Apps Fail!");
        console.log(err);
    });

    return prom;

}

function copyFileAsync(src, dst)
{
    let rs = fs.createReadStream(src);
    rs.once('error', function (err) {
        utils.logtips(`Fail to copy file[${src}] to [${dst}]`);
    });
    rs.pipe(fs.createWriteStream(dst));
}

function setupExternals(rootapp)
{
    function _setupExternals(app) {
        let buildconfig = app.config.build;
        for (let ftype in buildconfig.externals) {
            if (buildconfig.outdir[ftype]) {
                let exts = buildconfig.externals[ftype];
                let outdir = buildconfig.outdir[ftype];
                for (let dst in exts) {
                    let src = exts[dst];
                    if (src.startsWith('$')) {
                        // project root
                        src = __dirname + src.substr(1);
                    } else if (src.startsWith('./')) {
                        src = path.join(app.root, src);
                    }

                    dst = path.join(outdir, dst);

                    copyFileAsync(src, dst);
                }
            }
        }
    }


    let q = [rootapp];
    while (q.length) {
        let c = q.shift();
        q = q.concat(c.children_seq);

        _setupExternals(c); // run simutaneously
    }

    return Promise.resolve();
}

const SRV_BUILD_STEPS = [
    /* setup directories */
    function (res, rej) {
        setupServerDirectories().then(res, rej);
    },
    /* express.js server build */
    function (res, rej) {
        buildExpress().then(res, rej);
    },
    /* setup externals */
    function (res, rej) {
        setupExternals(rootapp).then(res, rej);
    },
    /* build apps */
    function (res, rej) {
        buildApp(rootapp).then(res, rej);
    },
];

exports.setupServerDirectories = setupServerDirectories;
exports.buildExpress = buildExpress;
exports.buildApp = buildApp;
exports.setupExternals = setupExternals;


if (require.main === module) {
    /* Start build process */

    let prom = Promise.resolve();
    for (let step_func of SRV_BUILD_STEPS) {
        prom = prom.then(() => new Promise(step_func));
    }
    prom.then(() => {
        utils.logimp("BUILD SUCCEED!");
    }).catch((err) => {
        utils.logerror_noexit("BUILD FAIL");
        console.log(err);
    });

}
