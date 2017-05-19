'use strict';

const projutils = require('../../utils/proj');

module.exports = function (env) {
    projutils.setupProjBuildEnv(__dirname, env);

    const webpack = require('utils/webpack');
    const webpack_config = webpack.NewClientWebpackConfigBase(__dirname,
        {
            entry: 'index.tsx',
        });
    return webpack_config;
}
