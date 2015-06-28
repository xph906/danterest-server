var mysql = require('mysql');
var mysqlConfig = null;
var utilities = require('../libs/utilities'); 
var generalUtil = require('util');
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
//var connection = mysql.createConnection(mysqlConfig);
var pool = mysql.createPool(mysqlConfig);
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

    pool.getConnection(function(err1, connection) {
      if (err1) {
        throw err1;
      }
      //if table doesn't exist, create one
      connection.query(tables[table_name], function (err, result) {
        connection.release();
        if (err) {
          logger.errorMsg('DB','error in creating table '+table_name +
            ' '+ err);
          throw err;
        }
        logger.infoMsg('DB','table '+table_name+" has been created successfully");
        delete not_created_tables[table_name];
      });
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
    pool.getConnection(function(err1, connection) {
      if (err1) {
        throw err1;
      }

      connection.query( mysql.format(sql,values),
        function (err, rows, fields) {
          connection.release();
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
  return mysql.escape(string.replace(/[\'|\"]/g,''));
}

var convertDateFormat = function(y, m, d, h, min) {
  var date = new Date();
  if (y) {
    date = new Date(y, m-1, d, h, min);
  }
  var year = date.getFullYear().toString();
  var month = (date.getMonth()+1).toString();
  if (month.length === 1){
    month = '0' + month;
  }
  var day = date.getDate().toString();
  if (day.length === 1){
    day = '0' + day
  }
  var hour = date.getHours().toString();
  if (hour.length === 1){
    hour = '0' + hour;
  }
  var minute = date.getMinutes().toString();
  if (minute.length === 1) {
    minute = '0' + minute;
  }
  return year+month+day+hour+minute+'00';
};

/* user table */
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
  pool.getConnection(function(err1, connection) {
    if(err1) {
      throw err1;
    }
    connection.query(full_sql, function(err, rows) {
      connection.release();
      callback(err,rows);
    });
  });
};

var updateUserProfileImage = function(user_id, asset_id, callback) {
  var sql = "UPDATE user SET user_profileimg_id = ? "+
    "WHERE user_id = ?;", full_sql;
  full_sql = mysql.format(sql, [asset_id, user_id]);

  logger.infoMsg('DB','updateUserProfileImage: '+full_sql);

  pool.getConnection(function(err, connection) {
    if(err) {
      logger.infoMsg('TODO','updateUserIMG '+full_sql);
      throw err;
    }

    connection.query(full_sql, function (err, result) {
      connection.release();
      if (err) {
        err.sql = full_sql;
        logger.infoMsg('DB_DEBUG',"Failed to update user "+err.code);
        callback(err);
      }
      else{
        logger.infoMsg('DB_DEBUG',"Succeeded to update user profile image");
        callback(null,result.changedRows); 
      }  
    });
  });
};

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

  pool.getConnection(function(err, connection) {
    if(err) {
      logger.infoMsg('TODO','addUser '+full_sql);
      throw err;
    }
  // Use the connection
    connection.query(full_sql, function (err, result) {
      connection.release();
      if (err) {
        err.sql = full_sql;
        logger.infoMsg('DB_DEBUG',"Failed to add user "+err.code);
        callback(err);
      }
      else{
        logger.infoMsg('DB_DEBUG',"Succeeded to add user");
        user_info.user_id = result.insertId;
        callback(null,user_info,result.insertId); 
      }  
    });
  });

  return true;
};

/* asset/assettag tables */
/*  asset_info: {
 *    user_id : int,
 *    type : string,
 *    title : string,
 *    description : optional string,
 *    name : string,
 *    tags : [string],
 *    suffix : string,
 *    hash : string,
 *    container : string
 *  }
 */
var addAsset = function(asset_info, callback, callback_tag ){
  var user_id, type, date, title, description, hash, suffix, index, tags,
    sql_asset = "INSERT INTO asset (asset_owner_id, asset_type, asset_date, "+
      "asset_title, asset_description, asset_hash, asset_suffix, asset_path) "+
      "VALUES (?, ?, ?, ?, ?, ?, ?, ?);", full_sql_asset, path;
  
  user_id = asset_info.user_id;
  type = asset_info.type.toLowerCase();
  if (type !== "image" && type !== "video") {
    logger.errorMsg('DB',"unknown asset type: " + type);
    error = utilities.makeError('ER_UNKNOWN_ASSET_TYPE',
      "unknown asset type: " + type);
    callback(error);
    return;
  }
  
  date = convertDateFormat();
  
  title = mysql.escape(asset_info.title);
  if (title.length >= 128) {
    logger.errorMsg('DB',"title too long: "+ title.length);
    error = utilities.makeError('ER_TITLE_TOO_LONG',
      "title too long: "+ title.length);
    callback(error);
    return;
  }

  description = mysql.escape(asset_info.description);
  if (description.length >= 1024 * 16) { // maxminum: 16KB
    logger.errorMsg('DB',"description too long: "+ description.length);
    error = utilities.makeError('ER_DESC_TOO_LONG',
      "description too long: "+ description.length);
    callback(error);
    return;
  }

  //suffix = asset_info.name.split('.').pop().toLowerCase();
  suffix = asset_info.suffix;
  hash = asset_info.hash;
  path = asset_info.container + '/' + hash + '.' + suffix;

  full_sql_asset = mysql.format(sql_asset, 
    [user_id, type, date, title, description, hash, suffix, path]);

  logger.infoMsg('DB','sql_asset:' + full_sql_asset);

  pool.getConnection(function(err, connection) {
    if(err) {
      logger.infoMsg('TODO','addAsset failed to get connection '+
        full_sql_asset);
      throw err;
    }

    connection.query(full_sql_asset, function (err, result) {
      connection.release();
      if (err) {
        err.sql = full_sql_asset;
        //logger.infoMsg('DB_DEBUG',"Failed to add asset: "+err.code);
        callback(err);
      }
      else{
        //logger.infoMsg('DB',"successfully added asset: "+result.insertId);
        for (index in asset_info.tags) {
          addAssetTag(result.insertId, asset_info.tags[index], callback_tag);
        }
        callback(null, asset_info,result.insertId); 
      }  
    });
  });

  return true;
};

//callback(asset_id, tag, id)
var addAssetTag = function (asset_id, tag, callback) {
  var sql_assettag = "INSERT INTO assettag (assettag_asset_id, assettag_tag) "+
      "VALUES (?, ?);", full_sql_assettag;
  
  full_sql_assettag = mysql.format(sql_assettag, 
    [asset_id, tag]);

  logger.infoMsg('DB','sql_assettag:' + full_sql_assettag);

  pool.getConnection(function(err, connection) {
    if(err) {
      logger.infoMsg('TODO','addAssetTag failed to get connection '+
        full_sql_asset);
      throw err;
    }

    connection.query(full_sql_assettag, function (err, result) {
      connection.release();
      if (err) {
        err.sql = full_sql_assettag;
        logger.infoMsg('DB_DEBUG',"Failed to add asset tag" + 
          err.code+" "+full_sql_assettag);
        if (callback){
          callback(err);
        }
      }
      else{
        //logger.infoMsg('DB_DEBUG',"Succeeded to add asset tag: " +   result.insertId);
        if (callback) {
          callback(null, tag,asset_id,result.insertId); 
        }  
      }  
    });
  });
};

var findAssetWithAssetID = function(asset_id, callback) {
  var full_sql, sql = "SELECT * FROM asset, assettag WHERE "+
    "asset.asset_id = ? AND asset.asset_id = assettag.assettag_asset_id;";
  full_sql = mysql.format(sql, [asset_id]);
  logger.infoMsg('DB','findAssetWithAssetID:' + full_sql);

  pool.getConnection(function(err, connection) {
    if(err) {
      logger.infoMsg('TODO','findAssetWithAssetID failed to get connection '+
        full_sql_asset);
      throw err;
    }

    connection.query(full_sql, function (err, result) {
      connection.release();
      if (err) {
        err.sql = full_sql;
        logger.infoMsg('DB_DEBUG',"Failed to find asset with asset id" +
          err.code);
        callback(err);
      }
      else{
        logger.infoMsg('DB_DEBUG',"Succeeded to find asset with asset id: ");
        logger.infoMsg('DB_DEBUG_RS', generalUtil.inspect(result));
        callback(null,generalUtil.inspect(result)); 
      }  
    });
  });
};

var findAssetWithUserID = function(asset_id, process_row_cb) {
  var full_sql, sql = "SELECT * FROM asset, assettag WHERE "+
    "asset.asset_owner_id = ? AND asset.asset_id = assettag.assettag_asset_id;";
  full_sql = mysql.format(sql, [asset_id]);
  logger.infoMsg('DB','findAssetWithUserID:' + full_sql);

  pool.getConnection(function(err, connection) {
    if(err) {
      logger.infoMsg('TODO','findAssetWithUserID failed to get connection '+
        full_sql_asset);
      throw err;
    }

    var query = connection.query(full_sql);
    var debug_count = 0;
    query
      .on('error', function(err) {
        logger.infoMsg('DB','findAssetWithUserID failed to query '+err+
          full_sql);
        connection.release();})
      .on('fields', function(fields) { })
      .on('result', function(row) {
        connection.pause();
        //logger.infoMsg('STREAM22', processRow);
        process_row_cb(row, function() {
          //logger.infoMsg('findAssetWithUserID', "a row finished processing");
          debug_count++;
          connection.resume();
        });
      })
      .on('end', function() {
        logger.infoMsg("DB","findAssetWithUserID finished querying " + 
          debug_count);
        process_row_cb(null,null);
        connection.release();
      });
  });
};

var findAssetsWithTagName = function(tag_name, process_row_cb) {
  var full_sql, sql = "SELECT * FROM asset, assettag WHERE "+
    "assettag.assettag_tag = ? AND asset.asset_id = assettag.assettag_asset_id;";
  full_sql = mysql.format(sql, [tag_name]);
  logger.infoMsg('DB','findAssetsWithTagName:' + full_sql);

  pool.getConnection(function(err, connection) {
    if(err) {
      logger.infoMsg('TODO','findAssetsWithTagName failed to get connection '+
        full_sql_asset);
      throw err;
    }

    var query = connection.query(full_sql);
    var debug_count = 0;
    query
      .on('error', function(err) {
        logger.infoMsg('DB','findAssetsWithTagName failed to query '+err+
          full_sql);
        connection.release();})
      .on('fields', function(fields) { })
      .on('result', function(row) {
        connection.pause();
        //logger.infoMsg('STREAM22', processRow);
        process_row_cb(row, function() {
          connection.resume();
          debug_count++;
        });
      })
      .on('end', function() {
        logger.infoMsg("DB","findAssetsWithTagName finished querying " + 
          debug_count);
        process_row_cb(null,null);
        connection.release();
      });
  });
};

logger.infoMsg('DB','DB has been connected, preparing tables ...');
utilities.deepCloneObj(tableHandler.not_created_tables,
    mysqlConfig.tables);
tableHandler.not_created_tables.ready = true;
tableHandler.prepare_tables();

module.exports = {
  isDBReady : tableHandler.is_table_ready,
  addUser : addUser,
  updateUserProfileImage : updateUserProfileImage,
  findUser : findUser,
  addAsset : addAsset,
  addAssetTag : addAssetTag,
  findAssetWithAssetID : findAssetWithAssetID,
  findAssetWithUserID : findAssetWithUserID,
  findAssetsWithTagName : findAssetsWithTagName
};


/*Testing code...*/
/*
var asset_info1 = {
  type : "image",
  title : "The Greatest Books of All Time, As Voted by 125 Famous Authors",
  description : "ASDDWDWDWADAS87823PASDDWDWDWADAS87823PASDDWDWDWADAS87823P ",
  name : "imms.png",
  user_id : 1,
  tags : ["c1","c2","c3"],
  md5 : "WDWDDDDDWDWDWDWDWDWDWDWDWDJIJIJIJIJIJIJIJIJIJIJI"
};
var asset_info2 = {
  type : "image",
  title : "Blabla title",
  description : "Blabla Blabla Blabla description",
  name : "second.jpg",
  user_id : 1,
  tags : ["d1","d2","c3","d4"],
  md5 : "IIWMMMDLLSDLLLDDDDDD"
};

var asset_callback = function (req, resp, error, asset_info, id) {
  logger.infoMsg("ASSET_CB", "req  :"+req);
  logger.infoMsg("ASSET_CB", "resp :"+resp);
  logger.infoMsg("ASSET_CB", "asset_info:" + 
    generalUtil.inspect({asset:asset_info}));
  logger.infoMsg("ASSET_CB", "ID :"+id);
};
var assettag_callback = function (req, resp, error,asset_id, tag, id) {

  logger.infoMsg("ASSETTAG_CB", "req  :"+req);
  logger.infoMsg("ASSETTAG_CB", "resp :"+resp);
  logger.infoMsg("ASSETTAG_CB", "assert_id:"+asset_id+" tag:"+tag);
  logger.infoMsg("ASSETTAG_CB", "ID :"+id);
};
var stream_callback = function(req,resp, row, callback) {
  logger.infoMsg("STREAM2","in callback");
  if (row) {
    req.r.push(row);
    logger.infoMsg("STREAM2","row:"+generalUtil.inspect(row));
  }
  else {
    logger.infoMsg("STREAM2","DONE:"+req.r.length);
  }
  if(callback){
    callback();  
  }
};
var asset_cb = utilities.makeTaskWithReqAndResp(asset_callback,
  "this is req","this is resp");
var assettag_cb = utilities.makeTaskWithReqAndResp(assettag_callback,
  "this is req","this is resp");
var stream_cb = utilities.makeTaskWithReqAndResp(stream_callback,{r:[]},null);
addAsset(asset_info1,asset_cb,assettag_cb);
addAsset(asset_info2,asset_cb,assettag_cb);
findAssetWithAssetID(1, asset_cb);
findAssetWithUserID(1,stream_cb);
//findAssetsWithTagName('d1', stream_cb);
*/
/*
Tags = ["c1","c2","c3","c4","c5","c6","c7","d1","d1","d2","d3","d4","d5","d6","d7","d8"];
for (i=0; i< 100; i++) {
  asset_info = {
    type : "image",
    title : Math.random().toString(36).substring(2),
    description : Math.random().toString(36).substring(2),
    name : "imms.png",
    user_id : 1,
    tags : [Tags[Math.floor(Math.random() * Tags.length)],
            Tags[Math.floor(Math.random() * Tags.length)],
            Tags[Math.floor(Math.random() * Tags.length)],
            Tags[Math.floor(Math.random() * Tags.length)]],
    md5 : Math.random().toString(36).substring(2)
  };
  addAsset(asset_info,asset_cb,assettag_cb);
}
*/

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
  
  }
  else {
    logger.infoMsg('DB',"not all tables are ready : ");
    setTimeout(debugFun, 100);
  }
};
setTimeout(debugFun, 100);


//connection.end();