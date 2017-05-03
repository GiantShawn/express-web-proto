const path = require('path');
const config = require('config');
const webpack = require('webpack');
const ExtractTextPlugin = require('extract-text-webpack-plugin');

function NewClientWebpackConfigBase(appname, options = {})
{
	/* options:
	*   entry: './main.js'
		*   publicPath: '/'
		*/
    const appconfig = config.getApp(appname);

	const common_webpack_config_template = {
		entry: {
			main: options.entry || './main.js',
		},
		output: {
			path: appconfig.config.build.outdir.dyn_js,
			filename: '[name]-[chunhash].js',
			//publicPath: 'dist/'
		},
		module: {
			rules: [
				{
					test: /\.js$/,
					exclude: /node_modules/,
					use: [{
						loader: 'babel-loader',
						options: {
							presets: ['env']
						}
					}]
				},
				{
					test: /.*\.scss$/,
					use: ExtractTextPlugin.extract({
						fallback: 'style-loader',
						use: [
							{ loader: 'css-loader' },
							{ loader: 'sass-loader'} ]})
				},
				{
					test: /\.css$/,
					use: ExtractTextPlugin.extract({
						fallback: 'style-loader',
						use: [
							{ loader: 'css-loader' },
						]})
				},
				{
					test: /\.(png|jpg|jpeg|gif)$/,
					use: ['url-loader?limit=5000',
						{
							loader: 'image-webpack-loader',
							options: {},
						}]
				},
				{
					test: /\.txt$/,
					use: [
						{
							loader: 'raw-loader'
						}
					]
				},
				{
					test: /\.html/,
					use: [
						{
							loader: 'file-loader',
							options: {
								name: '[path][name].[ext]',
							}

						},
						'extract-loader',
						"html-loader",
					]
				},
			]
		},
		plugins: [
			new ExtractTextPlugin('style.css'),
			new webpack.LoaderOptionsPlugin({
				// test: /\.xxx$/, // may apply this only for some modules
				options: {
					htmlLoader: {
						//attrs: ['img:src', 'link:href'],
					}
				}
			}),
		],

	};

	return common_webpack_config_template;
}

function NewServerWebpackConfigBase(options = {}) 
{
    const config = require('config');
    const serverconfig = config.server.config;
    const conf = {
        target: 'node',
		entry: {
			main: options.entry || path.join(serverconfig.build.indir, 'main.js'),
		},
		output: {
			path: serverconfig.rtpath.srv_repo,
			filename: '[name].js',
			//publicPath: 'dist/'
		},
		module: {
			rules: [
				{
					test: /\.js$/,
					exclude: /node_modules/,
					use: [{
						loader: 'babel-loader',
						options: {
							presets: ['env']
						}
					}]
				},
				{
					test: /\.txt$/,
					use: [
						{
							loader: 'raw-loader'
						}
					]
				},
			]
		},
		//plugins: [
		//],

	};
    return conf;
}


exports.NewClientWebpackConfigBase = NewClientWebpackConfigBase;
exports.NewServerWebpackConfigBase = NewServerWebpackConfigBase;
