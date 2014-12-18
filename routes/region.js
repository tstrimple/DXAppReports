var StoreRating = require('../models/rating');
var App = require('../models/app');
var AppSummary = require('../models/app-summary');
var debug = require('debug')('appreports:region');
var ratings = require('../crawler/ratings');
var crawler = require('../crawler/');
var async = require('async');

exports.list = function(req, res) {
  AppSummary.find({ date: StoreRating.today() }, function(err, apps) {
    res.render('list', { apps: apps });
  });
};

exports.details = function(req, res) {
  App.findOne({ storeId: req.params.storeId }, function(err, app) {
    StoreRating.getDetails(req.params.storeId, function(err, regions) {
      res.render('details', { app: app, regions: regions });
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
        res.redirect('/');
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
        debug('expanding storelinks');
        app.expandStoreLinks(function() {
          debug('fetching new storeratings');
          ratings.processStoreLinks({ storeId: app.storeId }, function() {
            res.redirect('/');
          });
        });
      });
    });
  });
}
