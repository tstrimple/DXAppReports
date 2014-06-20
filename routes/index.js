var crawler = require('../crawler');
var MasterApp = require('../models/master-app');
var StoreLink = require('../models/store-link');
var Rating = require('../models/store-rating');
var async = require('async');
var util = require('util');

var regions = require('../data/regions');

exports.list = function(req, res) {
  var clientApps = [];
  var phoneApps = [];
  App.find().exec(function(err, apps) {

    async.each(apps, function(app, nextApp) {
      app.getRatingsForToday(function(err, today) {
        app.totalRatings = today.totalRatings;
        app.regionBreakdown = today.regionBreakdown;
        if(app.platform === 'client') {
          clientApps.push(app);
        } else {
          phoneApps.push(app);
        }
        nextApp();
      });
    }, function(err) {
      var sortedClientApps = _.sortBy(clientApps, function(app) { return app.totalRatings; });
      var sortedPhoneApps = _.sortBy(phoneApps, function(app) { return app.totalRatings; });
      res.render('app-list', { clientApps: sortedClientApps, phoneApps: sortedPhoneApps });
    });
  });
}

function updateAppRegions(app, done) {
  app.regions = [];
  async.each(countryCodes, function(region, next) {
    region = region.toLowerCase();
    crawler.getStatus(app.getUrl(region), function(status) {
      AppStoreLink.
      next();
    });
  }, function(err) {
    app.save();
    done(app.regions);
  });
}

exports.syncRegions = function(req, res) {
	var query = {};
	if(req.params.id) {
		query = { storeId: req.params.id };
	}

  App.find(query).exec(function(err, apps) {
  	res.write('<html><body><h1>syncing regions</h1>');
    async.eachSeries(apps, function(app, next) {
    	res.write('<h2>' + app.name + '</h2>')
      updateAppRegions(app, function(regions) {
      	res.write('<p>' + regions.join(', ') + '</p>')
      	next();
      });
    }, function() {
    	res.end('<h3>done synchronizing regions</h3></body></html>');
    });
  });
}

exports.syncRatings = function(req, res) {
	var query = {};
	if(req.params.id) {
		query = { storeId: req.params.id };
	}

  App.find(query).exec(function(err, apps) {
  	res.write('<html><body><h1>fetching ratings</h1>')
    async.eachSeries(apps, function(app, nextApp) {
    	res.write('<h2>' + app.name + '</h2><code><ul>');

      async.each(app.regions, function(region, nextRegion) {
        (function(region, nextRegion) {
          var url = app.getUrl(region);
          getAppRatings(url, function(err, ratings) {
          	res.write('<li>' + region + ': ' + ratings + '</li>');
            if(ratings === 0) {
              return nextRegion();
            }

            var data = { storeId: app.storeId, date: Rating.today(), region: region, name: app.name, platform: app.platform, url: app.primaryUrl };
            Rating.findOneAndUpdate(data, data, { upsert: true }, function(err, doc) {
              doc.ratings = ratings;
              doc.save();
              nextRegion();
            });
          });
      	})(region, nextRegion);
    	}, function(err) {
      	res.write('</ul></code>')
        nextApp();
      });

    }, function(err) {
      res.end('<h3>done fetching ratings</h3></body></html>');
    });
  });

}

exports.details = function(req, res) {
  App.findOne({ storeId: req.params.id }).exec(function(err, app) {
    res.render('app-details', app);
  });
}
