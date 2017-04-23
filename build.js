/* Build this project as a whole or seperate apps
*/

const config = require('./config.js');
const mkdirp = require('mkdirp');



function setupServerDirectories()
{
    let repos_p = [];
    // server out dir
    console.log("serverconfig", config.server.config);
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

if (require.main === module) {
    let process = require('process');
    let argv = require('minimist')(process.argv.slice(2));
    let path = require('path');
    //const target = argv._[0];

    // setup neccesary output directories
    setupServerDirectories()
}
