var mongoose = require('mongoose'),
    fs       = require('fs'),
    url = require("url"),
    Deal = mongoose.model("Deal"),
    ObjectId = mongoose.Types.ObjectId

//added by steven.xu
exports.downloadApp = function (req, res, next) {
        var file = './server/hawk.apk';
        res.setHeader('Content-disposition', 'attachment; filename= hawk.apk');
        res.setHeader('Content-type', 'application/vnd.android.package-archive');
        var filestream = fs.createReadStream(file);
        filestream.pipe(res);
}

//added by steven.xu
exports.createDeal = function (req, res, next) {
    var dealModel = new Deal(req.body);
    dealModel.save(function (err, deal) {
        if (err) {
            res.status(500);
            res.json({
                type: false,
                data: "Error occured: " + err
            })
        } else {
            res.json({
                type: true,
                data: deal
            })
        }
    })
}

//added by steven.xu
exports.viewDeal = function (req, res, next) {
    Deal.findById(new ObjectId(req.params.id), function (err, deal) {
        if (err) {
            res.status(500);
            res.json({
                type: false,
                data: "Error occured: " + err
            })
        } else {
            if (deal) {
                res.json({
                    type: true,
                    data: deal
                })
            } else {
                res.json({
                    type: false,
                    data: "Deal: " + req.params.id + " not found"
                })
            }
        }
    })
}
//added by steven.xu
exports.viewDeals = function (req, res, next) {
    Deal.find(function (err, deal) {
        if (err) {
            res.status(500);
            res.json({
                type: false,
                data: "Error occured: " + err
            })
        } else {
            if (deal) {
                res.json({
                    type: true,
                    data: deal
                })
            } else {
                res.json({
                    type: false,
                    data: "Deal: " + req.params.id + " not found"
                })
            }
        }
    })
}

//added by steven.xu
exports.updateDeal = function (req, res, next) {
    var updatedDealModel = new Deal(req.body);
    Deal.findByIdAndUpdate(new ObjectId(req.params.id), updatedDealModel, function (err, deal) {
        if (err) {
            res.status(500);
            res.json({
                type: false,
                data: "Error occured: " + err
            })
        } else {
            if (deal) {
                res.json({
                    type: true,
                    data: deal
                })
            } else {
                res.json({
                    type: false,
                    data: "Deal: " + req.params.id + " not found"
                })
            }
        }
    })
}
//added by steven.xu
exports.deleteDeal = function (req, res, next) {
    Deal.findByIdAndRemove(new Object(req.params.id), function (err, deal) {
        if (err) {
            res.status(500);
            res.json({
                type: false,
                data: "Error occured: " + err
            })
        } else {
            res.json({
                type: true,
                data: "Deal: " + req.params.id + " deleted successfully"
            })
        }
    })
}


exports.list = function (req, res) {
    Deal.find(function (err, deals) {
        if (err) {
            res.status(500);
            res.json({
                type: false,
                data: "Error occured: " + err
            })
        } else {
            if (deals) {
                var result =
                {
                    data: [], "views": null,
                    "gridViewOptions":
                    {
                        "styleDictionary": [],
                        "sortOptions": [], "rowFilters": [],
                        "columnFilters": [], "pivotFilters": [],
                        "page": 1, "pageSize": 20, "totalPages": 95,
                        "totalItems": deals.length, "pageFrom": 0,
                        "pageTo": 0, "columns": null, "view": "All",
                        "drillDownLevel": 0, "searchText": null,
                        "searchTerms": [], "searchKeyColumnOnly": false,
                        "searchColumnName": ""
                    }
                };
                for (var i = 0; i < deals.length ; i++) {
                    result.data.push(
                        {
                            dealNumber: deals[i].dealNumber,
                            dealscparty: deals[i].counterparty,
                            dealscurmatdt: deals[i].maturityDate,
                            dealsdealer: deals[i].dealer,
                            dealsentity: deals[i].entity,
                            dealssectype: deals[i].instrument
                        }
                    );
                }
                res.json(result)
            } else {
                res.json({
                    type: false,
                    data: "Comment: " + req.params.id + " not found"
                })
            }
        }
    })
}

exports.edit = function (req, res) {
    var params = url.parse(req.url, true).query;
    Deal.findOne({ "dealNumber": params.dealNumber }, function (err, deals) {
        if (err) {
            res.status(500);
            res.json({
                type: false,
                data: "Error occured: " + err
            })
        } else {
            if (deals) {
                var result = { data: deals };
                res.json(result)
            } else {
                res.json({
                    type: false,
                    data: "Comment: " + req.params.id + " not found"
                })
            }
        }
    })
}


exports.save = function(req, res) {
    var result={"data":{},"lookups":{},"message":"Deal 175 has been saved.","messageType":0,"activityId":null,"messageLinks":{}};
    res.json(result);
}


exports.getNonBusinessDays = function (req, res) {
    Deal.find(function (err, deals) {
        if (err) {
            res.status(500);
            res.json({
                type: false,
                data: "Error occured: " + err
            })
        } else {
            if (deals) {
                var result = ["2007-04-06T00:00:00+08:00", "2007-07-04T00:00:00+08:00", "2007-12-15T00:00:00+08:00", "2007-01-06T00:00:00+08:00", "2007-01-07T00:00:00+08:00", "2007-01-13T00:00:00+08:00", "2007-01-14T00:00:00+08:00", "2007-01-20T00:00:00+08:00", "2007-01-21T00:00:00+08:00", "2007-01-27T00:00:00+08:00", "2007-01-28T00:00:00+08:00", "2007-02-03T00:00:00+08:00", "2007-02-04T00:00:00+08:00", "2007-02-10T00:00:00+08:00", "2007-02-11T00:00:00+08:00", "2007-02-17T00:00:00+08:00", "2007-02-18T00:00:00+08:00", "2007-02-24T00:00:00+08:00", "2007-02-25T00:00:00+08:00", "2007-03-03T00:00:00+08:00", "2007-03-04T00:00:00+08:00", "2007-03-10T00:00:00+08:00", "2007-03-11T00:00:00+08:00", "2007-03-17T00:00:00+08:00", "2007-03-18T00:00:00+08:00", "2007-03-24T00:00:00+08:00", "2007-03-25T00:00:00+08:00", "2007-03-31T00:00:00+08:00", "2007-04-01T00:00:00+08:00", "2007-04-07T00:00:00+08:00", "2007-04-08T00:00:00+08:00", "2007-04-14T00:00:00+08:00", "2007-04-15T00:00:00+08:00", "2007-04-21T00:00:00+08:00", "2007-04-22T00:00:00+08:00", "2007-04-28T00:00:00+08:00", "2007-04-29T00:00:00+08:00", "2007-05-05T00:00:00+08:00", "2007-05-06T00:00:00+08:00", "2007-05-12T00:00:00+08:00", "2007-05-13T00:00:00+08:00", "2007-05-19T00:00:00+08:00", "2007-05-20T00:00:00+08:00", "2007-05-26T00:00:00+08:00", "2007-05-27T00:00:00+08:00", "2007-06-02T00:00:00+08:00", "2007-06-03T00:00:00+08:00", "2007-06-09T00:00:00+08:00", "2007-06-10T00:00:00+08:00", "2007-06-16T00:00:00+08:00", "2007-06-17T00:00:00+08:00", "2007-06-23T00:00:00+08:00", "2007-06-24T00:00:00+08:00", "2007-06-30T00:00:00+08:00", "2007-07-01T00:00:00+08:00", "2007-07-07T00:00:00+08:00", "2007-07-08T00:00:00+08:00", "2007-07-14T00:00:00+08:00", "2007-07-15T00:00:00+08:00", "2007-07-21T00:00:00+08:00", "2007-07-22T00:00:00+08:00", "2007-07-28T00:00:00+08:00", "2007-07-29T00:00:00+08:00", "2007-08-04T00:00:00+08:00", "2007-08-05T00:00:00+08:00", "2007-08-11T00:00:00+08:00", "2007-08-12T00:00:00+08:00", "2007-08-18T00:00:00+08:00", "2007-08-19T00:00:00+08:00", "2007-08-25T00:00:00+08:00", "2007-08-26T00:00:00+08:00", "2007-09-01T00:00:00+08:00", "2007-09-02T00:00:00+08:00", "2007-09-08T00:00:00+08:00", "2007-09-09T00:00:00+08:00", "2007-09-15T00:00:00+08:00", "2007-09-16T00:00:00+08:00", "2007-09-22T00:00:00+08:00", "2007-09-23T00:00:00+08:00", "2007-09-29T00:00:00+08:00", "2007-09-30T00:00:00+08:00", "2007-10-06T00:00:00+08:00", "2007-10-07T00:00:00+08:00", "2007-10-13T00:00:00+08:00", "2007-10-14T00:00:00+08:00", "2007-10-20T00:00:00+08:00", "2007-10-21T00:00:00+08:00", "2007-10-27T00:00:00+08:00", "2007-10-28T00:00:00+08:00", "2007-11-03T00:00:00+08:00", "2007-11-04T00:00:00+08:00", "2007-11-10T00:00:00+08:00", "2007-11-11T00:00:00+08:00", "2007-11-17T00:00:00+08:00", "2007-11-18T00:00:00+08:00", "2007-11-24T00:00:00+08:00", "2007-11-25T00:00:00+08:00", "2007-12-01T00:00:00+08:00", "2007-12-02T00:00:00+08:00", "2007-12-08T00:00:00+08:00", "2007-12-09T00:00:00+08:00", "2007-12-16T00:00:00+08:00", "2007-12-22T00:00:00+08:00", "2007-12-23T00:00:00+08:00", "2007-12-29T00:00:00+08:00", "2007-12-30T00:00:00+08:00"];

                res.json(result)
            } else {
                res.json({
                    type: false,
                    data: "Comment: " + req.params.id + " not found"
                })
            }
        }
    })
}
