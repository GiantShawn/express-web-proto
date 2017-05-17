/* utils module */

const colors = require('colors/safe');

exports.flattenIterable = function () 
{
    /* Flatter any iterable */
    let res = [];
    for (let iter of arguments) {
        for (let o of iter)
            res.push(o);
    }
    return res;
}


/* color log definition */

colors.setTheme({
    error: ['bold', 'red'],
    warning: ['bold', 'magenta'],
    imp: ['bgBlue', 'yellow'],
    tips: 'cyan',
    info: 'white',
    debug: 'grey',
});

exports.logerror_noexit = function logerror_noexit(fmt)
{
    console.error(colors.error(fmt), ...Array.prototype.slice.call(arguments, 1));
}


exports.logerror = function logerror(fmt)
{
    console.error(colors.error(fmt), ...Array.prototype.slice.call(arguments, 1));
    if (require('config').env_class !== 'production') {
        process.exit(1);
    }
}

exports.logwarning = function logwarning(fmt)
{
    console.log(colors.warning(fmt), ...Array.prototype.slice.call(arguments, 1));
}

exports.loginfo = function loginfo(fmt)
{
    console.log(colors.info(fmt), ...Array.prototype.slice.call(arguments, 1));
}

exports.logdebug = function logdebug(fmt)
{
    let config = require('config');
    if (config.env_class !== 'production') {
        console.log(colors.debug(fmt), ...Array.prototype.slice.call(arguments, 1));
    }
}

exports.logimp = function logimp(fmt)
{
    console.log(colors.imp(fmt), ...Array.prototype.slice.call(arguments, 1));
}

exports.logtips = function logtips(fmt)
{
    console.log(colors.tips(fmt), ...Array.prototype.slice.call(arguments, 1));
}


    
