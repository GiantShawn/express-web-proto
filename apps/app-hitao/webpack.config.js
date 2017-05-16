'use strict';

const projutils = require('../../utils/proj');

module.exports = function (env) {
    projutils.setupProjBuildEnv(env, __dirname);

    const webpack = require('utils/webpack');
    const webpack_config = webpack.NewClientWebpackConfigBase(__dirname);
    return webpack_config;
}
