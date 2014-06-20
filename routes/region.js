var StoreRating = require('../models/store-rating');
var App = require('../models/master-app');
var debug = require('debug')('appreports:region');
var ratings = require('../crawler/ratings');
var crawler = require('../crawler/');

exports.list = function(req, res) {
  //  aggregate ratings by region
  res.render('region-index', {});
};

exports.details = function(req, res) {
  var segment = req.params.segment;
  if(!segment) {
    return res.redirect('/');
  }

  StoreRating.getDetailsForSegment(segment, function(err, details) {
    res.render('region-details', { segment: segment, apps: details });
  });
};

exports.doUpdate = function(req, res) {
  var storeId = req.params.storeId;
  var segment = req.body.segment;
  var name = req.body.name;
  var bitly = req.body.bitly;
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
