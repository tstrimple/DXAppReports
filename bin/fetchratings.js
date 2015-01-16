var ratings = require('./crawler/ratings');
var mongoose = require('mongoose');
var debug = require('debug')('appreports:fetchratings');

if(!process.env.MONGO_URI) {
  throw 'Must set MONGO_URI environment variable';
}

mongoose.connect(process.env.MONGO_URI);

ratings.processStoreLinks(function() {
  debug('done');
});
