const path = require('path');
const ExtractTextPlugin = require('extract-text-webpack-plugin');

module.exports = {
    entry: './src/index.js',
    output: {
        path: path.resolve(__dirname, './dist/'),
        filename: 'bundle.js',
        publicPath: 'dist/'
    },
    module: {
        rules: [
        {
            test: /\.js$/,
            exclude: /node_modules/,
            use: [{
                loader: 'babel-loader',
                options: {
                    presets: ['es2015']
                }
            }]
        },
        {
            test: path.resolve(__dirname, 'src', "csstest.css"),
            use: [
            {
                loader: "css-loader",
            },
            ]
        },
        {
            test: /math_.*\.css$/,
            use: ExtractTextPlugin.extract({
                fallback: 'style-loader',
                use: 'css-loader'})
        },
        {
            test: /\.png$/,
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
            test: path.resolve(__dirname, "test.html"),
            use: [
            {
                loader: "html-loader",
            },
            ]
        },
        {
            test: path.resolve(__dirname, 'src', "global.js"),
            use: [
            {
                loader: "script-loader",
            },
            ]
        },
        {
            test: path.resolve(__dirname, 'src/val-val.js'),
            use: [
            {
                loader: 'val-loader',
                options: {
                    val: 100
                }
            },
            {
                loader: 'babel-loader',
                options: {
                    presets: ['es2015']
                }
            }
            ]
        },
        ]
    },
    plugins: [
        new ExtractTextPlugin('style.css')
        ]
};
