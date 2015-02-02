var parser = require('csv-parse')();
var fs = require('fs');
var crawler = require('app/crawler');
var App = require('models/app');
var debug = require('debug')('appreports:import');
var async = require('async');
var convertDateString = require('app/date').convertDateString;
require('app/db').connect();

if(process.argv.length < 3) {
  return console.error('You must supply the path to the csv file to import.');
}

var importFile = process.argv[2];

if (!fs.existsSync(importFile)) {
  return console.error('Could not find the file specified.');
}

var content = fs.readFileSync(importFile, { encoding: 'utf8' });
var rows = content.split('\n');
var apps = [];

async.each(rows, function(row, nextRow) {
  var data = row.split('|');
  if(data.length === 0) {
    return nextRow();
  }
  var appData = {
    storeId: data[0],
    name: data[1],
    datePublished: data[2] ? convertDateString(data[2], 'MM/DD/YY') : '',
    lastUpdated: data[3] ? convertDateString(data[3], 'MM/DD/YY') : '',
    primaryUrl: ''
  };

  apps.push(appData);
  nextRow();
}, function(err) {
  async.eachSeries(apps, function(app, nextApp) {
    crawler.getStoreUrl(app.storeId, function(err, url) {
      if(err) {
        return debug('error importing ' + app.name, err);
      }

      app.primaryUrl = url;

      App.createFromData(app, function() {
        debug('imported', app.name);
        nextApp();
      });
    });
  }, function(err) {
    debug('finished', err);
    process.exit();
  });
});

// var importStream = fs.createReadStream(importFile);

// var apps = [];

// parser.on('readable', function() {
//   while(record = parser.read()) {
//     var appData = {
//       storeId: record[3],
//       datePublished: convertDateString(record[0]),
//       lastUpdated: convertDateString(record[0]),
//       name: record[2],
//       primaryUrl: ''
//     };

//     apps.push(appData);
//   }
// });

// parser.on('error', function(err) {
//   debug('error', err.message);
// });

// parser.on('finish', function(err) {
//   async.eachSeries(apps, function(app, nextApp) {
//     crawler.getStoreUrl(app.storeId, function(err, url) {
//       if(err) {
//         return debug('error importing ' + app.name, err);
//       }

//       app.primaryUrl = url;

//       App.createFromData(app, function() {
//         debug('imported', app.name);
//         nextApp();
//       });
//     });
//   }, function(err) {
//     debug('finished', err);
//     process.exit();
//   });
// });

// importStream.pipe(parser);
