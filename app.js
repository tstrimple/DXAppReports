var express = require('express');
var app = express();
var server = http.createServer(app);
var io = require('socket.io')(server);

var routes = require('./routes/')(io);
var ratings = require('./crawler/ratings');
var path = require('path');
var mongoose = require('mongoose');
var bodyParser = require('body-parser');
var async = require('async');

if(!process.env.MONGO_URI) {
	throw 'Must set MONGO_URI environment variable';
}
mongoose.connect(process.env.MONGO_URI);

app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

app.locals.regionMap = require('./data/regions');

app.use('/', routes);

server.listen(app.get('port'), function() {
  console.log('Express server listening on port ' + app.get('port'));
});
