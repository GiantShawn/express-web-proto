/* utils module */

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
