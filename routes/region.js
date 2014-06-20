var StoreRating = require('../models/store-rating');
var debug = require('debug')('appreports:region');

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
    debug('segment details', details);
    res.render('region-details', { segment: segment, apps: details });
  });
};
