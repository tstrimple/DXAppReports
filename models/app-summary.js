var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var moment = require('moment-timezone');
var util = require('util');
var StoreLink = require('./link');
var StoreRating = require('./rating');
var async = require('async');
var crawler = require('../crawler/');
var debug = require('debug')('appreports:app');

var appSummarySchema = new Schema({
  storeId: String,
  date: Number,
  name: String,
  image: String,
  primaryUrl: String,
  platform: String,
  usaRatings: Number,
  usaRatingsChange: Number,
  usaAverage: Number,
  usaAverageChange: Number,
  worldRatings: Number,
  worldRatingsChange: Number,
  worldAverage: Number,
  worldAverageChange: Number,
  finalized: Boolean
});

module.exports = mongoose.model('AppSummary', appSummarySchema);
