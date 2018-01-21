'use strict';

var express = require('express');
var app = express();
var fs = require('fs');
var https = require('https');
var http = require('http');
var bodyParser = require('body-parser');

app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({ extended: true })); // support encoded bodies


var options = {
   key  : fs.readFileSync('/etc/letsencrypt/live/myexperiments.work/privkey.pem'),
   cert : fs.readFileSync('/etc/letsencrypt/live/myexperiments.work/fullchain.pem'),
   ca : fs.readFileSync('/etc/letsencrypt/live/myexperiments.work/chain.pem')
};

var port = 8080;

app.get('/', function (req, res) {
   console.log('got get request');
   res.send('Hello World!');
});


// Game elements
var colors = [];

app.get('/colors/clear', function(req, res) {
   console.log('clear colors');
   res.send('clear done');
});

app.get('/colors/get', function(req, res) {
   console.log('existing colors: ');
   console.log(colors);
   res.send('existing colors: '+colors);
});

app.get('/colors/add', function (req, res) {
   var k = req.query.key;
   console.log('Adding key: '+k);
   colors.push(k);
   res.send('key added');
});

app.post('/colors/voice', function (req, res) {
  console.log('got voice POST request');
  //console.log(req);
  processV2Request(req, res);
});

https.createServer(options, app).listen(port, function () {
   console.log('Started listening on port: '+port);
});


var askCount=0;

function processV2Request (request, response) {
  // An action is a string used to identify what needs to be done in fulfillment
  let action = (request.body.queryResult.action) ? request.body.queryResult.action : 'default';
  // Parameters are any entites that Dialogflow has extracted from the request.
  let parameters = request.body.queryResult.parameters || {}; // https://dialogflow.com/docs/actions-and-parameters
  // Contexts are objects used to track and store conversation state
  let inputContexts = request.body.queryResult.contexts; // https://dialogflow.com/docs/contexts
  // Get the request source (Google Assistant, Slack, API, etc)
  let requestSource = (request.body.originalDetectIntentRequest) ? request.body.originalDetectIntentRequest.source : undefined;
  // Get the session ID to differentiate calls from different users
  let session = (request.body.session) ? request.body.session : undefined;
  // Create handlers for Dialogflow actions as well as a 'default' handler
  const actionHandlers = {
    // The default welcome intent has been matched, welcome the user (https://dialogflow.com/docs/events#default_welcome_intent)
    'input.welcome': () => {
      sendResponse('Hello, Welcome to my Dialogflow agent!'); // Send simple response to user
    },
    // The default fallback intent has been matched, try to recover (https://dialogflow.com/docs/intents#fallback_intents)
    'input.unknown': () => {
      // Use the Actions on Google lib to respond to Google requests; for other requests use JSON
      sendResponse('I\'m having trouble, can you try that again?'); // Send simple response to user
    },
    'test': () => {
      sendResponse('Hi '+parameters.paramName);  
    },
    'input.ip': () => {

      console.log("getting http://httpbin.org/ip...");
      http.get('http://httpbin.org/ip', (resp) => {
        let data = '';
 
        // A chunk of data has been recieved.
        resp.on('data', (chunk) => {
          data += chunk;
        });
 
        // The whole response has been received. Print out the result.
        resp.on('end', () => {
          sendResponse('My I.P. is: '+JSON.parse(data).origin);
        });
 
      }).on("error", (err) => {
	console.log('Error while getting ip');
      });

    },
    'input.count': () => {
      if (askCount==0) {
        sendResponse('This is the first time you ask me.');
      }
      else if (askCount==1) {
        sendResponse('This is the second time you ask me.');
      }
      else {
        sendResponse('You\'ve already asked me '+askCount+' times.');
      }
      askCount++;
    },
    // Default handler for unknown or undefined actions
    'default': () => {
      let responseToUser = {
        //fulfillmentMessages: richResponsesV2, // Optional, uncomment to enable
        //outputContexts: [{ 'name': `${session}/contexts/weather`, 'lifespanCount': 2, 'parameters': {'city': 'Rome'} }], // Optional, uncomment to enable
        fulfillmentText: 'This is from Dialogflow\'s Cloud Functions for Firebase editor! :-)' // displayed response
     };
      sendResponse(responseToUser);
    }
  };
  // If undefined or unknown action use the default handler
  if (!actionHandlers[action]) {
    action = 'default';
  }
  // Run the proper handler function to handle the request from Dialogflow
  actionHandlers[action]();
  // Function to send correctly formatted responses to Dialogflow which are then sent to the user
  function sendResponse (responseToUser) {
    // if the response is a string send it as a response to the user
    if (typeof responseToUser === 'string') {
      let responseJson = {fulfillmentText: responseToUser}; // displayed response
      response.json(responseJson); // Send response to Dialogflow
    } else {
      // If the response to the user includes rich responses or contexts send them to Dialogflow
      let responseJson = {};
      // Define the text response
      responseJson.fulfillmentText = responseToUser.fulfillmentText;
      // Optional: add rich messages for integrations (https://dialogflow.com/docs/rich-messages)
      if (responseToUser.fulfillmentMessages) {
        responseJson.fulfillmentMessages = responseToUser.fulfillmentMessages;
      }
      // Optional: add contexts (https://dialogflow.com/docs/contexts)
      if (responseToUser.outputContexts) {
        responseJson.outputContexts = responseToUser.outputContexts;
      }
      // Send the response to Dialogflow
      console.log('Response to Dialogflow: ' + JSON.stringify(responseJson));
      response.json(responseJson);
    }
  }
}

