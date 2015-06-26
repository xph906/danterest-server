var extend = require('extend');
var crypto = require('crypto');
var fs =  require('fs');
var logger = require('./log');
/* Returns the name of an object's string 
 * TODO: this function has BUG!!!
 */
var getObjTypeString = function(obj){
    return Object.prototype.toString.call(obj).slice(8, -1);
}

/* Returns an array of object property */
var getObjectProperty = function (obj) {
	var item, rs_arr = new Array();
	for (item in obj) {
		if (obj.hasOwnProperty(item)) {
			rs_arr.push(item+' : '+ getObjTypeString(item));
			logger.infoMsg("DEBUG","propoerty: "+item+' : '+ getObjTypeString(item));
		}
	}
	return rs_arr;
};

var getObjectPropertySize = function (obj) {
	return getObjectProperty(obj).length;
};

var deepCloneObj = function (dst_obj,src_obj) {
	var newObject = extend(true, dst_obj, src_obj);
	return newObject;
};

var makeError = function (name_text, msg_text, data) {
    var error = new Error();
    error.name = name_text;
    error.code = error.name;
    error.message = msg_text;
    if (data){
        error.data = data;
    }
    return error;
};

var makeTask = function (callback, this_arg, arg_array) {
	return function() {
		//most of the time, this_arg should be set as null
		callback.apply(this_arg,arg_array);
	};
};

var makeTaskWithReqAndResp = 
	function (callback_, req_arg, resp_arg, this_arg) {
		return function () {
			var args = Array.prototype.slice.call(arguments);
			args.unshift(req_arg,resp_arg);
			if (this_arg) { callback_.apply(this_arg,args); }
			else { callback_.apply(null,args); }	
	};
};

var checkEmail = function(emailAddress) {
  var sQtext = '[^\\x0d\\x22\\x5c\\x80-\\xff]';
  var sDtext = '[^\\x0d\\x5b-\\x5d\\x80-\\xff]';
  var sAtom = '[^\\x00-\\x20\\x22\\x28\\x29\\x2c\\x2e\\x3a-\\x3c\\x3e\\x40\\x5b-\\x5d\\x7f-\\xff]+';
  var sQuotedPair = '\\x5c[\\x00-\\x7f]';
  var sDomainLiteral = '\\x5b(' + sDtext + '|' + sQuotedPair + ')*\\x5d';
  var sQuotedString = '\\x22(' + sQtext + '|' + sQuotedPair + ')*\\x22';
  var sDomain_ref = sAtom;
  var sSubDomain = '(' + sDomain_ref + '|' + sDomainLiteral + ')';
  var sWord = '(' + sAtom + '|' + sQuotedString + ')';
  var sDomain = sSubDomain + '(\\x2e' + sSubDomain + ')*';
  var sLocalPart = sWord + '(\\x2e' + sWord + ')*';
  var sAddrSpec = sLocalPart + '\\x40' + sDomain; // complete RFC822 email address spec
  var sValidEmail = '^' + sAddrSpec + '$'; // as whole string

  var reValidEmail = new RegExp(sValidEmail);

  return reValidEmail.test(emailAddress);
};

var hashStringSHA256 = function (string) {
  var shasum = crypto.createHash('sha256');
  //console.log(string+" "+string.length);
  shasum.update(string);
  return shasum.digest('hex');  
}; 

var hashMulStringsWithSHA256 = function() {
  var index, string = "";
  for (index in arguments) {
    string += arguments[index].toString();
  }
  return hashStringSHA256(string);
};

var calcFileChecksum = function (file_path, callback) {
  var stream, hash = crypto.createHash('md5');
  try {
    stream = fs.createReadStream(file_path);
    stream.on('data', function (data) {
      //logger.infoMsg("DEBUG:", data);
      hash.update(data, 'utf8');
    });
    stream.on('end', function() {
      //logger.infoMsg("DEBUG:", "END");
      callback(hash.digest('hex'));
    });
  }
  catch (e) {
    logger.errorMsg("UTIL","failed to calculate checksum of "
      + file_path);
    return null;
  }
};

//calcFileChecksum('/Users/a/Projects/danterest-server/tmp/uploads/b.jpg',
//  function (c){logger.infoMsg("DEBUG", c);});

/*
var callback = function(req, resp, arg1, arg2){
	console.log('req:'+req);
	console.log('resp:'+resp);
	console.log('arg1:'+arg1);
	console.log('arg2:'+arg2);
}
var fun = makeTaskWithReqAndResp(callback,"this is request","this is response");
fun("this is arg1", "this is arg2");

this.a = 333;
var fun1 = function(arg1,arg2){
	getObjectProperty(this);
	console.log("function fun1");
	console.log("this.a = "+this.a);
  	console.log("arg1   = "+arg1);
  	console.log("arg2   = "+arg2);
}
fun1(2,"222");
var arr = [2,"222"];
var task1 = makeTask(fun1,this,arr);
setTimeout(task1, 2);
*/
module.exports = {
	getObjTypeString : getObjTypeString,
	getObjectProperty : getObjectProperty,
	getObjectPropertySize : getObjectPropertySize,
	deepCloneObj : deepCloneObj,
	makeError : makeError,
	makeTask : makeTask,
	makeTaskWithReqAndResp : makeTaskWithReqAndResp,
	checkEmail : checkEmail,
  hashMulStringsWithSHA256 : hashMulStringsWithSHA256,
  calcFileChecksum : calcFileChecksum
};