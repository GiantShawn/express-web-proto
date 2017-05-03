/* Build this project as a whole or seperate apps
*/

require('app-module-path').addPath('.');
const config = require('config.js');
const mkdirp = require('mkdirp');
const assert = require('assert');
const path = require('path');
const fs = require('fs');

assert (require.main === module);

const process = require('process');
const argv = require('minimist')(process.argv.slice(2));

const env = argv._.length > 0 && argv._[0] || 'production';
config.env_class = env;

const rootapp = config.app;
if (argv.app) {
    rootapp = config.getApp(argv.app);
}


function setupServerDirectories()
{
    let repos_p = [];
    // server out dir
    //console.log("serverconfig", config.server.config);
    let outdir_p = new Promise((rsv, rej) => {
        mkdirp(config.server.config.build.outdir, (err, made) => {
            if (err) rej(err);
            else rsv(made && `[New] ${config.server.config.build.outdir}` || `[Exist] ${config.server.config.build.outdir}`);
        }); });

    repos_p.push(outdir_p);

    let rtpath = config.server.config.rtpath;
    for (let path_name in rtpath) {
        if (rtpath.hasOwnProperty(path_name) && path_name.endsWith('_repo')) {
            let path = rtpath[path_name];
            repos_p.push(new Promise((rsv, rej) => {
                mkdirp(path, (err, made) => {
                    if (err) rej(err);
                    else rsv(made && `[New] ${path}` || `[Exist] ${path}`);
                })}));
        }
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
                console.log("server webpack config", webpack_config);
                let compiler = webpack(webpack_config);
                compiler.run(function (err, stats) {
                    // compiled
                    if (err) {
                        rej(`Webpack server Error!`);
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
        console.log("BUILD APPS SUCCEED!");
    }).catch(function (err) {
        console.log("BUILD APPS FAIL!");
        console.error(err);
    });

    return prom;

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
    /* build apps */
    function (res, rej) {
        buildApp(rootapp).then(res, rej);
    }
];


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


