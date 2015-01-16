var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var debug = require('debug')('appreports');

var routes = require('./routes/')(io);
var ratings = require('./crawler/ratings');
var path = require('path');
var mongoose = require('mongoose');
var bodyParser = require('body-parser');
var async = require('async');
var port = process.env.PORT || 3000;

if(!process.env.MONGO_URI) {
	throw 'Must set MONGO_URI environment variable';
}
mongoose.connect(process.env.MONGO_URI);

app.locals.regionMap = require('./data/regions');

app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', routes);

server.listen(port, function() {
  debug('Server listening on port ' + port);
});
