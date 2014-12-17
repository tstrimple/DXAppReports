var request = require('request');
var cheerio = require('cheerio');
var debug = require('debug')('appreports:crawler');

var userAgent = 'Mozilla/5.0 (Windows; U; Windows NT 5.1; en-US; rv:1.8.1.9) Gecko/20071025 Firefox/2.0.0.9';

function parseAppName(body) {
  $ = cheerio.load(body);

  var name = $('h1[itemprop="name"]').text();
  return name;
}

exports.getStatus = function(url, callback) {
  request({ url: url, followRedirect: false, headers: { 'User-Agent': userAgent }}, function(err, res) {
    debug(res.statusCode, url);
    return callback(res.statusCode);
  });
}

exports.fetchAppRating = function(url, callback) {
  request({ url: url, followRedirect: false, headers: { 'User-Agent': userAgent }}, function(err, resp, body) {
    if(err) {
      return callback(err);
    }

    $ = cheerio.load(body);

    var ratingCount = $('meta[itemprop="ratingCount"]').attr("content");
    ratingCount = ratingCount.replace(',', '');
    ratingCount = parseInt(ratingCount);

    var ratingValue = $('meta[itemprop="ratingValue"]').attr("content");
    ratingValue = ratingValue.replace(',', '.');
    ratingValue = parseFloat(ratingValue);
    return callback(null, isNaN(ratingCount) ? 0 : ratingCount, isNaN(ratingValue) ? 0 : ratingValue);
  });
}

exports.fetchAppDetails = function(url, callback) {
  request({ url: url, followRedirect: false, headers: { 'User-Agent': userAgent }}, function(err, resp, body) {
    if(err) {
      return callback(err);
    }

    var name = parseAppName(body);
    debug('got name', name);
    return callback(null, { name: name });
  });
}
