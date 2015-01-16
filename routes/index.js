var StoreRating = require('../models/rating');
var App = require('../models/app');
var AppSummary = require('../models/app-summary');
var debug = require('debug')('appreports:region');
var ratings = require('../crawler/ratings');
var crawler = require('../crawler/');
var async = require('async');

module.exports = function(io) {

var router = require('express').Router();

  router.get('/', function(req, res) {
    AppSummary.find({ date: StoreRating.today() }, function(err, apps) {
      res.render('list', { apps: apps });
    });
  });

  router.get('/sync', function(req, res) {
    io.emit('sync-started');
    var options = {
      limit: req.query.limit,
      storeId: req.query.storeId
    };

    ratings.processStoreLinks(options, function(newRatings) {
      debug('fetching raw data');
      App.find().exec(function(err, apps) {
        debug('rolling up data');
        async.each(apps, function(app, nextApp) {
          app.rollUp(nextApp);
        }, function(err) {
          debug(err);
            io.emit('sync-completed', newRatings);
            res.send('done');
        });
      });
    }, function(percent) {
      io.emit('sync-progress', percent);
    });
  });

  router.get('/details/:storeId', function(req, res) {
    App.findOne({ storeId: req.params.storeId }, function(err, app) {
      StoreRating.getDetails(req.params.storeId, function(err, regions) {
        res.render('details', { app: app, regions: regions });
      });
    });
  });

  router.post('/add', function(req, res) {
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
  });

  return router;
};
