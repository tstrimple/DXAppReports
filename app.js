var express = require('express');
var region = require('./routes/region');
var ratings = require('./crawler/ratings');
var http = require('http');
var path = require('path');
var app = express();
var debug = require('debug')('appreports');
var mongoose = require('mongoose');
var bodyParser = require('body-parser');
var socketio = require('socket.io');
var App = require('./models/app');
var async = require('async');

if(!process.env.MONGO_URI) {
	throw 'Must set MONGO_URI environment variable';
}
mongoose.connect(process.env.MONGO_URI);

app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(bodyParser.urlencoded());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

app.locals.regionMap = require('./data/regions');

app.get('/', region.list);
app.get('/details/:storeId', region.details);
app.post('/add', region.add);
app.get('/update/:storeId', region.update);
app.post('/update/:storeId', region.doUpdate);

var server = http.createServer(app);
var io = socketio(server);

app.get('/sync', function(req, res) {
  io.emit('sync-started');
  var options = {
    limit: req.query.limit,
    storeId: req.query.storeId
  };

  ratings.processStoreLinks(options, function(newRatings) {
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
});

server.listen(app.get('port'), function() {
  console.log('Express server listening on port ' + app.get('port'));
});
