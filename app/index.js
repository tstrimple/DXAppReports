var path = require('path');
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var debug = require('debug')('appreports');
var bodyParser = require('body-parser');
var async = require('async');

require('app/db').connect();

var routes = require('./routes')(io);
var port = process.env.PORT || 3000;

app.locals.regionMap = require('app/regions');
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
