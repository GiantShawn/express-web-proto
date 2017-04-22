'use strict';

const sprintf = require('sprintf-js').sprintf;
const fs = require('fs');
const path = require('path');
const process = require('process');
const assert = require('assert');

const NODE_ENV = process.env.NODE_ENV || 'production';

const ROOT_R     = path.resolve(__dirname);
const SERVER_SRC_ROOT = 'server';
const APP_SRC_ROOT    = 'apps';

const SERVER_OUT      = 'dist';

const STATIC_ROOT = path.join(SERVER_OUT, 'static');
const DYNAMIC_ROOT= path.join(SERVER_OUT, 'dynamic');
const SERVER_ROOT = path.join(SERVER_OUT, 'server');
const RUNTIME_ROOT= path.join(SERVER_OUT, 'runtime');

const HTML_DIR_NAME   = 'html';
const JS_DIR_NAME     = 'javascripts';
const CSS_DIR_NAME    = 'stylesheets';
const IMAGE_DIR_NAME  = 'images';
const VIDEO_DIR_NAME  = 'video';
const DATA_DIR_NAME   = 'data';
const PUG_DIR_NAME    = 'pug';


const ROOT_APP_R = path.resolve(__dirname, APP_SRC_ROOT);

const _ = require('lodash');
const debuglog = require('util').debuglog('config');


function getAllFiles(root, exts, tps)
{
    let files = [];
    exts = [].concat(exts);
    tps = [].concat(tps);
    fs.readdirSync(root).map((fname) => {
        if (_.some(exts, (test_ext) => {
            return _.some(tps, (tp) => {
                return fname.endsWith(sprintf('-%s.%s', tp, test_ext));
            })
        })) {
            files.push(path.join(root, fname));
        }
    });

    return files;
}

class AppConfig
{
    constructor(apppath, parent)
    {
        this.root = path.join(ROOT_R, apppath);
        this.name = apppath.replace(/\//g, '.');
        this.parent = parent;

        let sta_repo = path.resolve(__dirname, STATIC_ROOT);
        let dyn_repo = path.resolve(__dirname, DYNAMIC_ROOT);

        this.config =  {
            build: {
                infiles: {
                    sta_css:    getAllFiles(this.root, 'css', 's'),
                    dyn_css:    getAllFiles(this.root, 'css', 'd'),
                    //sta_sass:   getAllFiles(this.root, ['scss'], 's'),
                    dyn_sass:   getAllFiles(this.root, 'scss', 'd'),
                    sta_html:   getAllFiles(this.root, 'html', 's'),
                    dyn_html:   getAllFiles(this.root, 'html', 'd'),
                    sta_js:     getAllFiles(this.root, 'js', 's'),
                    dyn_js:     getAllFiles(this.root, 'js', 'd'),
                    sta_pug:    getAllFiles(this.root, 'pug', 's'), // all goes through webpack that generate html
                    dyn_pug:    getAllFiles(this.root, 'pug', 'd'),
                },
                outdir: {
                    sta_repo:   sta_repo,
                    dyn_repo:   dyn_repo,
                    sta_css:    path.join(sta_repo, CSS_DIR_NAME),
                    dyn_css:    path.join(dyn_repo, CSS_DIR_NAME),
                    sta_html:   path.join(sta_repo, HTML_DIR_NAME),
                    dyn_html:   path.join(dyn_repo, HTML_DIR_NAME),
                    sta_js:     path.join(sta_repo, JS_DIR_NAME),
                    dyn_js:     path.join(dyn_repo, JS_DIR_NAME),

                    dyn_pug:    path.join(dyn_repo, PUG_DIR_NAME),
                }
            },
            rt: {},
            routes: {},
        }

        this.children = Object.create(null);
    }
};


function constructAppConfigTree(root, parent = null)
{
    let apppath = root.substr(ROOT_R.length);
    if (apppath[0] === '/') {
        apppath = apppath.substr(1);
    }

    debuglog("apppath", apppath);

    let app_spec_config = null;
    try {
        app_spec_config = require(path.join(root, 'config.js'));
    } catch (e) {}

    let app_class = app_spec_config && app_spec_config.app_config_class(AppConfig) || AppConfig;

    let app = new app_class(apppath, parent);
    let children = fs.readdirSync(root).map((fname) => {
        let real_path = path.join(root, fname);
        if (fs.statSync(real_path).isDirectory()) {
            return constructAppConfigTree(real_path, app);
        } else {
            return null;
        }
    }).filter((o) => o);

    //debuglog(children);

    for (let c of children) {
        app.children[c.name.substr(app.name.length+1)] = c;
    }

    return app;
}
            
var ServerConfig;
function __createProductionServerConfig(env = 'production')
{
    class _ServerConfig
    {
        constructor()
        {
            let build_out_root = path.resolve(__dirname, SERVER_ROOT);
            let conf;
            this.config = conf = {
                build: {
                    outdir: build_out_root
                },
                rt: {
                    root: build_out_root,
                    working_dir: build_out_root,
                    sta_repo: config.app.config.build.outdir.sta_repo,
                    sta_repo_rel: null, // depends on sta_repo
                    dyn_repo: config.app.config.build.outdir.dyn_repo,
                    dyn_repo_rel: null, // depends on dyn_repo

                    sta_html_repo: config.app.config.build.outdir.sta_html,
                    sta_html_repo_rel: null, // depends on sta_html_repo
                    dyn_html_repo: config.app.config.build.outdir.dyn_html,
                    dyn_html_repo_rel: null, // depends on dyn_html_repo

                    sta_css_repo: config.app.config.build.outdir.sta_css,
                    sta_css_repo_rel: null, // depends on sta_css_repo
                    dyn_css_repo: config.app.config.build.outdir.dyn_css,
                    dyn_css_repo_rel: null, // depends on dyn_css_repo

                    dyn_sass_repo: config.app.config.build.outdir.dyn_sass,
                    dyn_sass_repo_rel: null, // depends on dyn_sass_repo

                    sta_js_repo: config.app.config.build.outdir.sta_js,
                    sta_js_repo_rel: null, // depends on sta_js_repo
                    dyn_js_repo: config.app.config.build.outdir.dyn_js,
                    dyn_js_repo_rel: null, // depends on dyn_js_repo

                    dyn_pug_repo: config.app.config.build.outdir.dyn_pug,
                    dyn_pug_repo_rel: null, // depends on dyn_pug_repo
                }
            }
            const rel_func = function (to) {
                return (wd = conf.rt.working_dir) => { return path.relative(wd, to); }; 
            };
            for (let repo_rel in conf.rt) {
                if (repo_rel.endsWith('_rel')) {
                    let ref_repo = repo_rel.substr(0, repo_rel.length-4);
                    conf.rt[repo_rel] = rel_func(conf.rt[ref_repo]);
                }
            }
        }
    };
    return _ServerConfig;
}

function __createDebugServerConfig()
{
    ////assert(NODE_ENV === 'debug', NODE_ENV);
    return __createProductionServerConfig('debug');
}

function __createWebpackDebugServerConfig()
{
    class _ServerConfig
    {
        constructor()
        {
            let build_out_root = path.resolve(__dirname, SERVER_SRC_ROOT);
            this.config = {
                build: {
                    outdir: build_out_root,
                },
                rt: {
                    root: build_out_root,
                    pug_root: path.join(build_out_root, 'pug'),
                },
            }
        }
    };

    return _ServerConfig;
}

if (NODE_ENV === 'production') {
    ServerConfig = __createProductionServerConfig();
} else if (NODE_ENV === 'debug') {
    ServerConfig = __createDebugServerConfig();
} else if (NODE_ENV === 'webpack-debug') {
    ServerConfig = __createWebpackDebugServerConfig();
} else {
    ServerConfig = __createDebugServerConfig();
}
    

//const gloal_app = new AppConfig();
//constructAppConfigTree(ROOT_APP_R)

const config = {
    env_class: NODE_ENV, // production, debug or webpack-debug
    app: null,           // app config tree
    server: null,        // server config
};
config.app = constructAppConfigTree(ROOT_APP_R);
config.server = new ServerConfig();

/*
var SOURCE_DIR  = 'src';
var RES_SOURCE_DIR = 'res';
var BUILD_DIR = 'public';
var SRV_BUILD_DIR = 'dist';
var IMG_REPO = [RES_SOURCE_DIR, 'images'].join('/');

config = {
    css_build_in    : [ [SOURCE_DIR, 'stylesheets', 'css', '*.css' ].join('/') ],
    sass_build_in   : [ [SOURCE_DIR, 'stylesheets', 'sass', '*.scss'].join('/') ],
    css_build_out   : [ BUILD_DIR, 'stylesheets' ].join('/'),

    pug_build_in    : [ [SOURCE_DIR, 'views', 'pug', '**', '*.pug' ].join('/') ],
    pug_build_out   : [SRV_BUILD_DIR, 'views', 'pug'].join('/'),
    html_build_out  : [BUILD_DIR].join('/'),

    srv_js_build_in : [ [SOURCE_DIR, 'srv-js', '**', '*.js'].join('/') ],
    srv_js_build_out: [SRV_BUILD_DIR].join('/'),

    img_repo        : IMG_REPO,
    img_build_in    : [ [IMG_REPO, '**', '*.(png|jpg|jpeg)'].join('/') ],
    img_build_out   : [BUILD_DIR, 'images'].join('/'),

    cli_js_build_in : [ [SOURCE_DIR, 'cli-js', '**', '*.js'].join('/') ],
    cli_js_build_out: [BUILD_DIR, 'javascripts'].join('/')
};

module.exports = config

if (require.main === module) {
    let process = require('process');
    let argv = require('minimist')(process.argv.slice(2));
    let path = require('path');
    const target = argv._[0];
    if (target === 'print_dirs') {
        let target_dirs = [];
        for (let prop in config) {
            let prop_val = config[prop];
            if (prop.endsWith('build_in') || prop.endsWith('build_out') || prop.endsWith('repo')) {
                let process_dir = (d) => {
                    let path_arr = d.split('/');
                    //console.log("prop_val", prop, prop_val, path_arr);
                    let [last, lastbut] = [path_arr[path_arr.length-1], path_arr[path_arr.length-2]];
                    let target_dir;
                    //console.log("last, lastbut", last, lastbut);
                    if (last && last.indexOf('*') >= 0) {
                        if (lastbut && lastbut.indexOf('*') >= 0) {
                            target_dir = path.resolve(__dirname, ...path_arr.slice(0, -2));
                        } else {
                            target_dir = path.resolve(__dirname, ...path_arr.slice(0, -1));
                        }
                    } else {
                        target_dir = path.resolve(__dirname, ...path_arr);
                    }
                    target_dirs.push([target_dir, prop]);
                    //console.log("target_dir", target_dir);
                }

                if (Array.isArray(prop_val)) {
                    Array.prototype.map.apply(prop_val, [process_dir]);
                } else {
                    process_dir(prop_val);
                }
            }
        }

        target_dirs.sort();
        //console.log("Target Dirs:", target_dirs);
        for (let p of target_dirs) {
            console.log(p[1], p[0]);
        }
    }
}
*/
module.exports = config

if (require.main === module) {
    console.log("config.env_class", config.env_class);
    console.log("config.app", config.app);
    console.log("config.server", config.server);
}
