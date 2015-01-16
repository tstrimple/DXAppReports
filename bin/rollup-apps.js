var StoreApp = require('models/app');
var async = require('async');
var debug = require('debug')('appreports:rollup');

require('app/db').connect();

StoreApp.rollUpApps(function(err) {
  debug('done rolling up apps', err);
  process.exit();
});
