var extend = require('extend');
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
			console.log("propoerty: "+item+' : '+ getObjTypeString(item));
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
	function (callback, req_arg, resp_arg, this_arg) {
		return function () {
			var args = Array.prototype.slice.call(arguments);
			args.unshift(req_arg,resp_arg);
			if (this_arg) { callback.apply(this_arg,args); }
			else { callback.apply(null,args); }	
	};
};
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
	makeTaskWithReqAndResp : makeTaskWithReqAndResp
};