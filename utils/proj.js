'use strict';

const fs = require('fs');
const path = require('path');

exports.setupProjBuildEnv = function setupProjBuildEnv(env, dirname)
{
    const utils = require('./index');
    const env_class = env && env.env || 'webpack-debug';
    const build_mode = env && env.bmode || 'local';

    utils.loginfo("Build Environment: %s:%s", env_class, build_mode);

    const real_cwd = fs.realpathSync(process.cwd());
    const file_cwd = fs.realpathSync(dirname);

    if (real_cwd === file_cwd) {
        const path = require('path');
        const apps_comp = path.sep + 'apps' + path.sep;
        const root = file_cwd.substr(0, file_cwd.search(apps_comp));
        require('app-module-path').addPath(root);
    } else if (build_mode === 'local') {
        require("app-module-path").addPath('.');
    }
}
