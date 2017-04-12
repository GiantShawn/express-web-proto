'use strict';

var sprintf = require('sprintf-js').sprintf;
var fs = require('fs');
var path = require('path');

const ROOT_R     = path.resolve(__dirname);
const SERVER_ROOT = 'server';
const APP_ROOT    = 'apps';
const SERVER_OUT  = 'dist';

const STATIC_ROOT = path.join(SERVER_OUT, 'static');
const DYNAMIC_ROOT= path.join(SERVER_OUT, 'dynamic');
const RUNTIME_ROOT= path.join(SERVER_OUT, 'runtime');

const HTML_DIR_NAME   = 'html';
const JS_DIR_NAME     = 'javascripts';
const CSS_DIR_NAME    = 'stylesheets';
const IMAGE_DIR_NAME  = 'images';
const VIDEO_DIR_NAME  = 'video';
const DATA_DIR_NAME    = 'data';


const ROOT_APP_R = path.resolve(__dirname, APP_ROOT);


function getAllFiles(root, exts, tp)
{
    let files = [];
    fs.readdirSync(root).map((fname) => {
        for (let test_ext of exts) {
            if (fname.endsWith('.' + test_ext) && fname.endsWith(sprintf('-%s.%s', tp, test_ext))) {
                files.push(path.join(root, fname));
            }
        }
    });

    return files;
}

class AppConfig
{
    constructor(apppath)
    {
        this.root = path.join(ROOT_R, apppath);
        this.appame = apppath.replace('/', '.');

        this.config =  {
            build: {
                infiles: {
                    sta_css:    getAllFiles(this.root, ['css'], 's'),
                    dyn_css:    getAllFiles(this.root, ['css'], 'd'),
                    sta_sass:   getAllFiles(this.root, ['scss'], 's'),
                    dyn_sass:   getAllFiles(this.root, ['scss'], 'd'),
                    sta_html:   getAllFiles(this.root, ['html'], 's'),
                    dyn_html:   getAllFiles(this.root, ['html'], 'd'),
                    sta_js:     getAllFiles(this.root, ['js'], 's'),
                    dyn_js:     getAllFiles(this.root, ['js'], 'd'),
                    sta_pug:    getAllFiles(this.root, ['pug'], 's'),
                    dyn_pug:    getAllFiles(this.root, ['pug'], 'd'),
                },
                outdir: {
                    sta_css:    path.resolve(__dirname, STATIC_ROOT, CSS_DIR_NAME),
                    dyn_css:    path.resolve(__dirname, DYNAMIC_ROOT, CSS_DIR_NAME),
                    sta_html:   path.resolve(__dirname, STATIC_ROOT, HTML_DIR_NAME),
                    dyn_html:   path.resolve(__dirname, DYNAMIC_ROOT, HTML_DIR_NAME),
                    sta_js:     path.resolve(__dirname, STATIC_ROOT, JS_DIR_NAME),
                    dyn_js:     path.resolve(__dirname, DYNAMIC_ROOT, JS_DIR_NAME),
                }
            },
            rt: {},
            routes: {},
        }

        this.children = [];
    }
};


function constructAppConfigTree(root)
{
    let apppath = root.substr(ROOT_R.length);
    if (apppath[0] == '/') {
        apppath = apppath.substr(1);
    }

    let app_spec_config = null;
    try {
        app_spec_config = require(path.join(root, 'config.js'));
    } catch (e) {}

    let app_class = app_spec_config && app_spec_config.app_config_class(AppConfig) || AppConfig;

    let app = new app_class(apppath);
    app.children = fs.readdirSync(root).map((fname) => {
        let real_path = path.join(root, fname);
        if (fs.statSync(real_path).isDirectory()) {
            return constructAppConfigTree(real_path);
        } else {
            return null;
        }
    }).filter((o) => o);

    return app;
}
            
class ServerConfig
{
    constructor()
    {
    }
};

//const gloal_app = new AppConfig();
//constructAppConfigTree(ROOT_APP_R)

const config = {
    app:  constructAppConfigTree(ROOT_APP_R),
    server: new ServerConfig(),
};

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
