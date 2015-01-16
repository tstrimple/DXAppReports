var StoreApp = require('models/app');
var async = require('async');
var debug = require('debug')('appreports:expandlinks');

require('app/db').connect();

StoreApp.findStoreRegions(function(err) {
  debug('done finding store regions', err);
  process.exit();
});
