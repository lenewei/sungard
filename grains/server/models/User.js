var mongoose = require("mongoose");
var Schema   = mongoose.Schema;

var UserSchema = new Schema({
    email: String,
    password: String,
    userName:String
});
mongoose.model('User', UserSchema);