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
var azure = require('azure-storage');


var apiRoutes = express.Router();
apiRoutes.use(bodyParser.json());

/*******TEST**********/
var formImage = "<!DOCTYPE HTML><html><body>" +
"<form method='post' action='/api/v1/uploads' enctype='multipart/form-data'><br>" +
"<input type='file' name='image'/><br>" +
"<input type='text' name='description' value='this is performed by Myself, Haha!'/><br>" +
"<input type='text' name='title' value='this is title'/><br>" +
"<input type='text' name='tags' value='classical,pop,rap'/><br>" +
"<input type='hidden' name='secret' value='we have some secrets'/><br>" +
"<input type='submit' /></form><br>" +
"</body></html>";
var formProfileImage = "<!DOCTYPE HTML><html><body>" +
"<form method='post' action='/api/v1/profile-img-uploads' enctype='multipart/form-data'><br>" +
"<input type='file' name='image'/><br>" +
"<input type='text' name='description' value='this is performed by Myself, Haha!'/><br>" +
"<input type='text' name='title' value='this is title'/><br>" +
"<input type='text' name='tags' value='classical,pop,rap'/><br>" +
"<input type='hidden' name='secret' value='we have some secrets'/><br>" +
"<input type='submit' /></form><br>" +
"</body></html>";
var uploadsPath = "/v1/uploads/";
var uploadsStorePath = path.join(__base,'tmp','uploads');

/* Testing web interface */
apiRoutes.get(uploadsPath, function (req, res){
  res.writeHead(200, {'Content-Type': 'text/html' });
  res.end(formImage);  
});
apiRoutes.get('/v1/profile-img-uploads', function (req, res){
  res.writeHead(200, {'Content-Type': 'text/html' });
  res.end(formProfileImage);  
});

/* Image processing handler 

 * 3. generate file md5
 * 4. create container on Azure storage
 * 5. store image to Azure storage
 * 6. add info to database
 * 7. delete temporary file
 * 8. generate shared url for image
 */
//var imageURLFetchHandler = function (){

//};

var imageUploadHandler = function (image_info,
    user_id, username, resp_callback) {
  var blobSvc = azure.createBlobService();
  var generate_access_url = function (container, file_name) {
    var start_date = new Date();
    var expiry_date = new Date(start_date);
    expiry_date.setMinutes(start_date.getMinutes() + 100);
    start_date.setMinutes(start_date.getMinutes() - 100);
    var shared_access_policy = {
      AccessPolicy: {
        Permissions: azure.BlobUtilities.SharedAccessPermissions.READ,
        Start: start_date,
        Expiry: expiry_date
      },
    };
    var blob_sas = blobSvc.generateSharedAccessSignature(
      container, file_name,shared_access_policy);
    var url = container + '/' + file_name +'?' + blob_sas;
    var host = blobSvc.host;
    logger.infoMsg("IMAGE_DEBUG",util.inspect({host:host}));
    image_info.url = host.primaryHost+url;
    image_info.second_host = host.secondaryHost;
    //resp.json(image_info);
    resp_callback(null, image_info);
  };

  /* store checksum to image_info.md5 and call next function */
  var file_checksum_cb = function (checksum) {
    logger.infoMsg("IMAGE_DEBUG","file checksum: " + checksum);
    //image_info.md5 = checksum;
    image_info.type = "image";
    image_info.suffix = image_info.name.split('.').pop().toLowerCase();
    image_info.hash = utilities.hashMulStringsWithSHA256(
      checksum, user_id.toString());
    image_info.storage_name = image_info.hash + '.' + image_info.suffix;
    image_info.container = "containername"+username.substring(0,50);
    blobSvc.createContainerIfNotExists(image_info.container, container_create_cb);
  };

  /* if succeed, create blob*/
  var container_create_cb = function(error, result, response){
    if (error) {
      logger.errorMsg("IMAGE","failed to create container: "+error);
      //resp.json({ success: false, message: 'ER_FAIL_STORE_IMAGE'}); 
      resp_callback(error, { success: false, message: 'ER_FAIL_STORE_IMAGE'}); 
      return ;
    }
    logger.infoMsg("IMAGE","successfully create container");
    blobSvc.createBlockBlobFromLocalFile(image_info.container,
      image_info.storage_name,image_info.path,
      file_blob_create_cb);
  };

  var file_blob_create_cb =  function(error, result, response){
    if (error) {
      logger.errorMsg("IMAGE","failed to create blob: "+error);
      //resp.json({ success: false, message: 'ER_FAIL_STORE_IMAGE'}); 
      resp_callback(error, 
        { success: false, message: 'ER_FAIL_STORE_IMAGE'}); 
      return ;
    }
    if (!response.isSuccessful){
      //resp.json({ success: false, message: 'ER_FAIL_STORE_IMAGE'}); 
      resp_callback(new Error("ER_FAIL_STORE_IMAGE"), 
        { success: false, message: 'ER_FAIL_STORE_IMAGE'});
      return ;
    }
    logger.infoMsg("IMAGE", "successfully create file blob");
    image_info.user_id = user_id;
    mysqlHandler.addAsset(image_info, asset_callback, assettag_callback );
  };

  var asset_callback = function (error, asset_info, asset_id) {
    if (error) {
      logger.errorMsg("IMAGE","failed to insert asset item: "+error);
      //resp.json({ success: false, message: 'ER_FAIL_UPDATE_ASSET_DB'}); 
      resp_callback(error,
        { success: false, message: 'ER_FAIL_UPDATE_ASSET_DB'}); 
      return ;
    }
    logger.infoMsg("IMAGE","successfully insert asset item with ID: "+asset_id);
    var file_name = image_info.hash+'.'+image_info.suffix;
    image_info.id = asset_id;
    generate_access_url(image_info.container, file_name);
  };

  var remaining_tag_count = image_info.tags.length;
  var assettag_callback = function (error, tag, assetid) {
    if (error) {
      logger.errorMsg("IMAGE","failed to insert assettag: "+error);
      //resp.json({ success: false, message: 'ER_FAIL_UPDATE_ASSETTAG_DB'}); 
      resp_callback(error, 
        { success: false, message: 'ER_FAIL_UPDATE_ASSETTAG_DB'}); 
      return ;
    }
    remaining_tag_count--;
    logger.infoMsg("IMAGE","successfully insert assettag: " + 
      tag +" for asset: "+assetid);
    if (remaining_tag_count === 0){ 
      logger.infoMsg("IMAGE","successfully insert ALL assettags for asset: "+
        assetid);
    }
  };
  utilities.calcFileChecksum(image_info.path, file_checksum_cb);
};

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

apiRoutes.post('/v1/profile-img-uploads', function(req, res) {
  var form = new formidable.IncomingForm();
  form.parse(req, function(err, fields, files) {
    //logger.infoMsg("PARSE:"+files.image.name+" "+files.image.path);
    try{
      var image_info = {
        success : true,
        name : files.image.name,
        path : files.image.path,
        title : fields.title,
        description : fields.description,
        tags : fields.tags.split(',')
      };
      imageUploadHandler( image_info,req.decoded.user_id,
        req.decoded.user_username,
        function (error, resp_obj) {
          if (error) {
            logger.errorMsg("PROFILE-IMAGE",
              "failed to upload profile image " +
              error.code);
            res.json({ success: false, message: error.code });
            return ;
          }
          //update user table
          mysqlHandler.updateUserProfileImage(
            req.decoded.user_id, resp_obj.id,
            function (error, changed_rows){
              if (error){
                logger.errorMsg("PROFILE-IMAGE",
                  "failed to upload profile image " +
                  error.code);
                res.json({ success: false, message: error.code });
                return ;
              }
              else if(changed_rows !== 1) {
                logger.errorMsg("PROFILE-IMAGE",
                  "multiple rows changed: " + changed_rows);
                res.json({ success: false, message: "changed rows error"});
                return ;
              }
              res.json(image_info);
            });
        });
    }
    catch (e) {
      logger.errorMsg("IMAGE","failed to parse form: "+e);
      res.json({ success: false,
        message: 'ER_BAD_FORMAT' }); 
    }
  });
});

apiRoutes.post('/v1/uploads', function(req, res) {
  var form = new formidable.IncomingForm();
  form.parse(req, function(err, fields, files) {
    //logger.infoMsg("PARSE:"+files.image.name+" "+files.image.path);
    try{
      var image_info = {
        success : true,
        name : files.image.name,
        path : files.image.path,
        title : fields.title,
        description : fields.description,
        tags : fields.tags.split(',')
      };
      imageUploadHandler( image_info,req.decoded.user_id,
        req.decoded.user_username,
        function (error, resp_obj) {
          if (error) {
            logger.errorMsg("IMAGE", "failed to upload image "+error.code);
            res.json({ success: false, message: error.code });
            return ;
          }
          res.json(resp_obj);
        });
    }
    catch (e) {
      logger.errorMsg("IMAGE","failed to parse form: "+e);
      res.json({ success: false,
        message: 'ER_BAD_FORMAT' }); 
    }
  });
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
