var mongoose = require('mongoose'),
    User = mongoose.model("User")
ObjectId = mongoose.Types.ObjectId

exports.createUser = function(req, res, next) {
    console.log(req.body)
    var UserModel = new User(req.body);
    UserModel.save(function(err, User) {
        if (err) {
            res.status(500);
            res.json({
                type: false,
                data: "Error occured: " + err
            })
        } else {
            delete     User.password;
            res.json({
                type: true,
                data: User
            })
        }
    })
}
//  557404f51b90e891543571b6
exports.viewUser = function(req, res) {
    User.findById(new ObjectId(req.params.id), function(err, User) {
        if (err) {
            res.status(500);
            res.json({
                type: false,
                data: "Error occured: " + err
            })
        } else {
            if (User) {
                delete     User.password;
                res.json({
                    type: true,
                    data: User
                })
            } else {
                res.json({
                    type: false,
                    data: "User: " + req.params.id + " not found"
                })
            }
        }
    })
}
exports.login = function(req, res) {
    User.findOne({ "userName": req.body.userName,"password":req.body.password }, function(err, User) {
        if (err) {
            res.status(500);
            res.json({
                type: false,
                data: "Error occured: " + err
            })
        } else {
            if (User) {

                console.log(User);
                delete     User["password"];
                User["password"]=undefined;
                console.log(User);
                res.json({"userName":User.userName,"id":User._id})
            } else {
                res.json({message:"The user name or password provided is incorrect."})
            }
        }
    })
}
exports.updateUser = function(req, res, next) {
    var updatedUserModel = new User(req.body);
    User.findByIdAndUpdate(new ObjectId(req.params.id), updatedUserModel, function(err, User) {
        if (err) {
            res.status(500);
            res.json({
                type: false,
                data: "Error occured: " + err
            })
        } else {
            if (User) {
                res.json({
                    type: true,
                    data: User
                })
            } else {
                res.json({
                    type: false,
                    data: "User: " + req.params.id + " not found"
                })
            }
        }
    })
}

exports.deleteUser = function(req, res, next) {
    User.findByIdAndRemove(new Object(req.params.id), function(err, User) {
        if (err) {
            res.status(500);
            res.json({
                type: false,
                data: "Error occured: " + err
            })
        } else {
            res.json({
                type: true,
                data: "User: " + req.params.id + " deleted successfully"
            })
        }
    })
}
