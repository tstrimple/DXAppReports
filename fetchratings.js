var MasterApp = require('./models/master-app');
var StoreLink = require('./models/store-link');
var StoreRating = require('./models/store-rating');
var ratings = require('./crawler/ratings');
var mongoose = require('mongoose');
var async = require('async');
var moment = require('moment-timezone');
var crawler = require('./crawler/');
var debug = require('debug')('appreports:fetchratings');

if(!process.env.MONGO_URI) {
  throw 'Must set MONGO_URI environment variable';
}
mongoose.connect(process.env.MONGO_URI);

ratings.processStoreLinks(function() {
  debug('done');
});