'use strict';

const config = require('config')('build');
const path = require('path');

const base = {
    compilerOptions: {
        "outDir": ".",
        "noImplicitAny": true,
        "module": "commonjs",
        "target": "es5",
        "jsx": "react",
        "allowJs": true,
    },
    include: [
        "*.ts",
        "*.tsx"
    ],
    awesomeTypescriptLoaderOptions: {
        "useBabel": true,
        "useCache": true,
        "babelCore": path.join(config.project_root, 'node_modules', 'babel-core'), // used by webpack local mode
    }

}

module.exports = function (apppath) {
    let app = config.getAppByDir(apppath);
    let conf = Object.assign({}, base);

    conf.compilerOptions.outDir = app.config.build.outdir.dyn_js;

    if (config.env_class === 'production') {
        conf.compilerOptions.sourceMap = false;
    } else {
        conf.compilerOptions.sourceMap = true;
    }
    return conf;
}
        
