var MasterApp = require('../models/app');
var StoreLink = require('../models/link');
var StoreRating = require('../models/rating');
var mongoose = require('mongoose');
var async = require('async');
var now = require('../data/now');
var crawler = require('./index');
var debug = require('debug')('appreports:crawler:ratings');

function processStoreLinks(options, done, progress) {
  if(typeof options === 'function') {
    done = options;
    options = {};
  }

  if(!progress) {
    progress = function(progress) { /* do nothing */ };
  }

  var query = { status: '200' };
  if(options.storeId) {
    query.storeId = options.storeId;
  }

  var stream = StoreLink.find(query).sort({ processedAt: 1 }).limit(options.limit || 0).exec(function(err, storeLinks) {
    var count = 0;
    var max = storeLinks.length;
    debug('processing urls', storeLinks.length);
    var totalNewReviews = 0;
    var max = storeLinks.length;
    var current = 0;
    async.eachLimit(storeLinks, 20, function(storeLink, next) {
      crawler.fetchAppRating(storeLink.url, function(err, ratings, ratingValue) {
        storeLink.processedAt = now().toDate();
        storeLink.save();
        //debug('processing', storeLink.url);

        var data = {
          storeId: storeLink.storeId,
          date: StoreRating.today(),
          region: storeLink.region
        };
        count++;
        (function(data, count, next) {
          StoreRating.findOne(data, data, { upsert: true }, function(err, doc) {
            if(!doc) {
              doc = new StoreRating(data);
            }

            doc.primaryUrl = storeLink.primaryUrl;
            if(doc.ratingCount != ratings) {
              totalNewReviews += ratings - doc.ratingCount || 0;
            }
            doc.ratingCount = ratings;
            doc.ratingAverage = ratingValue;
            doc.ratingTotal = ratings * ratingValue;
            doc.name = storeLink.name;
            doc.platform = storeLink.platform;
            doc.url = storeLink.url;
            doc.bitly = storeLink.bitly;
            doc.baseline = storeLink.baseline;
            debug(doc.region, ratings, ratingValue);
            doc.save();
            current++;
            progress(Math.floor((current / max) * 100));
            return next();
          });
        })(data, count, next);
      });
    }, function() {
      done(totalNewReviews);
    });
  });
}

exports.processStoreLinks = processStoreLinks;
