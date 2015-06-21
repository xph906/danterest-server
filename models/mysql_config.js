module.exports = {
  host     : 'localhost',
  user     : 'danterest',
  password : 'ford2207',
  database : 'db',
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
    user1 : 'CREATE TABLE user1 ('+
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
    user2 : 'CREATE TABLE user2 ('+
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
    user3 : 'CREATE TABLE user3 ('+
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
  }
};