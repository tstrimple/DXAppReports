var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var schema = new Schema({
  storeId: String,
  name: String,
  platform: String,
  bitly: String,
  primaryUrl: String,
  url: String,
  region: String,
  segment: String,
  status: String,
  processedAt: Date,
  baseline: Number
});

schema.statics.upsert = function() {

}

module.exports = mongoose.model('StoreLink', schema);
