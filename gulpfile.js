'use strict';

require('app-module-path').addPath('.');

const fs = require('fs');
const parallel = require('async/parallel');
const lo = require('lodash');
const util = require('util');

const gulp = require('gulp');
const changed = require('gulp-changed');
const gutil = require('gulp-util');

const build = require('build');
const utils = require('utils');

const babelreg = require('babel-register');

//var coffee = require('gulp-coffee');
//var concat = require('gulp-concat');
//var uglify = require('gulp-uglify');
//var imagemin = require('gulp-imagemin');
//var sourcemaps = require('gulp-sourcemaps');
//var del = require('del');

const argv = gutil.env

build.initBuild(argv.env);

const config = require('config')('build');


gulp.task('setup-dir', function () {
    if (argv.fullbuild) {
        return build.setupServerDirectories();
    } else {
        return new Promise((rsv, rej) => {
            fs.access(config.server.config.build.outdir, fs.constants.R_OK,
                (err) => err ? build.setupServerDirectories() : rsv());
        });
    }
});

gulp.task('build-express', ['setup-dir'], build.buildExpress);

gulp.task('setup-externals', function () {
    let rootapp = config.app;
    if (argv.app) {
        rootapp = config.getApp(argv.app);
        if (!rootapp) {
            utils.logerror_noexit("App [%s] not found", argv.app);
            utils.logtips("Available apps:");
            for (let appname of config.all_app_names) {
                utils.logtips("\t[%s]\t%s", appname, config.getApp(appname).intro_doc);
            }
            return Promise.reject();
        }
    }
    return build.setupExternals(rootapp);
});

gulp.task('build-app', ['setup-dir', 'setup-externals'], function () {
    let rootapp = config.app;
    if (argv.app) {
        rootapp = config.getApp(argv.app);
    }

    return build.buildApp(rootapp);
});

gulp.task('build', ['build-express', 'build-app']);

gulp.task('list-apps', function () {
    for (let appname of config.all_app_names) {
        utils.logtips("[%s]\t%s", appname, config.getApp(appname).intro_doc);
    }
});

gulp.task('default', function () {
    /* print usable help */
    utils.logtips(`
Get all gulp tasks by \`gulp -T\`

Available Options:
--env           : build environment (production/debug/webpack-debug), default: debug
--app           : build specify app only
--fullbuild     : do full build, includes
                 * full dist directory existance check.

Special Targets:
list-apps     : list all apps
`);
});

gulp.on("err", function (err) {
    utils.logerror_noexit(util.inspect(err, {depth:null}));
});


/*
gulp.task('build-js', function () {
    return gulp.src(config.srv_js_build_in)
            .pipe(changed(config.srv_js_build_out))
            .pipe(gulp.dest(config.srv_js_build_out));
});

var csspost = function (css) {
    var postcss      = require('gulp-postcss');
    var sourcemaps   = require('gulp-sourcemaps');
    var autoprefixer = require('autoprefixer');
    return css.pipe(sourcemaps.init())
              .pipe(postcss([autoprefixer()]))
              .pipe(sourcemaps.write())
              .pipe(gulp.dest(config.css_build_out));
}


gulp.task('build-styles-css', function () {

    return csspost(gulp.src(config.css_build_in)
                       .pipe(changed(config.css_build_out))
                  );
});

gulp.task('build-styles-sass', function () {
    var sass        = require('gulp-sass');

    var sass2css = gulp.src(config.sass_build_in)
        .pipe(changed(config.css_build_out, {extension: ".css"}))
        .pipe(sass().on('error', sass.logError));

    return csspost(sass2css);

});

gulp.task('build-styles', ['build-styles-css', 'build-styles-sass']);

gulp.task('build-html', function (done) {
    var pug         = require('gulp-pug');
    //return gulp.src(config.pug_build_in)
        //.pipe(pug())
        //.pipe(gulp.dest(config.html_build_out))
    done();
});

gulp.task('build-pug', function (done) {
    return gulp.src(config.pug_build_in)
            .pipe(changed(config.pug_build_out))
            .pipe(gulp.dest(config.pug_build_out));
});

gulp.task('build-page', ['build-html', 'build-pug']);

gulp.task('build-images', function (done) {
    var path = require('path');

    fs.access(config.img_build_out, fs.constants.F_OK, (err) => {
        if (err) {
            // not exists
            fs.symlink(path.relative(path.dirname(config.img_build_out), config.img_repo), config.img_build_out, function (err) {
                if (err) {
                    throw err;
                }
                done();
            });
        } else {
            done();
        }
    });
});
            

gulp.task('build', ['build-js', 'build-styles', 'build-page', 'build-images']);

var stop = function (err, res, done) {
    var process = require('process');
    var spawn = require('child_process').spawn;
    console.log("npm stop...");
    var stop_proc = spawn('npm', ['stop']);
    stop_proc.stdout.pipe(process.stdout);
    stop_proc.on('exit', (exit) => {
        console.log("Server stopped");
        done();
    });

}

var run = function (err, res, done) {
    var process = require('process');
    var spawn = require('child_process').spawn;
    console.log("npm start...");
    var run_proc = spawn('npm', ['start']);
    run_proc.stdout.pipe(process.stdout);
    run_proc.stderr.pipe(process.stderr);
    run_proc.on('exit', (exit) => {
        console.log("Server Exits");
        done();
    });
}

gulp.task('run', (done) => { run(undefined, undefined, done); });

gulp.task('saferun', ['build'], (done) => { run(undefined, undefined, done); });

gulp.task('default', ['saferun']);

    
gulp.task('dev', ['build'], function () {
    var chain = require('./src/common-js/chain.js');
    gulp.watch(Array.prototype.concat.call(['app.js'], config.pug_build_in, config.srv_js_build_in),
        chain((err, res, done) => {
            //console.log("running", gulp.tasks['dev'].running);
            gulp.start('build');
            gulp.on('task_stop', (e) => {
                if (e.task === 'build') {
                    //console.log("call build end");
                    //console.log("running", gulp.seq, gulp.tasks['dev'].running);
                    //console.trace("HHH");
                    done();
                    gulp.removeAllListeners('task_stop');
                }
            });
        }, stop, run, {ignore_error:true, no_done:true}));

    run(undefined, undefined, () => {});
    //done();
});

gulp.task('sass-watch', function(done) {
    var exec = require('child_process').exec;
    exec(`sass --watch ${config.sass_build_in}:${config.css_build_out}`, done);
});
*/
