var StoreRating = require('../models/rating');
var App = require('../models/app');
var debug = require('debug')('appreports:region');
var ratings = require('../crawler/ratings');
var crawler = require('../crawler/');
var async = require('async');

exports.list = function(req, res) {
  StoreRating.appsNeedingRatings(function(err, data) {
    var segments = {};
    var total = 0;
    async.each(data, function(d, n) {
      segments[d._id] = d.count;
      total += d.count;
      n();
    }, function(err) {
      segments['us'] = total;

      StoreRating.getDetails(function(err, details) {
        async.each(details, function(app, next) {
          App.getRatingChange(app._id.storeId, function(err, change) {
            app.change = change;
            if(app._id.baseline > 0) {
              app.ratings = app.ratings - app._id.baseline;
              app.breakdown = [];
            }
            next();
          });
        }, function(err) {
          res.render('region-index', { apps: details, pendingApps: segments });
        });
      });

    });
  });
};

exports.details = function(req, res) {
  var segment = req.params.segment;
  if(!segment) {
    return res.redirect('/');
  }

  StoreRating.getDetailsForSegment(segment, function(err, details) {
    async.each(details, function(app, next) {
      App.getRatingChange(app._id.storeId, function(err, change) {
        app.change = change;
        if(app._id.baseline > 0) {
          app.ratings = app.ratings - app._id.baseline;
          app.breakdown = [];
        }
        next();
      });
    }, function(err) {
      res.render('region-details', { segment: segment, apps: details });
    });
  });
};

exports.doUpdate = function(req, res) {
  var storeId = req.params.storeId;
  var segment = req.body.segment;
  var name = req.body.name;
  var bitly = req.body.bitly;
  var baseline = req.body.baseline;
  if(!storeId || !segment) {
    debug('cannot update', storeId, segment);
    return res.redirect('back');
  }

  App.findOne({ storeId: storeId }, function(err, app) {
    if(!app) {
      return res.redirect('back');
    }
    app.segment = segment;
    app.name = name;
    app.bitly = bitly;
    app.baseline = baseline;

    app.save(function() {
      debug('expanding new storelinks');
      app.expandStoreLinks(function() {
        debug('fetching new storeratings');
        ratings.processStoreLinks(app.storeId, function() {
          res.redirect('/region/' + segment);
        });
      });
    });
  });
}

exports.update = function(req, res) {
  var storeId = req.params.storeId;
  App.findOne({ storeId: storeId }, function(err, app) {
    if(!app) {
      return res.redirect('back');
    }

    res.render('update-app', app);
  });
};

exports.sync = function(req, res) {
  var options = {
    limit: req.query.limit,
    storeId: req.query.storeId
  };

  ratings.processStoreLinks(options, function() {
    res.send('done');
  });
};

exports.add = function(req, res) {
  debug('trying add', req.body);
  var storeUrl = req.body.storeUrl;
  var segment = req.body.segment;
  if(!storeUrl) {
    debug('no storeUrl, redirecting');
    return res.redirect('back');
  }

  App.findOne({ primaryUrl: storeUrl }, function(err, app) {
    if(!app) {
      app = new App();
    }

    app.parseUrl(storeUrl);
    crawler.fetchAppDetails(app.primaryUrl, function(err, details) {
      app.name = details.name;
      debug('saving new app');
      app.save(function() {
        res.redirect('/update/' + app.storeId);
      });
    });
  });
}
