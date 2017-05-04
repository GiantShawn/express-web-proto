'use strict';

const webpack = require('utils/webpack');
const config = require('config')('build');
const appconfig = config.getAppByDir(__dirname);

const webpack_config = webpack.NewClientWebpackConfigBase(appconfig.name);

module.exports = webpack_config;
