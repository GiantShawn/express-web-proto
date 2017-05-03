/* Build this project as a whole or seperate apps
*/

require('app-module-path').addPath('.');
const config = require('config.js');
const mkdirp = require('mkdirp');
const assert = require('assert');
const path = require('path');
const fs = require('fs');

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

function buildApp(rootapp)
{
    if (!rootapp) {
        return
    }

    function _buildApp(app) {
        console.log("Build App:", app.name, app.root);

        const webpack = require('webpack');
        let webpack_config_js = path.join(app.root, 'webpack.config.js');
        return new Promise((res, rej) => {
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
        });
    }
    
    let q = [rootapp];
    let prom = Promise.resolve();
    while (q.length) {
        let e = q.shift();
        prom = prom.then(() => _buildApp(e));
        q = q.concat(e.children_seq);
        //console.log(e.name, e.children_seq, q);
    }
    prom.catch(function (err) {
            console.error(err);
        });

}

if (require.main === module) {
    let process = require('process');
    let argv = require('minimist')(process.argv.slice(2));
    let path = require('path');

    const env = argv._.length > 0 && argv._[0] || 'production';
    config.env_class = env;

    // setup neccesary output directories
    setupServerDirectories().then(function () {
        let app = config.app;
        if (argv.app) {
            app = config.getApp(argv.app);
        }

        buildApp(app);
    });
}
