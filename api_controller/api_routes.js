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
var formidable = require('formidable');
var fs = require('fs-extra');
var util = require('util');
var path = require('path');

var apiRoutes = express.Router();
apiRoutes.use(bodyParser.json());

/*******TEST**********/
var form = "<!DOCTYPE HTML><html><body>" +
"<form method='post' action='/api/v0/uploads' enctype='multipart/form-data'>" +
"<input type='file' name='image'/>" +
"<input type='text' name='description' value='this is performed by Myself, Haha!'/>" +
"<input type='text' name='tag' value='classical'/>" +
"<input type='text' name='tag' value='pop'/>" +
"<input type='text' name='tag' value='rap'/>" +
"<input type='hidden' name='secret' value='we have some secrets'/>" +
"<input type='submit' /></form>" +
"</body></html>";
var uploadsPath = "/v0/uploads/";
var uploadsStorePath = path.join(__base,'tmp','uploads');

apiRoutes.get(uploadsPath, function (req, res){
  res.writeHead(200, {'Content-Type': 'text/html' });
  res.end(form);  
});

apiRoutes.post(uploadsPath, function(req, res) {
  var form = new formidable.IncomingForm();

  form.parse(req, function(err, fields, files) {
    //logger.infoMsg("PARSE:"+files.image.name+" "+files.image.path);

    res.writeHead(200, {'content-type': 'text/plain'});
    res.write('received upload:\n\n');
    res.end(util.inspect({fields: fields, files: files}));
    var new_path = path.join(uploadsStorePath,file_name);
    fs.copy(temp_path, new_path, function(err) {  
      if (err) {
        logger.errorMsg("copy error:",err);
      } else {
        logger.infoMsg("end","success!")
      }
    });

  });

  form.on('field', function(name, value) {
    logger.infoMsg("FIELD",name+" "+value);
  });

  form.on('fileBegin', function(name, file) {
    logger.infoMsg("FILEBEGIN",name+" "+file.size);
  });

  form.on('file', function(name, file) {
    logger.infoMsg("FILE",name+" "+file.size);
  });

  form.on('end', function() {
    /* Temporary location of our uploaded file */
   
    logger.infoMsg("FILEEND"+this.openedFiles.length);
    var temp_path = this.openedFiles[0].path;
    var file_name = this.openedFiles[0].name;
    
    logger.infoMsg("end","form is stored at: "+temp_path+
      " with name: "+file_name);    
    logger.infoMsg("PATH:",new_location);
    var new_path = path.join(uploadsStorePath,file_name);
    fs.copy(temp_path, new_path, function(err) {  
      if (err) {
        logger.errorMsg("copy error:",err);
      } else {
        logger.infoMsg("end","success!")
      }
    });
  });

});

apiRoutes.get('/uploads/fullsize/:file', function (req, res){
  file = req.params.file;
  var img = fs.readFileSync(__dirname + "/uploads/fullsize/" + file);
  res.writeHead(200, {'Content-Type': 'image/jpg' });
  res.end(img, 'binary');

});
/*******END***********/

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
  return res.json({
    username : req.decoded.user_username, 
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
