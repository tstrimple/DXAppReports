var express = require('express');
var apps = require('./routes/');
var region = require('./routes/region');
var StoreLink = require('./models/store-link');
var StoreRating = require('./models/store-rating');
var async = require('async');
var crawler = require('./crawler/');
var moment = require('moment-timezone');
var http = require('http');
var path = require('path');
var app = express();
var debug = require('debug')('appreports');
var mongoose = require('mongoose');

if(!process.env.MONGO_URI) {
	throw 'Must set MONGO_URI environment variable';
}
mongoose.connect(process.env.MONGO_URI);

app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', region.list);
//app.get('/:id', apps.details);
//app.post('/add', apps.add);
app.get('/region/:segment', region.details);
app.get('/sync-regions', apps.syncRegions);
app.get('/sync-ratings', apps.syncRatings);
app.get('/sync-regions/:id', apps.syncRegions);
app.get('/sync-ratings/:id', apps.syncRatings);

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

function fetchAllRatings() {
  var stream = StoreLink.find({ status: '200' }).sort({ processedAt: -1 }).exec(function(err, storeLinks) {
    var count = 0;
    var max = storeLinks.length;
    debug('processing urls', storeLinks.length);
    async.eachLimit(storeLinks, 20, function(storeLink, next) {
      count++;
      crawler.fetchAppRating(storeLink.url, function(err, ratings) {
        storeLink.processedAt = moment().tz('America/Los_Angeles').toDate();
        storeLink.save();
        if(ratings === 0) {
          return next();
        }
        var data = {
          storeId: storeLink.storeId,
          date: StoreRating.today(),
          region: storeLink.region,
          name: storeLink.name,
          platform: storeLink.platform,
          url: storeLink.url
        };

        StoreRating.findOneAndUpdate(data, data, { upsert: true }, function(err, doc) {
          doc.primaryUrl = storeLink.primaryUrl;
          doc.ratings = ratings;
          doc.segment = storeLink.segment;
          debug('updating ratings', count, max);
          doc.save();
          return next();
        });
      });
    }, function(err) {
      setTimeout(fetchAllRatings, 600000);
    });
  });
}

fetchAllRatings();
