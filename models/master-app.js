var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var _ = require('underscore');
var moment = require('moment-timezone');
var util = require('util');
var StoreLink = require('./store-link');
var StoreRating = require('./store-rating');
var regions = require('../data/regions');
var async = require('async');
var crawler = require('../crawler/');
var debug = require('debug')('appreports:master-app');

var schema = new Schema({
	storeId: String,
  name: String,
  image: String,
  primaryUrl: String,
  formatUrl: String,
  platform: String,
  segment: String
});

schema.methods.expandStoreLinks = function(done) {
  debug('total regions to verify', regions.length);
  async.eachLimit(regions, 20, function(region, nextRegion) {
    var url = this.getUrl(region);
    crawler.getStatus(url, function(status) {
      var data = {
        storeId: this.storeId,
        name: this.name,
        platform: this.platform,
        primaryUrl: this.primaryUrl,
        url: url,
        region: region,
        segment: this.segment };

      StoreLink.findOneAndUpdate(data, data, { upsert: true }, function(err, doc) {
        doc.status = status;
        doc.processedAt = moment().tz('America/Los_Angeles').toDate();
        debug('upserting StoreLink', doc);
        doc.save();
        nextRegion();
      });
    }.bind(this));
  }.bind(this), done);
}

schema.methods.regionBreakdown = function() {
	var today = moment().tz('America/Los_Angeles').format('YYYYMMDD');
	var ratingsForToday = this.ratingHistory.id(today);
	if(!ratingsForToday || !ratingsForToday.regions) {
		return '';
	}

	var regions = [];
	_.each(ratingsForToday.regions, function(region) {
		regions.push(region._id + ': ' + region.ratings);
	});

	return regions.join('\n');
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

schema.methods.getRatingsForYesterday = function(callback) {
  StoreRating.getForDate(this.storeId, StoreRating.yesterday(), callback);
}

schema.methods.getRatingsForToday = function(callback) {
  StoreRating.getForDate(this.storeId, StoreRating.today(), callback);
}

schema.methods.getRatingChange = function(callback) {
  this.getRatingsForToday(function(err, today) {
    this.getRatingsForYesterday(function(err, yesterday) {
      callback(err, today.totalRatings - yesterday.totalRatings);
    });
  });
}

module.exports = mongoose.model('App', schema);
