/* Build this project as a whole or seperate apps
*/

const config = require('./config.js');
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

    Promise.all(repos_p).then((paths) => {
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
    function _buildApp(app) {
        const webpack = require('webpack');
        console.log(app.name, app.root);
        let webpack_config_js = path.join(app.root, 'webpack.config.js');
        fs.access(webpack_config_js, fs.constants.R_OK, function (err) {
            if (err) {
                console.error(`Can not open webpack.config.js for app [${app.name}].`);
            } else {
                let webpack_config = require(webpack_config_js);
                let compiler = webpack(webpack_config);
                compiler.run(function (err, stats) {
                    // compiled
                    if (err) {
                        console.error(`Webpack app ${app.name} Error!`);
                    } else {
                        console.log(`Webpack app ${app.name} Succeed!`);
                    }
                });
            }
        });
    }
    
    let q = [rootapp];
    while (q.length) {
        let e = q.shift();
        _buildApp(e);
        q = q.concat(e.children_seq);
        //console.log(e.name, e.children_seq, q);
    }
}

if (require.main === module) {
    let process = require('process');
    let argv = require('minimist')(process.argv.slice(2));
    let path = require('path');

    const env = argv._.length > 0 && argv._[0] || 'production';
    config.env_class = env;

    // setup neccesary output directories
    setupServerDirectories()

    let app = config.app;
    if (argv.app) {
        let appname = argv.app;
        //let apppath = appname.replace(/\./g, path.sep);
        let appstack = appname.split('.');
        assert(app.name === appstack[0]);
        appstack = appstack.slice(1);
        while (appstack.length) {
            let subappname = appstack.pop();
            app = app.children[subappname];
        }
    }

    buildApp(app);
}
