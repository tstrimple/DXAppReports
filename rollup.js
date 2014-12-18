var MasterApp = require('./models/app');
var StoreLink = require('./models/link');
var StoreRating = require('./models/rating');
var mongoose = require('mongoose');
var async = require('async');
var debug = require('debug')('appreports:rollup');

if(!process.env.MONGO_URI) {
  throw 'Must set MONGO_URI environment variable';
}
mongoose.connect(process.env.MONGO_URI);

MasterApp.find().exec(function(err, apps) {
  async.each(apps, function(app, nextApp) {
    app.rollUp(nextApp);
  }, function(err) {
    debug(err);
    process.exit();
  });
});
