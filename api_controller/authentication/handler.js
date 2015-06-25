var express = require('express');
var bodyParser = require('body-parser');
var jwt = require('jsonwebtoken'); 
var config = require('./config');
var mysqlHandler = require('../../models/mysql_main');
var logger = require('../../libs/log');
var utilities = require('../../libs/utilities');
var authUtility = require('./utilities');

/* Check if user/email exist */
var userExistCheckHandler = function(req, res){
  var email = req.body.email,
  	username = req.body.username;

  mysqlHandler.findUser({user_email : email, user_username : username}, 
    function(err, rows) {
      if (err) {
        res.json({ success: false, message: err.code});
      }
      else {
        if (rows.length > 0) {
          res.json({ success: true, exist: true});
        }
        else {
          res.json({ success: true, exist: false});
        }
      }
    });
};

var loginHandler = function(req, res) {
  var email = null, username = null;

  var check_user_exist_callback = function(error, rows){
    var register_obj, hash_password, salt, role, token, user_info;
    if (error) {
      res.json({ success : false, message : error.code,
        captcha_required : false});
      return ;
    }
    else {
      if (rows.length > 0) {
        hash_password = rows[0].user_password;
        salt = rows[0].user_salt;
        if(authUtility.verifyPasswordWithSalt(req.body.password,
          salt, hash_password)){
          logger.infoMsg("VERIFCATION","successfully login");
          user_info = {user_username : rows[0].user_username,
            user_email : rows[0].user_email,
            user_role : rows[0].user_role}
          token = authUtility.generateSignedToken(user_info);
          return res.json({ success : true, x_access_token : token });  
        }
        else {
          logger.infoMsg("VERIFCATION","failed login");
          return res.json({ success : false, message : "ER_WRONG_CRED" }); 
        }
      }
      else {
        res.json({ success: false, message: 'ER_USER_NOT_EXIST'});
        return ;
      }
    }
  };
  
  if (utilities.checkEmail(req.body.accountname)) {
    email = req.body.accountname;
  }
  else {
    username = req.body.accountname;
  }

  mysqlHandler.findUser({
  	user_email : email,
    user_username : username},
    check_user_exist_callback);
};

/* Authenticate a user
 * TODO: use Redis DB to prvent BF attacks (captcha).
 */
var registrationHandler = function (req, res) {
  var check_user_exist_callback = function(error, rows){
    var register_obj, hash_password, salt, role;
    if (error) {
      res.json({ success : false, message : error.code,
        captcha_required : false});
      return ;
    }
    else {
      if (rows.length > 0) {
        res.json({ success: false, message: 'ER_USER_EXIST'});
        return ;
      }
      else {
        role = req.body.role.toLocaleLowerCase();
        if (!authUtility.verifyRole(role)) {
          res.json({ success: false, message: 'ER_BAD_ROLE'});
          return ;
        }
        salt = authUtility.randomToken(64);
        hash_password = authUtility.hashPasswordWithSalt(
          req.body.password, salt);
        register_obj = {
          user_username : req.body.username,
          user_email : req.body.email,
          user_password : hash_password,
          user_salt : salt,
          user_role : role
        };
        mysqlHandler.addUser(register_obj, add_user_callback);
      }
    }
  };

  var add_user_callback = function (error, user_info, insert_id) {
    var token;
    if (error) {
      res.json({ success : false, message : error.code,
        captcha_required : false});
      return ;
    }
    delete user_info['user_salt'];
    delete user_info['user_password'];
    token = authUtility.generateSignedToken(user_info);
    res.json({ success : true, x_access_token : token,
        captcha_required : false});
  };

  if (!req.body.email || !req.body.username || !req.body.password ||
    !req.body.role){
    res.json({ success : false, message : "ER_INCOMPLETE_INFO",
        captcha_required : false});
    return ;
  }
  mysqlHandler.findUser({user_email : req.body.email,
    user_username : req.body.username}, check_user_exist_callback);
};

var authenticationHandler = function(req, res, next) {
  var property, token = req.headers['x-access-token'];
  var callback = function (err, decoded) {
    if (err) {
      logger.infoMsg("VERIFCATION",err.message);
      return res.json({ success: false,
        message: 'ER_BAD_TOKEN' });    
    }
    req.decoded = decoded; 
      for (property in req.decoded ) {
        if (req.decoded.hasOwnProperty(property)){
          logger.infoMsg("AUTHENTICATE","  "+property+":"+req.decoded[property]);
        }
      }
    next();
  };

  if (token) {
    authUtility.verifyToken(token, callback);
  }
  else {
    return res.status(403).send({ 
        success: false, 
        message: 'ER_TOKEN_REQUIRED' 
    });
  }
};

//=================

module.exports = {
	userExistCheckHandler : userExistCheckHandler,
	loginHandler : loginHandler,
	registrationHandler : registrationHandler,
	authenticationHandler : authenticationHandler
};