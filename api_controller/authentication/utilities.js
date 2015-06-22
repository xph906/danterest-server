/* Authentication Utilities */

var crypto = require('crypto');
var jwt = require('jsonwebtoken'); 
var config = require('./config');
var randomToken = require('random-token');

var hashStringSHA256 = function (string) {
	var shasum = crypto.createHash('sha256');
	console.log(string+" "+string.length);
	shasum.update(string);
	return shasum.digest('hex');	
}; 

var hashPasswordWithSalt = function(password, salt) {
	return hashStringSHA256(password + salt);
};

var verifyPasswordWithSalt = function(password, salt, hash) {
	return hashPasswordWithSalt(password, salt) === hash;
};

var verifyRole = function(role) {
	return role === "teacher" || role === "student" ||
		role === "studio" || role === "teacher-student";
};

var generateSignedToken = function (user_info) {
	var token = jwt.sign(user_info, config.secret, {
          expiresInMinutes: config.token_expiration,
          issuer : 'danterest'
        });
	return token;
};

var verifyToken = function (token, callback) {
	jwt.verify(token, config.secret,
		{issuer : 'danterest'}, callback);
};

module.exports = {
	hashStringSHA256 : hashStringSHA256,
	randomToken : randomToken,
	verifyPasswordWithSalt : verifyPasswordWithSalt,
	verifyRole : verifyRole,
	generateSignedToken : generateSignedToken,
	hashPasswordWithSalt : hashPasswordWithSalt,
	verifyToken : verifyToken
};

/*
var rs = hashStringSHA256("SDJISDJIDJIWWWOOQWJFIJIFJIFJIFJIEFJSDJISDJIDJIWWWOOQWJFIJIFJIFJIFJIEFJSDJISDJIDJIWWWOOQWJFIJIFJIFJIFJIEFJSDJISDJIDJIWWWOOQWJFIJIFJIFJIFJIEFJ");
var password = "123456";
var salt = randomToken(64);
var hash = hashPasswordWithSalt(password, salt);
console.log(hash);
console.log(verifyPasswordWithSalt(password,salt,hash+2));
*/


