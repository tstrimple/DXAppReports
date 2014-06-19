var nstore = require('nstore'),
    App = require('../models/app');
    cheerio = require('cheerio'),
    request = require('request'),
    async = require('async'),
    updated = null,
    countryCodes = ['en-us', 'af-ZA', 'sq-AL', 'ar-DZ', 'ar-BH', 'ar-EG', 'ar-IQ', 'ar-JO', 'ar-KW', 'ar-LB', 'ar-LY', 'ar-MA', 'ar-OM', 'ar-QA', 'ar-SA', 'ar-SY', 'ar-TN', 'ar-AE', 'ar-YE', 'hy-AM', 'Cy-az', 'Lt-az', 'eu-ES', 'be-BY', 'bg-BG', 'ca-ES', 'zh-CN', 'zh-HK', 'zh-MO', 'zh-SG', 'zh-TW', 'zh-CHS', 'zh-CHT', 'hr-HR', 'cs-CZ', 'da-DK', 'div-MV', 'nl-BE', 'nl-NL', 'en-AU', 'en-BZ', 'en-CA', 'en-CB', 'en-IE', 'en-JM', 'en-NZ', 'en-PH', 'en-ZA', 'en-TT', 'en-GB', 'en-ZW', 'et-EE', 'fo-FO', 'fa-IR', 'fi-FI', 'fr-BE', 'fr-CA', 'fr-FR', 'fr-LU', 'fr-MC', 'fr-CH', 'gl-ES', 'ka-GE', 'de-AT', 'de-DE', 'de-LI', 'de-LU', 'de-CH', 'el-GR', 'gu-IN', 'he-IL', 'hi-IN', 'hu-HU', 'is-IS', 'id-ID', 'it-IT', 'it-CH', 'ja-JP', 'kn-IN', 'kk-KZ', 'kok-IN', 'ko-KR', 'ky-KZ', 'lv-LV', 'lt-LT', 'mk-MK', 'ms-BN', 'ms-MY', 'mr-IN', 'mn-MN', 'nb-NO', 'nn-NO', 'pl-PL', 'pt-BR', 'pt-PT', 'pa-IN', 'ro-RO', 'ru-RU', 'sa-IN', 'Cy-sr', 'Lt-sr', 'sk-SK', 'sl-SI', 'es-AR', 'es-BO', 'es-CL', 'es-CO', 'es-CR', 'es-DO', 'es-EC', 'es-SV', 'es-GT', 'es-HN', 'es-MX', 'es-NI', 'es-PA', 'es-PY', 'es-PE', 'es-PR', 'es-ES', 'es-UY', 'es-VE', 'sw-KE', 'sv-FI', 'sv-SE', 'syr-SY', 'ta-IN', 'tt-RU', 'te-IN', 'th-TH', 'tr-TR', 'uk-UA', 'ur-PK', 'Cy-uz', 'Lt-uz', 'vi-VN'];

function isNumber(obj) { return !isNaN(parseFloat(obj)) }

exports.list = function(req, res) {
  App.find().exec(function(err, apps) {
    var clientApps = [];
    var phoneApps = [];
    _.each(apps, function(app) {
      if(app.platform === 'client') {
        clientApps.push(app);
      } else {
        phoneApps.push(app);
      }
    });
    var sortedClientApps = _.sortBy(clientApps, function(app) { return app.ratings * 1; });
    var sortedPhoneApps = _.sortBy(phoneApps, function(app) { return app.ratings * 1; });

    res.render('index', { clientApps: sortedClientApps, phoneApps: sortedPhoneApps, updated: updated });
  });
}

function updateAllDetails() {
  App.find().exec(function(err, apps) {
    async.each(apps, function(app, next) {
      getAppDetails(app.primaryUrl, function(err, details) {
        app.name = details.name;
        app.image = details.image;
        app.save();
        next();
      });
    }, function(err) {
      console.log('updated all apps');
    });
  });
}

function updateAppRegions(app, done) {
  app.regions = [];
  async.each(countryCodes, function(region, next) {
    region = region.toLowerCase();
    isValidRegionUrl(app.getUrl(region), function(isValid) {
      if(isValid || region === 'en-us') {
        app.regions.push(region);
      }
      next();
    });
  }, function(err) {
    app.save();
    done(app.regions);
  });
}

function updateAllRatings() {
  App.find().exec(function(err, apps) {
    async.eachSeries(apps, function(app, nextApp) {

      async.each(app.regions, function(region, nextRegion) {
        (function(region, nextRegion) {
          var url = app.getUrl(region);
          getAppRatings(url, function(err, ratings) {
            if(ratings > 0) {
              app.updateRatings(region, ratings);
            }

            nextRegion();
          });
        })(region, nextRegion);
      }, function(err) {
        app.save();
        console.log('done with', app.name);
        nextApp();
      });

    }, function(err) {
      console.log('done updating ratings')
    });
  });
}

function getRating(body) {
  $ = cheerio.load(body);

  var rating = $('#MainStars .RatingTextInline').text();
  if(!rating) {
    rating = $('#rating span').text();
    if(rating) {
      rating = rating.split(' ')[0];
    }
  }

  rating = isNumber(rating) ? rating : 0;

  return rating;
}

function getTitle(body) {
  $ = cheerio.load(body);

  var title = $('#ProductTitleText').text();
  if(!title) {
    title = $('#application h1').text();
  }

  return title;
}

function getImage(body) {
  $ = cheerio.load(body);

  var image = $('#AppLogo img').attr('src');
  if(!image) {
    image = $('img.appImage').attr('src');
  }

  return image;
}

function getAppRatings(url, callback) {
  request({ url: url, followRedirect: false }, function(err, resp, body) {
    if(err) {
      callback(err);
    }

    var ratings = getRating(body);
    callback(null, ratings * 1);
  });
}

function getAppDetails(url, callback) {
  request({ url: url, followRedirect: false }, function(err, resp, body) {
    if(err) {
      callback(err);
    }

    var title = getTitle(body);
    var image = getImage(body);

    callback(null, { name: title, image: image });
  });
}

function isValidRegionUrl(url, callback) {
    request({ url: url, followRedirect: false, method: 'HEAD' }, function(err, resp, body) {
    if(err || resp.statusCode != 200) {
      return callback(false);
    }

    return callback(true);
  });
}

function isValid(url) {
  return url.indexOf('http://apps.microsoft.com/') === 0 || url.indexOf('http://www.windowsphone.com/') === 0;
}

exports.syncRegions = function(req, res) {
  App.find().exec(function(err, apps) {
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

exports.syncSingle = function(req, res) {
	if(!req.params.id) {
		return res.end('must supply app id');
	}

	App.findOne({ storeId: req.params.id }, function(err, app) {
  	res.write('<html><body><h1>fetching ratings</h1>')

		res.write('<h2>' + app.name + '</h2><code><ul>');
    async.each(app.regions, function(region, nextRegion) {

      (function(region, nextRegion) {
        var url = app.getUrl(region);
        getAppRatings(url, function(err, ratings) {
        	res.write('<li>' + region + ': ' + ratings + '</li>');
          if(ratings > 0) {
            app.updateRatings(region, ratings);
          }

          nextRegion();
        });
    	})(region, nextRegion)
  	}, function(err) {
    	res.write('</ul></code>')
      app.save();
      res.end('<h3>done fetching ratings</h3></body></html>');
    });
  });
}

exports.syncRatings = function(req, res) {
  App.find().exec(function(err, apps) {
  	res.write('<html><body><h1>fetching ratings</h1>')
    async.eachSeries(apps, function(app, nextApp) {
    	res.write('<h2>' + app.name + '</h2><code><ul>');
      async.each(app.regions, function(region, nextRegion) {

        (function(region, nextRegion) {
          var url = app.getUrl(region);
          getAppRatings(url, function(err, ratings) {
          	res.write('<li>' + region + ': ' + ratings + '</li>');
            if(ratings > 0) {
              app.updateRatings(region, ratings);
            }

            nextRegion();
          });
      	})(region, nextRegion)
    	}, function(err) {
      	res.write('</ul></code>')
        app.save();
        nextApp();
      });

    }, function(err) {
      res.end('<h3>done fetching ratings</h3></body></html>');
    });
  });

}

exports.add = function(req, res) {
  var url = req.body.url;
  if(!url || !isValid(url)) {
    return res.send(400, 'Must supply a store deeplink to add.');
  }

  getAppDetails(url, function(err, details) {
    if(err) throw err;

    if(!details) {
      return res.send(404, 'Could not find an app with the url: ' + url);
    }

    apps.save(url, details, function(err) {
      if(err) throw err;

      appCache.add(url, details);
      res.redirect('/');
    });
  });
};
