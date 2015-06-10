module.exports = {
    "socketIoPort":80,
    "tokenSecret":"super.super.secret.shhh",
    "backend": {
	    "paths": ['login'], //paths to send to backend server
	    "host": 'localhost',
	    "port": '8080',
	    "context": '' //context path of backend server
              	}
};
