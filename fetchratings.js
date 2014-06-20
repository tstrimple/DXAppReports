var MasterApp = require('./models/master-app');
var StoreLink = require('./models/store-link');
var StoreRating = require('./models/store-rating');
var mongoose = require('mongoose');
var async = require('async');
var moment = require('moment-timezone');
var crawler = require('./crawler/');
var debug = require('debug')('appreports:fetchratings');

if(!process.env.MONGO_URI) {
  throw 'Must set MONGO_URI environment variable';
}
mongoose.connect(process.env.MONGO_URI);

var stream = StoreLink.find({ status: '200' }).sort({ processedAt: -1 }).exec(function(err, storeLinks) {
  var count = 0;
  var max = storeLinks.length;
  debug('processing urls', storeLinks.length);
  async.eachLimit(storeLinks, 20, function(storeLink, next) {
    count++;
    crawler.fetchAppRating(storeLink.url, function(err, ratings) {
      storeLink.processedAt = moment().tz('America/Los_Angeles').toDate();
      storeLink.save();
      if(ratings === 0) {
        return next();
      }
      var data = {
        storeId: storeLink.storeId,
        date: StoreRating.today(),
        region: storeLink.region,
        name: storeLink.name,
        platform: storeLink.platform,
        url: storeLink.url
      };

      StoreRating.findOneAndUpdate(data, data, { upsert: true }, function(err, doc) {
        doc.primaryUrl = storeLink.primaryUrl;
        doc.ratings = ratings;
        doc.segment = storeLink.segment;
        debug('updating ratings', count, max);
        doc.save();
        return next();
      });
    });
  }, function(err) {
    debug('done fetching ratings');
  });
});
