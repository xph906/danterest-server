var mysql = require('mysql');
var mysqlConfig = null;
var utilities = require('../libs/utilities');
var logger = require('../libs/log');
var cloud = process.env.CLOUD;
if (cloud) {
  mysqlConfig = require('./mysql_config_cloud');
  logger.infoMsg("CONFIG","choose cloud DB");
}
else {
  mysqlConfig = require('./mysql_config');
  logger.infoMsg("CONFIG","choose localhost DB");
}
var connection = mysql.createConnection(mysqlConfig);
var tables = mysqlConfig.tables;

/*Check and prepare all the tables*/
var tableHandler = (function () {
  var not_created_tables = { ready : false },
    prepare_tables, is_db_ready,
    check_if_table_exists,
    table_exists_callback, table_not_exists_callback;

  //Check if all the tables in `mysqlConfig.tables` 
  //are created. not_created_tables will be set by 
  //`connection.connect`
  is_table_ready = function () {
    return not_created_tables.ready && 
      utilities.getObjectPropertySize(not_created_tables) === 1; 
  };

  //Callback function for check_if_table_exists
  //Update `not_created_tables` 
  table_exists_callback = function (table_name){
    logger.infoMsg('DB',"table "+table_name+" exists");
    delete not_created_tables[table_name];
  };

  //Callback function for check_if_table_exists
  //1. Create table
  //2. Update `not_created_tables` 
  table_not_exists_callback = function (table_name){
    logger.infoMsg('DB',"table "+table_name+" doesn't exist");
    //if table doesn't exist, create one
    connection.query(tables[table_name], function (err, result) {
      if (err) {
        logger.errorMsg('DB','error in creating table '+table_name +
          ' '+ err);
        throw err;
      }
      
      logger.infoMsg('DB','table '+table_name+" has been created successfully");
      delete not_created_tables[table_name];
    });
  };

  check_if_table_exists = function (table_name, 
                    exist_callback, not_exist_callback) {
    var result, 
      values = [mysqlConfig.database, table_name],
      sql = "SELECT COUNT(*) AS result " + 
        "FROM information_schema.tables " +
        "WHERE table_schema = ? " + 
        "AND table_name = ?;";
    //logger.infoMsg("SQL_DEBUG",mysql.format(sql,values));

    connection.query( mysql.format(sql,values),
      function (err, rows, fields) {
        if (err) {
          logger.errorMsg('DB','error in check_if_table_exists : '+ err);
          throw err ;
        }
        if (rows.length > 0 ) {
          result = parseInt(rows[0].result);
          if (result > 0){
            exist_callback(table_name);
          }
          else {
            not_exist_callback(table_name);
          }
        }
        else {
          logger.errorMsg('DB','error in check_if_table_exists : zero returns '+
            sql);
          throw utilities.makeError("DB Error",'error in checking table '
            +table_name+ " zero returned row");
        }
      });
  };

  //Call `check_if_table_exists` for each table in `tables`
  prepare_tables = function () {
    var table;
    if (! not_created_tables.ready){
      throw utilities.makeError("DB Error",
        "not_created_tables has not been initialized");
    }
    for (table in tables) {
      check_if_table_exists(table,
        table_exists_callback,table_not_exists_callback);
    }
  };
    
  return {
    not_created_tables : not_created_tables,
    prepare_tables : prepare_tables,
    is_table_ready : is_table_ready
  };

})();

/*Escape user inputs*/
var escape = function (string) {
  return connection.escape(string.replace(/[\'|\"]/g,''));
}

/*Connect DB and prepare all the tables*/
connection.connect( function(err) {
  if (err) {
    logger.errorMsg('DB','error connecting: ' + err.stack);
    throw utilities.makeError("DB Error", "error connecting DB");
  }
  
  logger.infoMsg('DB','DB has been connected, preparing tables ...');
  utilities.deepCloneObj(tableHandler.not_created_tables,
    mysqlConfig.tables);
  tableHandler.not_created_tables.ready = true;
  //logger.infoMsg('DB_DEBUG',tableHandler.not_created_tables);
  tableHandler.prepare_tables();
});

var findUser = function(user_info, callback) {
  var email = null, username = null, error = null,
    sql, full_sql;
  if (user_info.user_email) {
    email = escape(user_info.user_email);
  }
  else if (user_info.user_username) {
    username = escape(user_info.user_username);
  }
  else {
    logger.errorMsg('DB','no email or username');
    error = utilities.makeError('ER_NO_EMAIL_NAME',
      'either email or username has to exist');
    callback(error);
    return ;
  }

  if (email) {
    sql = "SELECT * FROM user where "+
      "user_email = ?;";
    full_sql = mysql.format(sql,[email]);
  }
  else {
    sql = "SELECT * FROM user where "+
      "user_username = ?;";
    full_sql = mysql.format(sql,[username]);
  }
  logger.errorMsg('DB',full_sql);
  connection.query(full_sql, callback);
}

var addUser = function(user_info, callback ){
  var email, username, insert_id, full_sql, error,
    sql = "INSERT INTO user (user_password, user_salt, user_email, "+
      "user_username, user_role) VALUES (?, ?, ?, ?, ?);";

  if (user_info.user_password.length > 64) {
    logger.errorMsg('DB',"userpassword too long: "+
      user_info.user_password.length);
    error = utilities.makeError('ER_PASSWD_TOO_LONG',
      'user_password is too long '+user_info.user_password.length);
    callback(error);
    return;
  }

  if (user_info.user_salt.length > 64) {
    logger.errorMsg('DB',"user_salt too long: "+
      user_info.user_salt.length);
    error = utilities.makeError('ER_SALT_TOO_LONG',
      'user_salt is too long '+user_info.user_salt.length);
    callback(error);
    return;
  }

  email = escape(user_info.user_email);
  if (email.length > 32) {
    logger.errorMsg('DB',"email too long: "+
      email.length);
    error = utilities.makeError('ER_EMAIL_TOO_LONG',
      'user_email is too long '+email.length);
    callback(error);
    return;
  }

  username = escape(user_info.user_username);
  if (username.length > 32) {
    logger.errorMsg('DB',"username too long: "+
      username.length);
    error = utilities.makeError('ER_NAME_TOO_LONG',
      'user_name is too long '+username.length);
    callback(error);
    return;
  }

  full_sql = mysql.format(sql, 
    [user_info.user_password, user_info.user_salt, email, username,
      user_info.user_role]);

  logger.infoMsg('DB','22 '+full_sql);
  connection.query(full_sql, function (err, result) {
    if (err) {
      err.sql = full_sql;
      logger.infoMsg('DB_DEBUG',"Failed to add user "+err.code);
      callback(err);
    }
    else{
      logger.infoMsg('DB_DEBUG',"Succeeded to add user");
      callback(null,user_info,result.insertId); 
    }  
  });

  return true;
};

module.exports = {
  isDBReady : tableHandler.is_table_ready,
  addUser : addUser,
  findUser : findUser
};


/*Testing code...*/
var user_nick = {
  user_password : "ASDDWDWDWADAS87823P",
  user_salt : "SDIIIIWPSDJ0000233232323",
  user_email : "xiang'pan@gmail.com",
  user_username : "xiang ' pan"
};

var succ_callback = function(req, resp, user, row_id){
  logger.infoMsg('SUCC_DEBUG_DB','req:'+req);
  logger.infoMsg('SUCC_DEBUG_DB','resp:'+resp);
  logger.infoMsg('SUCC_DEBUG_DB','name:'+user.user_username);
  logger.infoMsg('SUCC_DEBUG_DB','row_id:'+row_id);
}

var fail_callback = function(req, resp, user,error){
  logger.infoMsg('FAIL_DEBUG_DB','req:'+req);
  logger.infoMsg('FAIL_DEBUG_DB','resp:'+resp);
  logger.infoMsg('FAIL_DEBUG_DB','error_code:'+error.code);
}

var new_callback = function(req, resp, error, user, row_id){
  logger.infoMsg('DEBUG_DB','req:'+req);
  logger.infoMsg('DEBUG_DB','resp:'+resp);
  if (error) {
    logger.infoMsg('DEBUG_DB',"failed to create user "+error.code);
    return ;
  }
  else {
    logger.infoMsg('DEBUG_DB',"succeeded to create user " + 
      user.username+" "+row_id);
    return ;
  }
}

var callback = function (req, resp, error, rows, fields) {
  logger.infoMsg('CB_DEBUG_DB','req:'+req);
  logger.infoMsg('CB_DEBUG_DB','resp:'+resp);
  if (error) {
    logger.infoMsg('CB_DEBUG_DB','error finding user:'+error.code);
    return ;
  }

  if (rows.length > 0) {
    logger.infoMsg('CB_DEBUG_DB','Found user ' + rows[0].user_username + 
      " " + rows[0].user_email + 
      " " + rows[0].user_password + 
      " " + rows[0].user_salt);
  }
  else {
    logger.infoMsg('CB_DEBUG_DB','Failed to find user ');
  }
}

var succ_fun = utilities.makeTaskWithReqAndResp(succ_callback,
  {a:1,b:2},{c:3,d:4});
var fail_fun = utilities.makeTaskWithReqAndResp(fail_callback,
  "this is request","this is response");
var new_fun = utilities.makeTaskWithReqAndResp(new_callback,
  "AAA this is request","BBB this is response");
var fun = utilities.makeTaskWithReqAndResp(callback,
   "this is request","this is response");

var debugFun = function() {
  if (tableHandler.is_table_ready()){
    logger.infoMsg('DB',"all tables are ready");
    //addUser(user_nick,new_fun);
    //findUser({user_email:'xiangpan@gmail.com'}, fun);
    //findUser({}, fun);
    //findUser({user_username:'xi1angpan@gmail.com'}, fun);
    //findUser({user_username:'xiang  pan'}, fun);
  }
  else {
    logger.infoMsg('DB',"not all tables are ready : ");
    setTimeout(debugFun, 100);
  }
};
setTimeout(debugFun, 100);


//connection.end();