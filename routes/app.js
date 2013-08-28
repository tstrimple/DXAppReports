var nstore = require('nstore'),
    nstore = nstore.extend(require('nstore/query')()),
    appCache = require('../data/appcache'),
    apps = nstore.new('data/apps.db', function() {
      apps.all(function(err, docs) {
        for(var url in docs) {
          appCache.add(url, docs[url]);
        }
      });
    }),
    cheerio = require('cheerio'),
    request = require('request');

exports.list = function(req, res) {
  appCache.all(function(err, docs) {
    console.log(docs);
    res.render('index', { apps: docs });    
  });
};

function getPlatform(body) {
  $ = cheerio.load(body);

  var rating = $('#MainStars .RatingTextInline').text();
  
  return rating ? 'Windows 8' : 'Windows Phone';
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

function getAppDetails(url, callback) {
  request(url, function(err, resp, body) {
    if(err) {
      callback(err);
    }

    var title = getTitle(body);
    var rating = getRating(body);
    var image = getImage(body);
    var platform = getPlatform(body);

    callback(null, { url: url, title: title, rating: rating, image: image, platform: platform });
  });
}


exports.add = function(req, res) {
  var url = req.body.url;
  if(!url) {
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
