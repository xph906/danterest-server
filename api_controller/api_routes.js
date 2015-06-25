/* API Authenticate Routers */

var express = require('express');
var bodyParser = require('body-parser');
var jwt = require('jsonwebtoken'); 
var config = require('./authentication/config');
var mysqlHandler = require('../models/mysql_main');
var logger = require('../libs/log');
var utilities = require('../libs/utilities');
var authUtility = require('./authentication/utilities');
var authHandler = require('./authentication/handler.js');

var apiRoutes = express.Router();
apiRoutes.use(bodyParser.json());

apiRoutes.post('/v1/user-exist-check', function(req, res){
  authHandler.userExistCheckHandler(req, res);
});

apiRoutes.post('/v1/login', function(req, res) {
  authHandler.loginHandler(req, res);
});

apiRoutes.post('/v1/registration', function(req, res) {
  authHandler.registrationHandler(req, res);
});

/* Add middleware to authenticate user 
 * The rest of routes are only accessible to authorized user */
apiRoutes.use(function(req, res, next) {
  authHandler.authenticationHandler(req,res,next);
});

apiRoutes.all('/v1/testing', function(req, res) {
  logger.infoMsg("VERIFCATION","pass authentication");
  return res.json({ username : req.decoded.user_username, 
      email : req.decoded.user_email});
});

 /*
// route middleware to verify a token
apiRoutes.use(function(req, res, next) {
  // check header or url parameters or post parameters for token
  var property, token = req.body.token || 
              req.query.token || 
              req.headers['x-access-token'];

  // decode token
  if (token) {
    // verifies secret and checks exp
    jwt.verify(token, config.secret, function(err, decoded) {      
      if (err) {
        return res.json({ success: false, message: 'Failed to authenticate token.' });    
      }
      else {
        // if everything is good, save to request for use in other routes
        req.decoded = decoded; 
        for (property in req.decoded ) {
          if (req.decoded.hasOwnProperty(property)){
            console.log("  "+property+":"+req.decoded[property]);
          }
        }
        next();
      }
    });
  }
  else {
    return res.status(403).send({ 
        success: false, 
        message: 'No token provided.' 
    });
  }
});



// route to show a random message (GET http://localhost:8080/api/)
apiRoutes.get('/', function(req, res) {
  res.json({ message: 'Welcome to the coolest API on earth!' });
});

// route to return all users (GET http://localhost:8080/api/users)
apiRoutes.get('/users', function(req, res) {
  mongo_user_handler.MongoUser.find({}, function(err, users) {
    res.json(users);
  });
});
*/
module.exports = apiRoutes;
