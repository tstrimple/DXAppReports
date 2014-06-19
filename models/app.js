var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var _ = require('underscore');
var moment = require('moment-timezone');
var util = require('util');

var appSchema = new Schema({
	storeId: String,
  name:  String,
  image: String,
  primaryUrl: String,
  formatUrl: String,
  platform: String,
  regions: [String],
  ratings: Number,
  ratingHistory: [{ _id: Number, ratings: Number, regions: [ { _id: String, ratings: Number } ] }]
});

appSchema.methods.parseUrl = function(url) {
	if(url.indexOf('windowsphone.com') > 0) {
		this.platform = 'phone';
  } else {
  	this.platform = 'client';
  }

  this.storeId = url.substr(url.length - 36);
  this.primaryUrl = url;
  this.formatUrl = url.replace('en-us', '%s');
}

appSchema.methods.getUrl = function(region) {
	return util.format(this.formatUrl, region);
}

appSchema.methods.updateRatings = function(region, ratings) {
	var today = moment().format('YYYYMMDD');
	var ratingsForToday = this.ratingHistory.id(today);
	if(!ratingsForToday) {
		ratingsForToday = { _id: today, ratings: 0, regions: [] };
		this.ratingHistory.push(ratingsForToday);
		ratingsForToday = this.ratingHistory[0];
	}

	var regionRatings = _.find(ratingsForToday.regions, function(item) { return item._id === region; });
	if(!regionRatings) {
		regionRatings = { _id: region, ratings: ratings };
		ratingsForToday.regions.push(regionRatings);
	}

	regionRatings.ratings = ratings;
	var totalRatings = _.reduce(ratingsForToday.regions, function(total, r) { return total + r.ratings * 1; }, 0);

	this.ratings = totalRatings;
	ratingsForToday.ratings = totalRatings;
}

appSchema.methods.getRatingChange = function() {
	var today = moment().format('YYYYMMDD');
	var yesterday = today - 1;
	var history = _.find(this.ratingHistory, function(day) { return day === yesterday; });
	return history ? this.ratings - history.ratings : 0;
}

module.exports = mongoose.model('App', appSchema);
