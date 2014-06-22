var MasterApp = require('../models/app');
var StoreLink = require('../models/link');
var StoreRating = require('../models/rating');
var mongoose = require('mongoose');
var async = require('async');
var moment = require('moment-timezone');
var crawler = require('./index');
var debug = require('debug')('appreports:crawler:ratings');

function processStoreLinks(storeId, done) {
  if(typeof storeId === 'function') {
    done = storeId;
    storeId = null;
  }

  var query = { status: '200' };
  if(storeId) {
    query.storeId = storeId;
  }

  var stream = StoreLink.find(query).sort({ processedAt: -1 }).exec(function(err, storeLinks) {
    var count = 0;
    var max = storeLinks.length;
    debug('processing urls', storeLinks.length);
    async.eachLimit(storeLinks, 20, function(storeLink, next) {
      count++;
      crawler.fetchAppRating(storeLink.url, function(err, ratings) {
        storeLink.processedAt = moment().tz('America/Los_Angeles').toDate();
        storeLink.save();

        var data = {
          storeId: storeLink.storeId,
          date: StoreRating.today(),
          region: storeLink.region
        };

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
      });
    }, done);
  });
}

exports.processStoreLinks = processStoreLinks;
