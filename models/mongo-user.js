// get an instance of mongoose and mongoose.Schema
var mongoose = require('mongoose');
var Schema = mongoose.Schema;

// set up a mongoose model and pass it using module.exports
var MongoUser = mongoose.model('User', new Schema({ 
    name: String, 
    password: String, 
    admin: Boolean 
}));

var createAndSaveRandomUserHandler = function (req, resp) {
  var nick = new MongoUser({
    name: 'Nick',
    password: 'password',
    admin: true
  });
  
  nick.save(function (err) {
    if (err) {
      throw err;
    }
    console.log("User saved successfully");
    resp.json({ success : true });
  });
};


module.exports = {
  createAndSaveRandomUserHandler : createAndSaveRandomUserHandler,
  MongoUser : MongoUser
};

