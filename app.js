var express = require('express');
var apps = require('./routes/app');
var http = require('http');
var path = require('path');
var app = express();
var mongoose = require('mongoose');

if(!process.env.MONGO_URI) {
	throw 'Must set MONGO_URI environment variable';
}
mongoose.connect(process.env.MONGO_URI);

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

app.get('/', apps.list);
app.post('/add', apps.add);
app.get('/sync-regions', apps.syncRegions);
app.get('/sync-ratings', apps.syncRatings);
app.get('/sync/:id', apps.syncSingle);

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
