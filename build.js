/* Build this project as a whole or seperate apps
*/

require('app-module-path').addPath('.');
const config = require('config')('build');
const mkdirp = require('mkdirp');
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const utils = require('utils');

if (require.main === module) {
    const process = require('process');
    const argv = require('minimist')(process.argv.slice(2));

    const env = argv._.length > 0 && argv._[0] || 'production';
    config.env_class = env;

    var rootapp = config.app;
    if (argv.app) {
        rootapp = config.getApp(argv.app);
    }
} else {
    config.env_class = 'production'; // by default to be production
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

    const paths = utils.flattenIterable(build_config.sta_resdir, build_config.dyn_resdir, build_config.null_dyn_resdir, build_config.routedir);
    for (let p of paths) {
        repos_p.push(new Promise((rsv, rej) => {
            mkdirp(p, (err, made) => {
                if (err) rej(err);
                else rsv(made && `[New] ${p}` || `[Exist] ${p}`);
            })}));
    }


    return Promise.all(repos_p).then((paths) => {
        console.log("Setup Server Directories Succeed.");
        for (let p of paths) {
            console.log("\t", p);
        }
    }, (err) => {
        console.error("Setup Server Directories Fail with reason:", err);
    });
}

function buildExpress()
{
    return new Promise((res, rej) => {
        let webpack_config_js = path.join(config.server.config.build.indir, 'webpack.config.js');
        fs.access(webpack_config_js, fs.constants.R_OK, function (err) {
            if (err) {
                rej("No webpack.config.js found for server build");
            } else {
                const webpack = require('webpack');
                let webpack_config = require(webpack_config_js);
                //console.log("server webpack config", webpack_config);
                let compiler = webpack(webpack_config);
                compiler.run(function (err, stats) {
                    // compiled
                    if (err) {
                        rej('Webpack server Error!');
                    } else {
                        console.log(`Webpack server Succeed!`);
                        res();
                    }
                });
            }
        });
    });
}
    

const APP_BUILD_STEPS = [
    /* app typescript tsconfig.js generation */
    function (app, res, rej) {
        let tsconfig_def_file = path.join(app.root, 'tsconfig-def.js');
        fs.access(tsconfig_def_file, fs.constants.R_OK, function (err) {
            if (err) {
                console.log(`No typescript files to transpile, do nothing for app[${app.name}].`);
                res();
            } else {
                let tsconfig = require(tsconfig_def_file);
                let tsconfig_file = path.join(app.root, 'tsconfig.json');
                fs.writeFile(tsconfig_file, JSON.stringify(tsconfig), function (err) {
                    if (err) {
                        rej(`Fail to write tsconfig.json to app[${app.name}].`);
                    } else {
                        console.log(`Generate tsconfig.js for app[${app.name}].`);
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
                console.log(`Can not open webpack.config.js for app [${app.name}].`);
                res();
            } else {
                let webpack_config = require(webpack_config_js);
                let compiler = webpack(webpack_config);
                compiler.run(function (err, stats) {
                    // compiled
                    if (err) {
                        rej(`Webpack app ${app.name} Error!`);
                    } else {
                        console.log(`Webpack app ${app.name} Succeed!`);
                        console.log(stats.toString());
                        res();
                    }
                });
            }
        });
    },
    /* app routes */
    function (app, res, rej) {
        let route_files = app.config.build.infiles.route_js;
        let pro = [];
        for (let route_file of route_files) {
            let out_route_file;
            if (route_file.includes('index'))
                out_route_file = 'index.js';
            else
                out_route_file = path.basename(route_file);

            pro.push(new Promise(function (res, rej) {
                fs.access(route_file, fs.constants.R_OK, function (err) {
                    if (err) {
                        rej(`Fail to copy router file[${route_file}] for app[${app.name}]!`);
                    } else {
                        copyFileAsync(route_file, path.join(app.config.build.outdir.route_js, out_route_file));
                        res();
                    }
                });
            }));
        }
        Promise.all(pro).then(res, rej)
    }
]

function buildApp(rootapp)
{
    if (!rootapp) {
        return Promise.reject();
    }

    function _buildApp(app) {
        console.log("Build App:", app.name, app.root);
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
        console.log("|-----  BUILD APPS SUCCEED!");
    }).catch(function (err) {
        console.log("|-----  BUILD APPS FAIL!");
        console.error(err);
    });

    return prom;

}

function copyFileAsync(src, dst)
{
    let rs = fs.createReadStream(src);
    rs.once('error', function (err) {
        console.error(`Fail to copy file[${src}] to [${dst}]`);
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
        console.log("BUILD SUCCEED!");
    }).catch((err) => {
        console.error("BUILD FAIL");
        console.error(err);
    });

}
