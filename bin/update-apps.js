var StoreApp = require('models/app');
var async = require('async');
var debug = require('debug')('appreports:expandlinks');

require('app/db').connect();

StoreApp.updateApps(function(err) {
  debug('done updating apps', err);
  process.exit();
});
