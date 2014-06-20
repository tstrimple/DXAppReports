var express = require('express');
var apps = require('./routes/');
var region = require('./routes/region');
var ratings = require('./crawler/ratings');
var http = require('http');
var path = require('path');
var app = express();
var debug = require('debug')('appreports');
var mongoose = require('mongoose');

if(!process.env.MONGO_URI) {
	throw 'Must set MONGO_URI environment variable';
}
mongoose.connect(process.env.MONGO_URI);

ratings.processStoreLinks(function() {
  debug('done processing store links. Starting timer');
  setTimeout(ratings.processStoreLinks, 600000);
});

app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', region.list);
app.get('/region/:segment', region.details);
app.post('/add', region.add);
app.get('/update/:storeId', region.update);
app.post('/update/:storeId', region.doUpdate);

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
