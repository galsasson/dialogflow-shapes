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
var colors = ['red','blue','red'];

var clearColors = function()
{
   console.log('Clearing colors');
   colors = [];
}

app.get('/colors/clear', function(req, res) {
   console.log('clear colors');
   clearColors();
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

app.use('/colors/sounds', express.static('html'));

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
	clearColors();
	let r = {
	  fulfillmentText: 'Hi there. To start the game lets say together Memo Rainbow.',
	  outputContexts: [{'name': `${session}/contexts/new_game`, 'lifespanCount': 10, 'parameters':{}}]
	};
        sendResponse(r);
        
      //sendResponse('Hello, Welcome to my Dialogflow agent!'); // Send simple response to user
    },
    'colors.clear': () => {
        clearColors();
	let r = {
	  fulfillmentText: 'Hi there. To start the game lets say together Memo Rainbow.',
	  outputContexts: [{'name': `${session}/contexts/new_game`, 'lifespanCount': 10, 'parameters':{}}]
	};
        sendResponse(r);
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
    'input.check_p2': () => {
	checkColors(2,parameters);
    },
    'input.check_p1': () => {
        checkColors(1,parameters);
    },
    // Default handler for unknown or undefined actions
    'default': () => {
      let responseToUser = {
        //fulfillmentMessages: richResponsesV2, // Optional, uncomment to enable
        //outputContexts: [{ 'name': `${session}/contexts/weather`, 'lifespanCount': 2, 'parameters': {'city': 'Rome'} }], // Optional, uncomment to enable
        fulfillmentText: 'This is from Dialogflow\'s Cloud Functions for Firebase editor! :-)' // displayed response
     };
      sendResponse(responseToUser);
    },
    'test.sound': () => {
      let responseToUser = {
        fulfillmentMessages: richResponsesV2
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

  function checkColors(player, parameters)
  {
      console.log(parameters);
      var voiceColors = parameters['button-type'];
      var otherPlayer=2;
      if (player==2) {
        otherPlayer=1;
      }
      if (voiceColors.length > colors.length) {
	    let r = {
		fulfillmentText: 'You said too many colors, please say only '+colors.length+'.',
		outputContexts: [{'name': `${session}/contexts/insert_color_player_`+otherPlayer, 'lifespanCount': 10, 'parameters':{}}]
	    };
            sendResponse(r);
      }
      else if (voiceColors.length < colors.length) {
	    let r = {
		fulfillmentText: 'You didn\'t say enough colors, Please say '+colors.length+' colors.',
		outputContexts: [{'name': `${session}/contexts/insert_color_player_`+otherPlayer, 'lifespanCount': 10, 'parameters':{}}]
	    };
            sendResponse(r);
      }
      else {
         var equals=true;
         for (var i=0; i<colors.length; i++) {
             if (colors[i] != voiceColors[i]) {
                equals=false;
             }
         }

         if (equals) {
	    clearColors();
	    let r = {
		fulfillmentText: '<speak><audio src="https://myexperiments.work:8080/colors/sounds/tada.mp3"></audio>Awesome, you got it! Give each other a high five and say: "Memo Finish".</speak>',
		outputContexts: [{'name': `${session}/contexts/right_response_`+otherPlayer, 'lifespanCount': 10, 'parameters':{}},
                                 {'name': `${session}/contexts/insert_color_player_`+otherPlayer, 'lifespanCount': 0, 'parameters':{}}]
	    };
            sendResponse(r);
         }
         else {
	    let r = {
		fulfillmentText: 'I\'m sorry, that was not right, player '+player+' try again.',
		outputContexts: [{'name': `${session}/contexts/insert_color_player_`+otherPlayer, 'lifespanCount': 10, 'parameters':{}}]
	    };
            sendResponse(r);
         }
      }
  }
}


const richResponsesV2 = [
  {
    'platform': 'ACTIONS_ON_GOOGLE',
    'simple_responses': {
      'simple_responses': [
        {
          //'text_to_speech': 'Spoken simple response',
          'ssml': '<speak>hahahaha<break time="3s"/>hahahaha<audio src="https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg">a digital watch alarm</audio></speak>',
          'display_text': 'Displayed simple response'
        }
      ]
    }
  }
];

