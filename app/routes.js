var debug = require('debug')('appreports:region');
var async = require('async');

var App = require('models/app');
var AppRating = require('models/app-rating');
var AppSummary = require('models/app-summary');
var AppLink = require('models/app-link');
var crawler = require('app/crawler');
var passport = require('passport');
var WindowsActiveDirectoryStrategy = require('passport-azure-ad').WsfedStrategy;

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});

passport.use(new WindowsActiveDirectoryStrategy({
    homeRealm: 'microsoft.com',
    homerealm: 'microsoft.com',
    realm: process.env.AUTH_REALM || 'https://appreports.azurewebsites.net/',
    identityProviderUrl: 'https://login.windows.net/72f988bf-86f1-41af-91ab-2d7cd011db47/wsfed',
    identityMetadata: 'https://login.windows.net/72f988bf-86f1-41af-91ab-2d7cd011db47/federationmetadata/2007-06/federationmetadata.xml',
    logoutUrl: process.env.AUTH_LOGOUT || 'https://appreports.azurewebsites.net/notauthorized'
},
  function(profile, done) {
    var user = {
      email: profile.email,
      name: profile.givenName + ' ' + profile.familyName
    };
    debug('authenticated', user);
    return done(null, user);
  }
));

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

function getStaleAppSummary(req, res) {
  App.getStaleAppSummary(function(err, staleAppSummary) {
    res.render('stale', staleAppSummary);
  });
}

function addApp(req, res) {
  debug('trying add', req.body);
  var includeAppRatings = req.query.includeAppRatings || false;
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
      app.includeAppRatings = includeAppRatings;
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

function syncApps(req, res) {
  App.updateApps(function(err) {
    debug('done updating apps', err);
    res.send('done');
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

function ensureAuthenticated(req, res, next) {
  console.log('user', req.user);
  if (req.isAuthenticated()) {
    res.locals.user = req.user;
    return next();
  }

  res.redirect('/auth');
}

module.exports = function(io) {
  var router = require('express').Router();

  router.get('/', ensureAuthenticated, getAppSummary);
  router.get('/stale', ensureAuthenticated, getStaleAppSummary);
  router.get('/details/:storeId', ensureAuthenticated, getAppDetails);
  router.post('/add', ensureAuthenticated, addApp);


  router.get('/notauthorized', function(req, res) {
    if(!req.isAuthenticated()) {
      res.render('notauthorized');
    } else {
      res.redirect('/');
    }
  });

  router.get('/sync', syncRatings.bind(null, io));
  router.get('/syncApps', syncApps);

  router.get('/auth', passport.authenticate('wsfed-saml2', { failureRedirect: '/notauthorized' }), function(req, res) { res.redirect('/'); });
  router.post('/auth', passport.authenticate('wsfed-saml2', { failureRedirect: '/notauthorized' }), function(req, res) { res.redirect('/'); });
  router.get('/logout', function(req, res) { req.logOut(); res.redirect('/notauthorized'); });

  return router;
};
