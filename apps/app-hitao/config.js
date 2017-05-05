'use strict';

const lo = require('lodash');

module.exports = {
    file_catalog: {
        dyn_ts: 'index.tsx'
    },

    app_config_class(base_conf_cls)
    {
        class HitaoConfig extends base_conf_cls
        {
            constructor(appname, parent, config_env)
            {
                super(appname, parent, config_env);
                if (config_env === 'build') {
                    this.config.build.externals.dyn_js = lo.assign(this.config.build.externals.dyn_js || {},
                        {
                            'react.js': '$/node_modules/react/dist/react.js',
                            'react-dom.js': '$/node_modules/react-dom/dist/react-dom.js',
                        });
                }

            }
        };

        return HitaoConfig;
    }
}
