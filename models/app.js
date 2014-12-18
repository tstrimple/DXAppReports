var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var moment = require('moment-timezone');
var util = require('util');
var AppSummary = require('./app-summary');
var StoreLink = require('./link');
var StoreRating = require('./rating');
var regions = require('../data/regions');
var async = require('async');
var crawler = require('../crawler/');
var debug = require('debug')('appreports:app');

var schema = new Schema({
	storeId: String,
  name: String,
  image: String,
  primaryUrl: String,
  bitly: String,
  formatUrl: String,
  platform: String,
  baseline: Number
});

schema.methods.rollUp = function(done) {
  StoreRating.distinct('date', { storeId: this.storeId }, function(err, dates) {
    dates.sort(function(a, b) {
      return a - b;
    });

    var previous = null;
    async.eachSeries(dates, function(date, nextDate) {
      debug('rolling up', this.name, date);
      var data = { storeId: this.storeId, date: date };
      AppSummary.findOne(data, function(err, summary) {
        if(!summary) {
          summary = new AppSummary(data);
        }

        if(summary.finalized) {
          return nextDate();
        }

        summary.name = this.name;
        summary.image = this.image;
        summary.primaryUrl = this.primaryUrl;
        summary.platform = this.platform;

        StoreRating.find(
          { storeId: summary.storeId, date: date, ratingCount: { $gt: 0 }},
          { region: 1, ratingCount: 1, ratingAverage: 1 },
          function(err, ratings) {
          var worldTotal = worldCount = 0;
          async.each(ratings, function(rating, nextRating) {
            if(rating.region == 'en-us') {
              summary.usaRatings = rating.ratingCount;
              summary.usaAverage = Math.floor(rating.ratingAverage * 10) / 10;
            }

            worldCount += rating.ratingCount;
            worldTotal += rating.ratingCount * rating.ratingAverage;

            nextRating();
          }, function(err) {
            summary.worldRatings = worldCount;
            summary.worldAverage = Math.floor(worldTotal / worldCount * 10) / 10;
            summary.usaRatingsChange = 0;
            summary.usaAverageChange = 0;
            summary.worldRatingsChange = 0;
            summary.worldAverageChange = 0;

            if(previous) {
              summary.usaRatingsChange = summary.usaRatings - previous.usaRatings;
              summary.usaAverageChange = Math.floor((summary.usaAverage - previous.usaAverage) * 10) / 10;
              summary.worldRatingsChange = summary.worldRatings - previous.worldRatings;
              summary.worldAverageChange = Math.floor((summary.worldAverage - previous.worldAverage) * 10) / 10;
            }

            summary.save(function() {
              previous = summary;
              nextDate();
            });
          });
        }.bind(this));
      }.bind(this));
    }.bind(this), done);
  }.bind(this));
}

schema.methods.expandStoreLinks = function(done) {
  debug('total regions to verify', regions.length);
  crawler.fetchAppDetails(this.primaryUrl, function(err, details) {
    debug('updating name', details.name);
    this.name = details.name;
    this.save();
  }.bind(this));

  async.eachLimit(regions, 20, function(region, nextRegion) {
    var url = this.getUrl(region);
    crawler.getStatus(url, function(status) {
      var data = {
        storeId: this.storeId,
        region: region
      };

      StoreLink.findOne(data, data, { 'new': true, upsert: true }, function(err, doc) {
        if(!doc) {
          doc = new StoreLink(data);
        }

        doc.status = status;
        doc.name = this.name;
        doc.processedAt = moment().tz('America/Los_Angeles').toDate();
        doc.platform = this.platform;
        doc.primaryUrl = this.primaryUrl;
        doc.url = url;
        doc.bitly = this.bitly;
        doc.baseline = this.baseline;

        debug('upserting StoreLink', doc);
        doc.save();
        nextRegion();
      }.bind(this));
    }.bind(this));
  }.bind(this), done);
}

schema.methods.parseUrl = function(url) {
	if(url.indexOf('windowsphone.com') > 0) {
		this.platform = 'phone';
  } else {
  	this.platform = 'client';
  }

  this.storeId = url.substr(url.length - 36);
  this.primaryUrl = url;
  this.formatUrl = url.replace('en-us', '%s');
}

schema.methods.getUrl = function(region) {
	return util.format(this.formatUrl, region);
}

schema.statics.getRatingsForYesterday = function(storeId, callback) {
  StoreRating.getForDate(storeId, StoreRating.yesterday(), callback);
}

schema.statics.getRatingsForToday = function(storeId, callback) {
  StoreRating.getForDate(storeId, StoreRating.today(), callback);
}

schema.statics.getRatingChange = function(storeId, callback) {
  this.getRatingsForToday(storeId, function(err, today) {
    this.getRatingsForYesterday(storeId, function(err, yesterday) {
      debug('icanhaschange?', today, yesterday);
      callback(err, today.totalRatings - yesterday.totalRatings);
    });
  }.bind(this));
}

module.exports = mongoose.model('App', schema);
