var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var schema = new Schema({
  storeId: String,
  region: String,
  name: String,
  platform: String,
  bitly: String,
  primaryUrl: String,
  url: String,
  status: String,
  processedAt: Date,
  baseline: Number
});

module.exports = mongoose.model('Link', schema);
