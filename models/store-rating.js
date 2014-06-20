var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var moment = require('moment-timezone');
var util = require('util');
var debug = require('debug')('appreports:store-ratings');

var schema = new Schema({
  storeId: String,
  name: String,
  platform: String,
  primaryUrl: String,
  url: String,
  date:  Number,
  segment: String,
  region: String,
  ratings: Number
});

schema.statics.today = function() {
  return moment().tz('America/Los_Angeles').format('YYYYMMDD') * 1;
}

schema.statics.yesterday = function() {
  return this.today() - 1;
}

schema.statics.getDetailsForSegment = function(segment, callback) {
  var date = this.today();
  debug('getting details for segment', segment);
  this.aggregate([
    { $match: { segment: segment, date: date } },
    { $group: {
      _id: { platform: '$platform', name: '$name' },
      ratings: { $sum: '$ratings' },
      storeUrl: { $first: '$primaryUrl' },
      breakdown: {
        $push: {
          $concat: ['$region', ': ',  { $substr: [ '$ratings', 0, 3 ]}]}
        }
      }
    },
    { $sort: { ratings: 1 } }
  ]).exec(callback);
};

schema.statics.getForDate = function(storeId, date, callback) {
  date = date || this.today();

  this.aggregate([
    { $match: { storeId: storeId, date: date }},
    { $group: { _id: '$date', totalRatings: { $sum: '$ratings' }, regionBreakdown: { $push: { region: '$region', ratings: '$ratings'} }}}
  ]).exec(function(err, days) {
    if(days.length > 0) {
      return callback(null, days[0]);
    }

    return callback(null, { totalRatings: 0, regionBreakdown: [] });
  });
}

schema.index({ storeId: 1, date: 1, region: 1 });

module.exports = mongoose.model('StoreRating', schema);
