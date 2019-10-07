// Setup basic express server
var express = require('express');
var app = express();
var path = require('path');
var server = require('http').createServer(app);
var AWS = require('aws-sdk')
var io = require('socket.io')(server);
var port = process.env.PORT || 3000;
var apigClientFactory = require('aws-api-gateway-client').default;

// Include main.js file
var userData = require('./public/main.js')
// Endpoint URl
// config = {invokeUrl:'https://enugn0o8q6.execute-api.us-east-1.amazonaws.com/Prod/'}

// Initialize SDK for API Gateway
var apigClient = apigClientFactory.newClient();

// var apigClient = apigClientFactory.newClient({
//   accessKey: 'AKIAZRIMZ3RS2R2VHEVF',
//   secretKey: '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',
// });

var apigClient = apigClientFactory.newClient({
  accessKey: 'AKIAZRIMZ3RS2R2VHEVF',
  secretKey: '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',
  apiKey: 'NL1RrzrfXW8PPROZz8KsO52fnxfUMOb94XQzjkgW',
  region: 'us-east-1' 
});

var pathParams = {
  //This is where path request params go. 
  userId: userData.usernum
};
// Template syntax follows url-template https://www.npmjs.com/package/url-template
var pathTemplate = '/users/{userID}/profile' //userData.userInfo;
var method = 'POST';
var additionalParams = {
  //If there are query parameters or headers that need to be sent with the request you can add them here
  headers: {
      param0: '',
      param1: ''
  },
  queryParams: {
      param0: '',
      param1: ''
  }
};
var body = {
  message: userData.userMessage
};

// test user inputs
console.log(userData);



apigClient.invokeApi(pathParams, pathTemplate, method, additionalParams, body)
  .then(function(result){
      //This is where you would put a success callback
  }).catch( function(result){
      //This is where you would put an error callback
  });

server.listen(port, function () {
  console.log('Server listening at port %d', port);
});

// Routing
app.use(express.static(path.join(__dirname, 'public')));

// Chatroom

var numUsers = 0;

io.on('connection', function (socket) {
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
    if (addedUser) return;

    // we store the username in the socket session for this client
    socket.username = username;
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
    if (addedUser) {
      --numUsers;

      // echo globally that this client has left
      socket.broadcast.emit('user left', {
        username: socket.username,
        numUsers: numUsers
      });
    }
  });
  
});
