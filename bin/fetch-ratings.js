var AppLink = require('models/app-link');
var debug = require('debug')('appreports:fetchratings');

require('app/db').connect();

AppLink.processLinks({}, function(newRatings) {
  debug('done', newRatings);
  process.exit();
}, function(progress) {
  debug('progress', progress);
});
