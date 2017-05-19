'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');
const lo = require('lodash');

exports.setupProjBuildEnv = function setupProjBuildEnv(dirname, env_class)
{
    const utils = require('./index');
    env_class = env_class || 'webpack-debug';

    utils.logimp("Build Environment: %s", env_class);
    assert(lo.includes(['production', 'debug', 'webpack-debug'], env_class));
    process.env.NODE_ENV = env_class;

    const real_cwd = fs.realpathSync(process.cwd());
    const file_cwd = fs.realpathSync(dirname);
    if (real_cwd === file_cwd) {
        const path = require('path');
        const apps_comp = path.sep + 'apps' + path.sep;
        const root = file_cwd.substr(0, file_cwd.search(apps_comp));
        require('app-module-path').addPath(root);
    }
}
