var mysql = require('mysql');
var mysqlConfig = require('./mysql_config');
var utilities = require('../utilities');
var logger = require('../log');
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

var addUser = function(user_info, succ_callback_with_req_resp,
    fail_callback_with_req_resp){
  var email, username, insert_id, full_sql,
    sql = "INSERT INTO user (user_password, user_salt, user_email, "+
      "user_username) VALUES (?, ?, ?, ?);";

  if (user_info.user_password.length > 64) {
    logger.errorMsg('DB',"userpassword too long: "+
      user_info.user_password.length);
    return false;
  }
  if (user_info.user_salt.length > 64) {
    logger.errorMsg('DB',"user_salt too long: "+
      user_info.user_salt.length);
    return false;
  }
  email = escape(user_info.user_email);
  if (email.length > 32) {
    logger.errorMsg('DB',"email too long: "+
      email.length);
    return false;
  }
  username = escape(user_info.user_username);
  if (username.length > 32) {
    logger.errorMsg('DB',"username too long: "+
      username.length);
    return false;
  }
   logger.infoMsg('DB','11 '+email+"  "+user_info.user_password);
  full_sql = mysql.format(sql, 
    [user_info.user_password, user_info.user_salt, email, username]);

  logger.infoMsg('DB','22 '+full_sql);
  connection.query(full_sql, function (err, result) {
    if (err) {
      err.sql = full_sql;
      logger.infoMsg('DB_DEBUG',"Failed to add user "+err.code);
      
      if (fail_callback_with_req_resp) {
        fail_callback_with_req_resp(user_info,err);
      } 
    }
    else{
      logger.infoMsg('DB_DEBUG',"Succeeded to add user");
      if (succ_callback_with_req_resp) {
        succ_callback_with_req_resp(user_info,result.insertId);
      }  
    }  
  });

  return true;
};

module.exports = {
  isDBReady : tableHandler.is_table_ready,
  addUser : addUser
};

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

var succ_fun = utilities.makeTaskWithReqAndResp(succ_callback,
  {a:1,b:2},{c:3,d:4});
var fail_fun = utilities.makeTaskWithReqAndResp(fail_callback,
  "this is request","this is response");

var debugFun = function() {
  if (tableHandler.is_table_ready()){
    logger.infoMsg('DB',"all tables are ready");
    addUser(user_nick,succ_fun,fail_fun);
  }
  else {
    logger.infoMsg('DB',"not all tables are ready : ");
    setTimeout(debugFun, 100);
  }
};
setTimeout(debugFun, 100);


//connection.end();