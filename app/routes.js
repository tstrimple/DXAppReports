var debug = require('debug')('appreports:region');
var async = require('async');

var App = require('models/app');
var AppRating = require('models/app-rating');
var AppSummary = require('models/app-summary');
var AppLink = require('models/app-link');
var crawler = require('app/crawler');

function getAppSummary(req, res) {
  AppSummary.getCurrentSummary(function(err, summary) {
    res.render('summary', { apps: summary })
  });
}

function getAppDetails(req, res) {
  if(!req.params.storeId) {
    return res.redirect('/');
  }

  App.getDetails(req.params.storeId, function(err, app, regions) {
    res.render('details', { app: app, regions: regions });
  });
}

function addApp(req, res) {
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
        debug('expanding AppLinks');
        app.findStoreRegions(function() {
          debug('fetching new AppRatings');
          AppLink.processLinks({ storeId: app.storeId }, function() {
            res.redirect('/');
          });
        });
      });
    });
  });
}

function syncRatings(io, req, res) {
  io.emit('sync-started');
  var options = {
    limit: req.query.limit,
    storeId: req.query.storeId
  };

  AppLink.processLinks(options, function(newRatings) {
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
}

module.exports = function(io) {
  var router = require('express').Router();

  router.get('/', getAppSummary);
  router.get('/details/:storeId', getAppDetails);
  router.get('/sync', syncRatings.bind(null, io));
  router.post('/add', addApp);

  return router;
};
