/*global Package, Npm*/
(function () {
    'use strict';

    Package.describe({
        name: 'imgix-core'
        , version: '0.2.1'
        , summary: 'imgix-core-js provides the common boilerplate for imgix server-side and client-side JavaScript-based functionality.'
        , git: 'https://github.com/imgix/imgix-core-js/blob/master/src/imgix-core-js.js'
        , documentation: 'README.md'
    });

    Package.onUse(function(api) {
        api.versionsFrom('1.2-rc.7');
        api.use('ecmascript', 'server');
        api.addFiles(['object-assign-polyfill.js', 'imgix-core.js'], 'server');
        api.export('imgixCore', 'server');
    });

    Npm.depends(
        {
            'URIjs': '1.16.0'
            , 'js-md5': '0.3.0'
        }
    );

}());
