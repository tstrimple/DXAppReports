var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var now = require('../data/now');
var util = require('util');
var debug = require('debug')('appreports:store-ratings');

var schema = new Schema({
  storeId: String,
  name: String,
  platform: String,
  bitly: String,
  primaryUrl: String,
  url: String,
  date:  Number,
  region: String,
  ratingCount: Number,
  ratingAverage: Number,
  ratingTotal: Number,
  baseline: Number
});

schema.statics.today = function() {
  return now().format('YYYYMMDD') * 1;
}

schema.statics.yesterday = function() {
  return this.today() - 1;
}

schema.statics.getList = function(callback) {
  var date = this.today();
  debug('getting list');
  this.aggregate([
    { $match: { date: date }},
    { $group: {
      _id: { platform: '$platform', name: '$name', storeId: '$storeId', storeUrl: '$primaryUrl', bitly: '$bitly', baseline: '$baseline' },
      ratings: { $sum: '$ratingCount' },
      total: { $sum: '$ratingTotal' }
    }},
    { $sort: { ratings: 1 } }
  ]).exec(callback);
};

schema.statics.getDetails = function(storeId, callback) {
  var date = this.today();
  debug('getting details');
  this.aggregate([
    { $match: { date: date, ratingCount: { $gt: 0 }, storeId: storeId }},
    { $sort: { ratingCount: -1 } }
  ]).exec(callback);
};


schema.statics.getRegions = function(storeId, callback) {
  var date = this.today();
  debug('getting details');
  this.aggregate([
    { $match: { date: date, ratingCount: { $gt: 0 }, storeId: storeId }},
    { $sort: { ratingCount: -1 } }
  ]).exec(callback);
};


schema.statics.getChange = function(storeId, done) {
  var today = this.today();
  var yesterday = this.yesterday();
  db.storeratings.aggregate({
    $match: {
      storeId: storeId,
      $or: [
      { date: today },
      { date: yesterday } ] } },
    { $group: { _id: '$date', ratings: { $sum: '$ratings' } } }).exec(function(err, data) {
      if(data.length == 2) {
        return done(data[0] - data[1]);
      }

      return done(0);
    });
};

schema.statics.getForDate = function(storeId, date, callback) {
  date = date || this.today();
  debug('getting', storeId, date);

  this.aggregate([
    { $match: { storeId: storeId, date: date }},
    { $group: { _id: '$date', totalRatings: { $sum: '$ratings' }}}
  ]).exec(function(err, days) {
    debug('getting for date', days);
    if(days.length > 0) {
      return callback(null, days[0]);
    }

    return callback(null, { totalRatings: 0, regionBreakdown: [] });
  });
}

schema.index({ storeId: 1, date: 1, region: 1 });

module.exports = mongoose.model('Rating', schema);
