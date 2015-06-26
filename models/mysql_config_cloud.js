module.exports = {
  host     : 'ap-cdbr-azure-east-c.cloudapp.net',
  user     : 'b551230d8d6636',
  password : '26d78265',
  database : 'DanterestMySQLDB',
  supportBigNumbers : true,
  tables  : {
    user : 'CREATE TABLE user ('+
      '  user_id INT NOT NULL AUTO_INCREMENT,'+
      '  user_password CHAR(64) NOT NULL,'+
      '  user_salt CHAR(64) NOT NULL,'+
      '  user_email CHAR(64) UNIQUE NOT NULL,'+
      '  user_username CHAR(32) UNIQUE NOT NULL,'+
      '  user_realname CHAR(32) CHARACTER SET utf8 COLLATE utf8_unicode_ci,'+
      '  user_role CHAR(8) NOT NULL,'+
      '  user_level TINYINT DEFAULT 1,'+
      '  user_birthdate DATE,'+
      '  user_gender CHAR(1),'+
      '  user_phone CHAR(16),'+
      '  PRIMARY KEY (user_id)'+
      ');',
    asset : 'CREATE TABLE asset ('+
      '  asset_id INT NOT NULL AUTO_INCREMENT,'+
      '  asset_owner_id INT NOT NULL,'+
      '  asset_type CHAR(8) NOT NULL,'+
      '  asset_date DATE NOT NULL,'+
      '  asset_title VARCHAR(128) NOT NULL,'+
      '  asset_description TEXT,'+
      '  asset_hash CHAR(64) NOT NULL UNIQUE,'+
      '  asset_suffix CHAR(8) NOT NULL,'+
      '  PRIMARY KEY (asset_id),'+
      '  INDEX (asset_owner_id),'+
      '  INDEX (asset_date)'+
      ');',
    assettag : 'CREATE TABLE assettag ('+
      '  assettag_id INT NOT NULL AUTO_INCREMENT,'+
      '  assettag_asset_id INT NOT NULL,'+
      '  assettag_tag CHAR(16) NOT NULL,'+
      '  PRIMARY KEY (assettag_id),'+
      '  INDEX (assettag_asset_id),'+
      '  INDEX (assettag_tag)'+
      ');'
  }
};