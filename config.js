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
