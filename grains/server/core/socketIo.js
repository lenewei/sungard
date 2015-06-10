var restify  = require('restify'),
    socketio = require('socket.io'),
    fs       = require('fs'),
    configuration = require('../configuration.js')

 controllers = {},
     controllers_path = process.cwd() + '/server/controllers';
fs.readdirSync(controllers_path).forEach(function (file) {
    if (file.indexOf('.js') != -1) {
        controllers[file.split('.')[0]] = require(controllers_path + '/' + file)
    }
})

var server = restify.createServer();
var io = socketio.listen(server);

//customer restify header
var restifyHeader = function (req, res, next) {
    // CORS headers
    res.header("Access-Control-Allow-Origin", "*"); // restrict it to the required domain
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    // Set custom headers for CORS
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
//    res.header('Access-Control-Allow-Headers', 'Content-type,Accept,X-Access-Token,X-Key');
    if (req.method == 'OPTIONS') {
        res.status(200).end();
    } else {
        next();
    }
}
server.use(restifyHeader);
server.use(restify.CORS());

server
    .use(restify.fullResponse())
    .use(restify.bodyParser())

///\/\w+\/\w+/
server.get("/hawk/android", restify.serveStatic({
    directory: './server',
    default: 'hawk.apk'
}));

server.get("/hawk/ios", restify.serveStatic({
    directory: './server',
    default: 'hawk.apk'
}));

server.get("/", restify.serveStatic({
    directory: './server/quantum',
    default: 'index.html'
}));


server.get(/\./, function indexHTML(req, res, next) {
    fs.readFile(  './server/quantum'+req.url, function (err, data) {
        if (err) {
            next(err);
            return;
        }
       // res.setHeader('Content-Type', 'text/html');
        res.writeHead(200);
        res.end(data);
        next();
    });
});

server.post("/account/login", controllers.user.login)
server.post("/account/createUser", controllers.user.createUser)

server.get("/dealing/fx/edit", controllers.deal.edit)
server.get("/dealing/fx/list", controllers.deal.list)
server.get("/dealing/fx/GetNonBusinessDays", controllers.deal.getNonBusinessDays)

// Article Start
server.post("/fx/deal", controllers.deal.createDeal)
server.put("/fx/deal/:id", controllers.deal.updateDeal)
server.del("/fx/deal/:id", controllers.deal.deleteDeal)
server.get("/fx/deal/", controllers.deal.viewDeals)
server.get({path: "/fx/deal/:id"}, controllers.deal.viewDeal)


//server.put("/account/user/:id", controllers.user.updateUser)
//server.del("/account/:id", controllers.user.deleteUser)
//server.get("/account/user/:id", controllers.user.viewUser)

// Chatroom
// usernames which are currently connected to the chat
var usernames = {};
var numUsers = 0;

io.sockets.on('connection', function (socket) {
    socket.emit('news', { hello: 'world' });
    socket.on('my other event', function (data) {
        console.log(data);
    });

    //copy form socket.io demo chat
    var addedUser = false;
    // when the client emits 'new message', this listens and executes
    socket.on('new message', function (data) {
        // we tell the client to execute 'new message'
        socket.broadcast.emit('new message', {
            username: socket.username,
            message: data
        });
    });

    // when the client emits 'add user', this listens and executes
    socket.on('add user', function (username) {
        // we store the username in the socket session for this client
        socket.username = username;
        // add the client's username to the global list
        usernames[username] = username;
        ++numUsers;
        addedUser = true;
        socket.emit('login', {
            numUsers: numUsers
        });
        // echo globally (all clients) that a person has connected
        socket.broadcast.emit('user joined', {
            username: socket.username,
            numUsers: numUsers
        });
    });

    // when the client emits 'typing', we broadcast it to others
    socket.on('typing', function () {
        socket.broadcast.emit('typing', {
            username: socket.username
        });
    });

    // when the client emits 'stop typing', we broadcast it to others
    socket.on('stop typing', function () {
        socket.broadcast.emit('stop typing', {
            username: socket.username
        });
    });

    // when the user disconnects.. perform this
    socket.on('disconnect', function () {
        // remove the username from global usernames list
        if (addedUser) {
            delete usernames[socket.username];
            --numUsers;

            // echo globally that this client has left
            socket.broadcast.emit('user left', {
                username: socket.username,
                numUsers: numUsers
            });
        }
    });

});

server.listen(configuration.socketIoPort, function () {
    console.log('server listening at %s', server.url);
});
