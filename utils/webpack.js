const path = require('path');
const fs = require('fs');
const lo = require('lodash');
const config = require('config')('build');
const webpack = require('webpack');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const NodeExternals = require('webpack-node-externals');
const WebpackDiskPlugin = require('webpack-disk-plugin');

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

    const CommonPlugins = function () {
        return [
			new ExtractTextPlugin('style.css'),
			new webpack.LoaderOptionsPlugin({
				// test: /\.xxx$/, // may apply this only for some modules
				options: {
					//htmlLoader: {
						//attrs: ['img:src', 'link:href'],
					//}
				}
			}),
            new webpack.DefinePlugin({
                /* https://webpack.js.org/guides/production-build/
                */
                'process.env': {
                    'NODE_ENV': JSON.stringify('production')
                }
            }),
            //new webpack.NoErrorsPlugin(), // used to handle errors more cleanly
        ];
    }

    const CommonDebugPlugins = function () {
        let plugins = [];
        if (config.env_class !== 'production') {
            plugins.push(new webpack.NamedModulesPlugin());

            if (config.env_class === 'debug') {
                // Enable the plugin to let webpack communicate changes
                // to WDS. --hot sets this automatically!
                plugins.push(new webpack.HotModuleReplacementPlugin());
                plugins.push(new webpack.DefinePlugin({
                    'process.env': {
                        'NODE_ENV': JSON.stringify('debug')
                    }
                }));
            } else if (config.env_class === 'webpack-debug') {
                plugins.push(new webpack.DefinePlugin({
                    'process.env': {
                        'NODE_ENV': JSON.stringify('webpack-debug')
                    }
                }));
            } else {
                assert (false);
            }
        }
        return plugins;
    }

    const TailPlugins = function () {
        return [
            new WebpackDiskPlugin({
                /*
					https://www.npmjs.com/package/webpack-disk-plugin
					OPTIONS
					 * output.path: The base directory to write assets to. (Default: ".").
					 * files: An array of objects to map an asset to a file path

					The files array is composed of objects of the form:

					 * asset: A regex or string to match the name in the webpack compiler. Note that
					   something like [hash].main.js will be fully expanded to something like
					   e49186041feacefb583b.main.js.
					 * output: An object with additional options: * path: Override the top-level output.path directory to write too.
						* filename: A specified filename to write to. Can be a straight string or a
						  function that gets the asset name to further mutate. Also may be a single
						  filename, a relative path to append to the base path, or an absolute path.
				*/
                output: {
                    path: "build"
                },
                files: [
                    { asset: "stats.json" },
                    { asset: /[a-f0-9]{20}\.main\.js/, output: { filename: "file.js" } }
                ]
            }),
        ];
    }

    const TailDebugPlugins = function () {
        return [];
    }

    let entry;
    const normalizeEntry = function (e) { return (e.charAt(0) === path.sep && e || path.join(apppath, e)); }
    if (options.entry) {
        if (lo.isObject(options.entry)) {
            entry = lo.mapValues(options.entry, normalizeEntry);
        } else if (lo.isArray(options.entry)) {
            entry = options.entry.map(normalizeEntry);
        } else {
            entry = normalizeEntry(options.entry);
        }
    } else {
        entry = getClientEntryFile(apppath);
    }

	const common_webpack_config_template = {
        context: apppath,
		entry: entry,
		output: {
			path: appconfig.config.build.outdir.dyn_repo,
			//filename: '[name]-[chunhash].js',
            filename: '[name].js',
			publicPath: appconfig.config.pubroot,
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
								name: '../html/[name].[ext]',
							}

						},
                        {
                            loader: 'extract-loader',
                            options: {
                                publicPath: '../javascripts'
                            }
                        },
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

        devServer: {
			// Don't refresh if hot loading fails. Good while
			// implementing the client interface.
			//hotOnly: true,

            // If you want to refresh on errors too, set
            hot: true,

			//inline: false,
			contentBase: config.server.config.build.dyn_repo,
			// match the output path

			publicPath: appconfig.config.pubroot,
			// match the output `publicPath`

			host: '0.0.0.0',
			public: 'd.shawnli.org:8080',
        },

		plugins: [].concat(
            CommonPlugins(),
            CommonDebugPlugins(),
            TailPlugins(),
            TailDebugPlugins()
        ).filter((o)=>!lo.isEmpty(o)),

		stats: {
			colors: true,
			modules: true,
			reasons: true,
			errorDetails: true
		},

	};


    if (config.env_class !== 'production') {
        //common_webpack_config_template.devtool = 'source-map';
        common_webpack_config_template.devtool = 'inline-source-map';
    }

	return common_webpack_config_template;
}

function NewServerWebpackConfigBase(options = {}) 
{
    const serverconfig = config.server.config;
    const conf = {
        target: 'node',
        node: {
            __dirname: true,
            __filename: true,
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
			publicPath: serverconfig.build.outdir,
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

        devtool: 'source-map', // in production should this line be removed
        
		externals: [
            /* https://www.npmjs.com/package/webpack-node-externals
				CONFIGURATION
				This library accepts an options object.

				 [#OPTIONSWHITELIST-]OPTIONS.WHITELIST (=[])
				An array for the externals to whitelist, so they will be included in the bundle.
				Can accept exact strings ('module_name'), regex patterns (/^module_name/), or a
				function that accepts the module name and returns whether it should be included.
				Important - if you have set aliases in your webpack config with the exact same
				names as modules in node_modules, you need to whitelist them so Webpack will
				know they should be bundled.

				 [#OPTIONSIMPORTTYPE-COMMONJS]OPTIONS.IMPORTTYPE (='COMMONJS')
				The method in which unbundled modules will be required in the code. Best to
				leave as commonjs for node modules.

				 [#OPTIONSMODULESDIR-NODE_MODULES]OPTIONS.MODULESDIR (='NODE_MODULES')
				The folder in which to search for the node modules.

				 [#OPTIONSMODULESFROMFILE-FALSE]OPTIONS.MODULESFROMFILE (=FALSE)
				Read the modules from the package.json file instead of the node_modules folder.
            */
            NodeExternals({
			// this WILL include `jquery` and `webpack/hot/dev-server` in the bundle, as well as `lodash/*` 
			whitelist: ['jquery', 'webpack/hot/dev-server', 'webpack/hot/only-dev-server', /^lodash/]
		})],

		plugins: [
            // http://jlongster.com/Backend-Apps-with-Webpack--Part-I
			new webpack.BannerPlugin({
                banner: 'require("source-map-support").install();', raw: true, entryOnly: false
            }),
            new webpack.IgnorePlugin(/\.(css|less)$/),
		],
		stats: {
			colors: true,
			modules: true,
			reasons: true,
			errorDetails: true
		},

	};
    return conf;
}


exports.NewClientWebpackConfigBase = NewClientWebpackConfigBase;
exports.NewServerWebpackConfigBase = NewServerWebpackConfigBase;
