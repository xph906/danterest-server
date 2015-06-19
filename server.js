
/* Get the packages we need */
var express = require('express');
var bodyParser = require('body-parser');
var morgan = require('morgan');
var apiRouters = require('./apiRoutes');

/* Get server configure */
var config = require('./config');

/* Get Mongo server
 * TODO: change server to MySQL
 */
var mongoose  = require('mongoose');
var mongo_user_handler = require('./models/mongo-user');
mongoose.connect(config.database);

/* Configure Node Server */
var app = express();
var port = config.listen_port;
app.set('superSecret', config.secret);
app.disable('etag');

/* Add middlewares */
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(morgan('dev'));

/* Routes */
app.get('/', function(req, res) {
    res.send('Hello! The API is at http://localhost:' + port + '/api');
});

app.get('/setup',mongo_user_handler.createAndSaveRandomUserHandler);

app.use('/api',apiRouters);

/* Start the server */

app.use('/api', require('cors')());
app.listen(port);
console.log("Listen localhost:"+port);


