var mongoose = require("mongoose");
var Schema   = mongoose.Schema;

var DealSchema = new Schema({
    dealNumber: Number,
    ticketNumber: String,
    instrument: String,
    counterparty: String,
    entity: String,
    faceValue: Number,
    currency: String,
    otherCurrency: String,
    otherFaceValue: Number,
    spotRate: Number,
    contractRate: Number,
    forwardPoints: Number,
    dealDate: Date,
    startDate: Date,
    maturityDate: Date,
    term: Number
});
mongoose.model('Deal', DealSchema);