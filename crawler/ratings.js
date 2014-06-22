var MasterApp = require('../models/app');
var StoreLink = require('../models/link');
var StoreRating = require('../models/rating');
var mongoose = require('mongoose');
var async = require('async');
var moment = require('moment-timezone');
var crawler = require('./index');
var debug = require('debug')('appreports:crawler:ratings');

function processStoreLinks(options, done) {
  if(typeof options === 'function') {
    done = options;
    options = {};
  }

  var query = { status: '200' };
  if(options.storeId) {
    query.storeId = storeId;
  }

  var stream = StoreLink.find(query).sort({ processedAt: 1 }).limit(options.limit || 0).exec(function(err, storeLinks) {
    var count = 0;
    var max = storeLinks.length;
    debug('processing urls', storeLinks.length);
    async.eachLimit(storeLinks, 20, function(storeLink, next) {
      crawler.fetchAppRating(storeLink.url, function(err, ratings) {
        storeLink.processedAt = moment().tz('America/Los_Angeles').toDate();
        storeLink.save();
        debug('processing', storeLink.url);

        var data = {
          storeId: storeLink.storeId,
          date: StoreRating.today(),
          region: storeLink.region
        };
        count++;
        (function(data, count, next) {
          StoreRating.findOneAndUpdate(data, data, { upsert: true }, function(err, doc) {
            doc.primaryUrl = storeLink.primaryUrl;
            doc.ratings = ratings;
            doc.name = storeLink.name;
            doc.segment = storeLink.segment;
            doc.platform = storeLink.platform;
            doc.url = storeLink.url;
            doc.bitly = storeLink.bitly;
            doc.baseline = storeLink.baseline;
            debug('updating ratings', count, max);
            doc.save();
            return next();
          });
        })(data, count, next);
      });
    }, done);
  });
}

exports.processStoreLinks = processStoreLinks;
