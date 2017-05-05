const path = require('path');
const config = require('config')('build');
const webpack = require('webpack');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const fs = require('fs');

function getClientEntryFile(apppath)
{
    const candidates = ['main.js', 'main.tsx', 'main.ts', 'index.js', 'index.tsx', 'index.ts'].map((v) => path.join(apppath, v));
    for (let c of candidates) {
        try {
            fs.accessSync(c, fs.constants.R_OK);
            return c;
        } catch (e) {
            ;//console.log("Can not read candidate", e);
        }
    }
    throw Error("Can not get client entry file from candidates:" + candidates.toString());
    return null;
}

function NewClientWebpackConfigBase(apppath, options = {})
{
	/* options:
	*   entry: './main.js'
		*   publicPath: '/'
		*/
    const appconfig = config.getAppByDir(apppath);

	const common_webpack_config_template = {
        //context: apppath,
		entry: {
			main: options.entry || getClientEntryFile(apppath),
		},
		output: {
			path: appconfig.config.build.outdir.dyn_js,
			//filename: '[name]-[chunhash].js',
            filename: '[name].js',
			//publicPath: 'dist/'
		},
		resolve: {
			// Add '.ts' and '.tsx' as resolvable extensions.
			extensions: [".ts", ".tsx", ".js", ".json"]
		},
		module: {
			rules: [
                {
                    test: /\.tsx?$/,
                    use: {
                        loader: "awesome-typescript-loader",
                        options: {
                            configFileName: path.join(apppath, 'tsconfig.json')
                        }
                    }
                },
                { 
                    enforce: "pre",
                    test: /\.js$/,
                    use: "source-map-loader",
                },
				{
					test: /\.js$/,
					exclude: /node_modules/,
					use: [{
						loader: 'babel-loader',
						options: {
							presets: ['env', 'react']
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
					use: 'raw-loader'
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

		// When importing a module whose path matches one of the following, just
		// assume a corresponding global variable exists and use that instead.
		// This is important because it allows us to avoid bundling all of our
		// dependencies, which allows browsers to cache those libraries between builds.
		externals: {
			"react": "React",
			"react-dom": "ReactDOM"
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

    if (config.env_class !== 'production') {
        common_webpack_config_template.devtool = 'source-map';
    }

	return common_webpack_config_template;
}

function NewServerWebpackConfigBase(options = {}) 
{
    const serverconfig = config.server.config;
    const conf = {
        target: 'node',
        node : {
            __dirname: true
        },
        resolve: {
            modules: [config.project_root, path.join(config.project_root, 'node_modules')],
        },
        context: config.server.config.build.working_dir,
		entry: {
			main: options.entry || path.join(serverconfig.build.indir, 'main.js'),
		},
		output: {
			path: serverconfig.build.outdir,
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
