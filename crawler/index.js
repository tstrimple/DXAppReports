var request = require('request');
var cheerio = require('cheerio');
var debug = require('debug')('appreports:crawler');

function parseAppName(body) {
  $ = cheerio.load(body);

  var name = $('#ProductTitleText').text();
  if(!name) {
    name = $('#application h1').text();
  }

  return name;
}

exports.getStatus = function(url, callback) {
  request({ url: url, followRedirect: false }, function(err, res) {
    debug(res.statusCode, res.headers.location);
    return callback(res.statusCode);
  });
}

exports.fetchAppRating = function(url, callback) {
  request({ url: url, followRedirect: false }, function(err, resp, body) {
    if(err) {
      return callback(err);
    }

    $ = cheerio.load(body);

    var rating = $('#MainStars .RatingTextInline').text();
    if(!rating) {
      rating = $('#rating span').text();
      if(rating) {
        rating = rating.split(' ')[0];
      }
    }

    rating = parseInt(rating);
    return callback(null, isNaN(rating) ? 0 : rating);
  });
}

exports.fetchAppDetails = function(url, callback) {
  request({ url: url, followRedirect: false }, function(err, resp, body) {
    if(err) {
      return callback(err);
    }

    var name = parseAppName(body);
    return callback(null, { name: name });
  });
}