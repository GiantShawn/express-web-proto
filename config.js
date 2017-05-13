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
const NULL_SERVER_OUT = path.join(SERVER_OUT, 'null');

const STATIC_ROOT = path.join(SERVER_OUT, 'static');
const DYNAMIC_ROOT= path.join(SERVER_OUT, 'dynamic');
const SERVER_ROOT = path.join(SERVER_OUT, 'server');
const SERVER_ROOT_R = path.join(ROOT_R, SERVER_ROOT);
const PUB_DYNAMIC_ROOT = 'dynamic';

const HTML_DIR_NAME   = 'html';
const JS_DIR_NAME     = 'javascripts';
const CSS_DIR_NAME    = 'stylesheets';
const SASS_DIR_NAME   = 'stylesheets/sass';
const IMAGE_DIR_NAME  = 'images';
const VIDEO_DIR_NAME  = 'video';
const DATA_DIR_NAME   = 'data';
const PUG_DIR_NAME    = 'pug';

const ROUTE_DIR_NAME  = 'routes';


const ROOT_APP_R = path.resolve(__dirname, APP_SRC_ROOT);
const ROUTE_REPO_R = path.join(SERVER_ROOT_R, ROUTE_DIR_NAME);
const ROUTE_REPO_APP_R = path.join(ROUTE_REPO_R, APP_SRC_ROOT);

const lo = require('lodash');
const debuglog = require('util').debuglog('config');
const util = require('util');


function getAllFiles(root, exts, tps)
{
    let files = [];
    exts = [].concat(exts);
    tps = [].concat(tps);
    fs.readdirSync(root).map((fname) => {
        if (lo.some(exts, (test_ext) => {
            return lo.some(tps, (tp) => {
                return fname.endsWith(sprintf('-%s.%s', tp, test_ext));
            })
        })) {
            files.push(path.join(root, fname));
        }
    });

    return files;
}

function  getBuildFiles(root)
{
    let build_config_file = path.join(root, 'config.js');
    let default_build_files = {
        /* -<storage-bid><role-bid>
         * storage-bid: s   static
         *              d   dynamic
         *              v   server
         * role-bid(with storage-bid==server): 
         *              l   server logic
         *              r   route
         */
        // client files
        sta_css:    getAllFiles(root, 'css', 's'),
        dyn_css:    getAllFiles(root, 'css', 'd'),
        //sta_sass:   getAllFiles(this.root, ['scss'], 's'),
        dyn_sass:   getAllFiles(root, 'scss', 'd'),
        sta_html:   getAllFiles(root, 'html', 's'),
        dyn_html:   getAllFiles(root, 'html', 'd'),
        sta_js:     getAllFiles(root, 'js', 's'),
        dyn_js:     getAllFiles(root, 'js', 'd'),
        sta_ts:     getAllFiles(root, ['ts', 'tsx'], 's'),
        dyn_ts:     getAllFiles(root, ['ts', 'tsx'], 'd'),
        sta_pug:    getAllFiles(root, 'pug', 's'), // all goes through webpack that generate html
        dyn_pug:    getAllFiles(root, 'pug', 'd'),

        // server files (always 'dynamic')
        srv_js:     getAllFiles(root, 'js', 'vl'),
        route_js:   getAllFiles(root, 'js', 'vr'),
    };
    //console.log("getBuildFiles", root, default_build_files);
    try {
        fs.accessSync(build_config_file, fs.constants.R_OK);
        let build_config = require(build_config_file);
        let file_catalog = build_config.file_catalog;
        return lo.mergeWith(default_build_files, lo.pick(file_catalog, Object.keys(default_build_files)), (dst, src) => {
            if (lo.isArray(dst)) {
                assert(lo.isArray(src) || lo.isString(src));
                return dst.concat(src);
            }
            return src;
        });
    } catch (e) {
        return default_build_files;
    }
}

const __global_outdir = (function () {
    let sta_repo = path.join(ROOT_R, STATIC_ROOT);
    let dyn_repo = path.join(ROOT_R, DYNAMIC_ROOT);
    let null_dyn_repo = path.join(ROOT_R, NULL_SERVER_OUT);

    let srv_repo = SERVER_ROOT_R
    let route_repo = ROUTE_REPO_R

    return {
        sta_repo:   sta_repo,
        dyn_repo:   dyn_repo,
        null_dyn_repo: null_dyn_repo,

        sta_css:    path.join(sta_repo, CSS_DIR_NAME),
        dyn_css:    path.join(dyn_repo, CSS_DIR_NAME),
        dyn_sass:   path.join(dyn_repo, SASS_DIR_NAME),

        sta_html:   path.join(sta_repo, HTML_DIR_NAME),
        dyn_html:   path.join(dyn_repo, HTML_DIR_NAME),
        dyn_pug:    path.join(dyn_repo, PUG_DIR_NAME),
        null_dyn_html: path.join(null_dyn_repo, HTML_DIR_NAME),

        sta_js:     path.join(sta_repo, JS_DIR_NAME),
        dyn_js:     path.join(dyn_repo, JS_DIR_NAME),

        // server files
        srv_js: srv_repo, // the root of server binary
        route_js: route_repo, // the root of server routes
    };
})();

function getAllAppsDirs(config, prefix)
{
    let paths = new Set();
    let q = [config.app];
    while (q.length) {
        let app = q.shift();
        //console.log("Dir", app);
        let paths_obj = app.config.build.outdir;
        for (let p in paths_obj) {
            if (p.startsWith(prefix)) {
                paths.add(paths_obj[p]);
            }
        }
        q = q.concat(app.children_seq);
    }
    return paths;
}

class AppConfig
{
    constructor(apppath, parent, config_env)
    {
        this.root = path.join(ROOT_R, apppath);
        this.apppath = apppath;
        this.name = apppath.replace(new RegExp(path.sep, 'g'), '.');
        this.parent = parent;

        this.config =  {}
        
        if (config_env === 'build') {
            let all_build_files = getBuildFiles(this.root);
            this.config.build = {
                infiles: all_build_files,
                outdir: lo.assign({}, __global_outdir,
                    {
                        route_js: path.join(__global_outdir.route_js, apppath) /* the root of server routes */
                    }),
                pubroot: PUB_DYNAMIC_ROOT,
                externals: {}

            }
        }

        this.children = Object.create(null);
        this.children_seq = null;
    }

};


function constructAppConfigTree(root, approot, parent, config_env)
{
    let apppath = approot.substr(root.length);
    if (apppath[0] === '/') {
        apppath = apppath.substr(1);
    }

    //debuglog("apppath", apppath);

    let app_spec_config = null;
    try {
        app_spec_config = require(path.join(approot, 'config.js'));
    } catch (e) {
        if (e.code !== 'MODULE_NOT_FOUND')
            console.error(e)
    }

    let app_class = app_spec_config && app_spec_config.app_config_class(AppConfig) || AppConfig;

    let app = new app_class(apppath, parent, config_env);
    let children = fs.readdirSync(approot).map((fname) => {
        let real_path = path.join(approot, fname);
        if (fs.statSync(real_path).isDirectory() && fname.startsWith('app-')) {
            return constructAppConfigTree(root, real_path, app, config_env);
        } else {
            return null;
        }
    }).filter((o) => o);

    //debuglog(children);

    for (let c of children) {
        app.children[c.name.substr(app.name.length+1)] = c;
    }
    children.sort((a, b) => { return (a.hasOwnProperty('priority') && a.priority || 100) - (b.hasOwnProperty('priority') && b.priority || 100); });
    app.children_seq = children;

    return app;
}
            
var ServerConfig;
function __createProductionServerConfig(env = 'production')
{
    class _ServerConfig
    {
        constructor(config, config_env)
        {
            let build_out_root = path.resolve(__dirname, SERVER_ROOT);
            let working_dir = path.resolve(__dirname, SERVER_OUT);
            let build_in_root = path.resolve(__dirname, SERVER_SRC_ROOT);
            let route_repo = path.join(SERVER_ROOT_R, ROUTE_DIR_NAME);
            let conf;
            this.config = conf = {}
            if (config_env === 'build') {
                conf.build = {
                    indir: build_in_root,
                    outdir: build_out_root,
                    routeroot: route_repo,
                    sta_resdir: getAllAppsDirs(config, 'sta'),
                    dyn_resdir: getAllAppsDirs(config, 'dyn'),
                    null_dyn_resdir: getAllAppsDirs(config, 'null_dyn'),
                    routedir: getAllAppsDirs(config, 'route'),
                    working_dir: working_dir,
                }
            } else if (config_env === 'server') {
                conf.rtpath = {
                    root: build_out_root,
                    working_dir: working_dir,
                    sta_repo: __global_outdir.sta_repo,
                    sta_repo_rel: null, // depends on sta_repo
                    dyn_repo: __global_outdir.dyn_repo,
                    dyn_repo_rel: null, // depends on dyn_repo
                    null_dyn_repo: __global_outdir.null_dyn_repo,
                    null_dyn_repo_rel: null, // depends on null_dyn_repo

                    sta_html_repo: __global_outdir.sta_html,
                    sta_html_repo_rel: null, // depends on sta_html_repo
                    dyn_html_repo: __global_outdir.dyn_html,
                    dyn_html_repo_rel: null, // depends on dyn_html_repo
                    null_dyn_html_repo: __global_outdir.null_dyn_html,
                    null_dyn_html_repo_rel: null, // depends on null_dyn_html_repo

                    sta_css_repo: __global_outdir.sta_css,
                    sta_css_repo_rel: null, // depends on sta_css_repo
                    dyn_css_repo: __global_outdir.dyn_css,
                    dyn_css_repo_rel: null, // depends on dyn_css_repo

                    dyn_sass_repo: __global_outdir.dyn_sass,
                    dyn_sass_repo_rel: null, // depends on dyn_sass_repo

                    sta_js_repo: __global_outdir.sta_js,
                    sta_js_repo_rel: null, // depends on sta_js_repo
                    dyn_js_repo: __global_outdir.dyn_js,
                    dyn_js_repo_rel: null, // depends on dyn_js_repo

                    dyn_pug_repo: __global_outdir.dyn_pug,
                    dyn_pug_repo_rel: null, // depends on dyn_pug_repo

                    srv_repo: __global_outdir.srv_js,
                    srv_repo_rel: null, // depends on srv_repo
                    route_repo: __global_outdir.route_js,
                    route_repo_rel: null, // depends on route_repo
                }
                const rel_func = function (to) {
                    return (wd = conf.rtpath.working_dir) => { return path.relative(wd, to); }; 
                };
                for (let repo_rel in conf.rtpath) {
                    if (repo_rel.endsWith('_rel')) {
                        let ref_repo = repo_rel.substr(0, repo_rel.length-4);
                        conf.rtpath[repo_rel] = rel_func(conf.rtpath[ref_repo]);
                    }
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
                rtpath: {
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

var CONFIG_MAP = {};

function ConfigGenerator(config_env) {
    if (CONFIG_MAP[config_env])
        return CONFIG_MAP[config_env];

    const config = CONFIG_MAP[config_env] = {
        env_class: NODE_ENV, // production, debug or webpack-debug
        env: {
            static_frontend: null,
        },
        app: null,           // app config tree
        server: null,        // server config

        getApp(fullappname) {
            let appstack = fullappname.split('.');
            if (appstack[0] !== this.app.name) {
                console.error("Only accept absolute app name in getApp", fullappname);
                return null;
            }
                
            let app = this.app;
            appstack = appstack.slice(1);
            while (appstack.length) {
                app = app.children[appstack.shift()]}
            return app;
        },

        getAppByDir(apppath) {
            let rel_root = path.relative(this.app.root, apppath);
            return this.getApp(path.join(this.app.name, rel_root).replace(new RegExp(path.sep, 'g'), '.'));
        },

        project_root: ROOT_R,
            
    };
    if (config_env === 'build') {
        config.app = constructAppConfigTree(ROOT_R, ROOT_APP_R, null, config_env);
    } else if (config_env == 'server') {
        config.app = constructAppConfigTree(ROUTE_REPO_R, ROUTE_REPO_APP_R, null, config_env);
    }
    config.server = new ServerConfig(config, config_env);

    // copy server runtime configure to apps
    if (false) {
    (function () {
        let server_rt = config.server.config.rtpath;
        let q = [config.app];
        while (q.length) {
            let app = q.shift();
            app.config.rtpath = Object.assign({}, server_rt);
            /*
            for (let rel_prop in app.config.rtpath) {
                if (rel_prop.endsWith('_rel')) {
                    let prop = app.config.rtpath[rel_prop];
                    app.config.rtpath[rel_prop] = prop(app.root);
                }
            }
            */
            q = q.concat(lo.values(app.children));
        };
    }());
    }

    return config;
}

module.exports = ConfigGenerator;

if (require.main === module) {
    function prettyOutput(name, obj) {
        const util = require('util');
        console.log(`--------  ${name} -----------`);
        console.log(util.inspect(obj, {depth: null}));
        console.log();
    }

    let config = ConfigGenerator('server');

    prettyOutput("config.env_class", config.env_class);
    prettyOutput("config.app", config.app);
    prettyOutput("config.server", config.server);
}
