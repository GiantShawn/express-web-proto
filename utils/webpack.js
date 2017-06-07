const path = require('path');
const fs = require('fs');
const lo = require('lodash');
const config = require('config')('build');
const webpack = require('webpack');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const NodeExternals = require('webpack-node-externals');
const WebpackDiskPlugin = require('webpack-disk-plugin');
const utils = require('utils');

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
    *   do_hmr: true|false (false)
    *   dev_srv_pub: <dev server public uri> (a.shawnli.org:8080)
    */
    apppath = path.resolve(apppath);
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
            } else if (config.env_class === 'webpack-debug') {
                // Enable the plugin to let webpack communicate changes
                // to WDS. --hot sets this automatically!
                plugins.push(new webpack.HotModuleReplacementPlugin());
            } else {
                utils.assert (false, 'config.env_class can be recognized: %s', config.env_class);
            }
        }

        // Print compiling progress for debug use only.
        plugins.push(new webpack.ProgressPlugin());

        return plugins;
    }

    const TailPlugins = function () {
        return [];
    }

    const TailDebugPlugins = function () {
        if (config.env_class !== 'production') {
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
        } else 
            return [];
    }

    let entry;
    const normalizeEntry = function (e) {
        return  (e.charAt(0) === path.sep && e || path.join(apppath, e)); 
    }

    let do_hmr = (config.env_class !== 'production');
    let dev_srv_pub = options.dev_srv_pub || 'a.shawnli.org:8080';

    const hmr_patch = [ // activate HMR for React
                        'react-hot-loader/patch',
    ];
    if (config.env_class === 'webpack-debug') {
        // run with webpack-dev-server

        /* 
        * webpack-dev-server will automatically add webpack/hot/(dev-server|only-dev-server)
        * and webpack-dev-server/client to output bundle which includes all hot reload management
        * codes(@ listen to server for update, @ trigger check/apply)
        * 
        * However if you want customization, just manually include webpack-dev-server/client or/and
        * webpack/hot/dev-server accordingly here. Otherwise just leave it blank.
        */

        /* 
        * Some Explanation:
        * webpack/hot/(only-)dev-server:
        * work with webpack-dev-server, include 
        * if (module.hot) {... } logic for you to the final bundle 'root' chunk
        * (which effectively handle all non-handled hot module reload requests in children)
        * while this chunk will only only function together with
        * webpack-dev-server/client chunk which establish websocket connection
        * with webpack-dev-server to receive module update event and trigger check/apply
        * logics
        * only- means to only hot reload for successful updates
        */
    } else if (config.env_class === 'debug') {
        // run in expressjs with webpack-dev-middleware and webpack-hot-middleware

        /* 
        * webpack-hot-middleware/client:
        * bundle the client for hot reloading
        * use GET /webpack_hmr as keepalive http session as connection
        * to listen to webpack-hot-middler server-side reload event
        * and trigger check/apply accordingly. (so no need to include webpack/hot/dev-server)
        * webpack-hot-middleware watch webpackCompiler maintained by previous 
        * webpack-dev-middleware to add 'compile' and 'done' plugin and notify
        * webpack-hot-middle/client accordingly.
        */
        hmr_patch.push('webpack-hot-middleware/client');
    }

    const patchHmr = function (e) {
        if (do_hmr) {
            return hmr_patch.concat(e);
        } else
            return e;
    }

    if (options.entry) {
        if (lo.isObject(options.entry)) {
            entry = lo.mapValues(options.entry, (e) => {
                if (lo.isArray(e))
                    return patchHmr(e.map(normalizeEntry));
                else
                    return patchHmr(normalizeEntry(e));
            });
        } else if (lo.isArray(options.entry)) {
            entry = patchHmr(options.entry.map(normalizeEntry));
        } else {
            entry = patchHmr(normalizeEntry(options.entry));
        }
    } else {
        entry = patchHmr(getClientEntryFile(apppath));
    }

	const common_webpack_config_template = {
        context: apppath,
		entry: entry,
		output: {
			path: appconfig.config.build.outdir.dyn_repo,
			//filename: '[name]-[chunhash].js',
            filename: '[name].js',
			publicPath: appconfig.config.build.pubroot,
            //hotUpdateMainFilename:'[hash].hot-update.json',
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
								name: '[name].[ext]',
							}

						},
                        {
                            loader: 'extract-loader',
                            options: {
                                publicPath: '.'
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
			"react-dom": "ReactDOM",
            "jquery": "jQuery",
		},

        devServer: {
			// Don't refresh if hot loading fails. Good while
			// implementing the client interface.
			//hotOnly: true,

            // If you want to refresh on errors too, set
            hot: do_hmr,

			//inline: false,
			contentBase: config.server.config.build.dyn_repo,
			// match the output path

			publicPath: appconfig.config.build.pubroot,
			// match the output `publicPath`

			host: '0.0.0.0',
			public: dev_srv_pub,
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
        context: config.server.config.build.rt_working_dir,
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
			// this WILL include `jquery` and `lodash/*` 
            modulesDir: path.resolve(__dirname, '../node_modules'),
			whitelist: ['jquery', /^lodash/]
		})],

		plugins: [
            new webpack.IgnorePlugin(/\.(css|less)$/),
		],
	};

    let banner = '';

    if (config.env_class === 'production') {
        conf.plugins.push(
            new webpack.DefinePlugin({
                /* https://webpack.js.org/guides/production-build/
                */
                //'process.env': {
                    //'NODE_ENV': JSON.stringify('production')
                //}
            }));
        banner += "process.env.NODE_ENV = 'production'; ";

        //conf.plugins.push(new webpack.NoErrorsPlugin()), // used to handle errors more cleanly
    } else {
        conf.devtool = 'source-map'; // in production should this line be removed
        banner += 'require("source-map-support").install();';

        conf.stats = {
			colors: true,
			modules: true,
			reasons: true,
			errorDetails: true
		};

        conf.plugins.push(
            new webpack.DefinePlugin({
                /* https://webpack.js.org/guides/production-build/
                */
                //'process.env': {
                    //'NODE_ENV': JSON.stringify(config.env_class)
                //}
            }));

        banner += `process.env.NODE_ENV = '${config.env_class}'; `;

        if (config.env_class === 'debug') {
            // HotModuleReplacementPlugin here is for server hot reload (experiemnt)
            conf.plugins.push(new webpack.HotModuleReplacementPlugin());
        }

    }

    conf.plugins.push(
        // http://jlongster.com/Backend-Apps-with-Webpack--Part-I
        new webpack.BannerPlugin({
            banner: banner, raw: true, entryOnly: false
        }));
        
    return conf;
}


exports.NewClientWebpackConfigBase = NewClientWebpackConfigBase;
exports.NewServerWebpackConfigBase = NewServerWebpackConfigBase;
