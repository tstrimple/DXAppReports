var express = require('express');
var region = require('./routes/region');
var ratings = require('./crawler/ratings');
var http = require('http');
var path = require('path');
var app = express();
var debug = require('debug')('appreports');
var mongoose = require('mongoose');
var bodyParser = require('body-parser');

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
app.use(bodyParser.urlencoded())
app.use(bodyParser.json())
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', region.list);
app.get('/region/:segment', region.details);
app.post('/add', region.add);
app.get('/update/:storeId', region.update);
app.post('/update/:storeId', region.doUpdate);

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
