var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var moment = require('moment-timezone');
var util = require('util');
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

schema.methods.expandStoreLinks = function(done) {
  debug('total regions to verify', regions.length);
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
