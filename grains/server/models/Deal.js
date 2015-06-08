var mongoose = require("mongoose");
var Schema   = mongoose.Schema;

var DealSchema = new Schema({
    text: String,
    author: String
});
mongoose.model('Deal', DealSchema);