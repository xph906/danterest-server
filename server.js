
/* Get the packages we need */
var express = require('express');
var bodyParser = require('body-parser');
var morgan = require('morgan');
var apiRoutes = require('./api_controller/api_routes');
var logger = require('./libs/log');

/* Get server configure */
var config = require('./config');
global.__base = __dirname + '/';

/* Get Mongo server
	var mongoose  = require('mongoose');
	var mongo_user_handler = require('./models/mongo-user');
	mongoose.connect(config.database);
 */

/* Configure Node Server */
var app = express();
var port = config.listen_port;

/* Add utility middlewares */
app.use(morgan('dev'));
app.use('/logs', logger.scribe.webPanel());

/* Web Testpage Routes */
app.get('/', function(req, res) {
    res.send('Hello! The API is at http://localhost:' + port + '/api');
});
//app.get('/setup',mongo_user_handler.createAndSaveRandomUserHandler);

/* API router middleware */
app.use('/api', require('cors')());
app.use('/api',apiRoutes);

/* Start the server */
app.listen(port);
logger.infoMsg("MAIN", "Listen to localhost:"+port);

