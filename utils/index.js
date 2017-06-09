/* utils module */

const colors = require('colors/safe');

/* Utils functions */
exports.flattenIterable = function flattenIterable () 
{
    /* Flatter any iterable */
    let res = [];
    for (let iter of arguments) {
        for (let o of iter)
            res.push(o);
    }
    return res;
};

exports.composeSync = function composeSync()
{
    const funcs = arguments;
    return function () {
        let res = Array.prototype.slice.apply(arguments);
        for (let i = funcs.length-1; i >= 0; --i) {
            res = [funcs[i].apply(this, res)];
        }
        return res[0];
    };
};

exports.assert = function assert(ast, fmt, ...msg)
{
    if (fmt)
        console.assert(ast, colors.assert(fmt), ...msg);
    else
        console.assert(ast);
};

/* color log definition */

colors.setTheme({
    error: ['bold', 'red'],
    assert: ['bold', 'red'],
    warning: ['bold', 'magenta'],
    imp: ['bgBlue', 'yellow'],
    tips: 'cyan',
    info: 'white',
    debug: 'grey',
});

exports.logerror_noexit = function logerror_noexit(fmt)
{
    console.error(colors.error(fmt), ...Array.prototype.slice.call(arguments, 1));
};


exports.logerror = function logerror(fmt)
{
    console.error(colors.error(fmt), ...Array.prototype.slice.call(arguments, 1));
    if (require('config').env_class !== 'production') {
        process.exit(1);
    }
};

exports.logwarning = function logwarning(fmt)
{
    console.log(colors.warning(fmt), ...Array.prototype.slice.call(arguments, 1));
};

exports.loginfo = function loginfo(fmt)
{
    console.log(colors.info(fmt), ...Array.prototype.slice.call(arguments, 1));
};

exports.logdebug = function logdebug(fmt)
{
    let config = require('config');
    if (config.env_class !== 'production') {
        console.log(colors.debug(fmt), ...Array.prototype.slice.call(arguments, 1));
    }
};

exports.logimp = function logimp(fmt)
{
    console.log(colors.imp(fmt), ...Array.prototype.slice.call(arguments, 1));
};

exports.logtips = function logtips(fmt)
{
    console.log(colors.tips(fmt), ...Array.prototype.slice.call(arguments, 1));
};

(function() {
    if ( typeof Object.id == "undefined" ) {
        let id = 0;

        Object.id = function(o) {
            if ( typeof o.__uniqueid == "undefined" ) {
                Object.defineProperty(o, "__uniqueid", {
                    value: ++id,
                    enumerable: false,
                    // This could go either way, depending on your 
                    // interpretation of what an "id" is
                    writable: false
                });
            }

            return o.__uniqueid;
        };
    }
})();
