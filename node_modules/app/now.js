var moment = require('moment-timezone');

module.exports = function() {
  storeLink.processedAt = moment().tz('America/Los_Angeles');
}
