var path = require('path');
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var debug = require('debug')('appreports');
var bodyParser = require('body-parser');
var async = require('async');
var passport = require('passport');
var session = require('express-session');
var MongoStore = require('connect-mongostore')(session);

require('app/db').connect();

var port = process.env.PORT || 3000;

app.locals.regionMap = require('app/regions');
app.locals.version = require('../package.json').version;
app.use(express.static(path.join(__dirname, 'public')));
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(bodyParser.json());

app.use(session({
  secret: process.env.SESSION_SECRET || 'super secret key',
  resave: false,
  saveUninitialized: true,
  store: new MongoStore(process.env.MONGO_SESSION_URI)
}));

app.use(passport.initialize());
app.use(passport.session());

app.use('/', require('./routes')(io));

server.listen(port, function() {
  debug('Server listening on port ' + port);
});
