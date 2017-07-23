//
// This is main file containing code implementing the Express server and functionality for the Express echo bot.
//
'use strict';
const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const path = require('path');
const apiAi = require('apiai');
var messengerButton = "<html><head><title>Facebook Messenger Bot</title></head><body><h1>Facebook Messenger Bot</h1>This is a bot based on Messenger Platform QuickStart. For more details, see their <a href=\"https://developers.facebook.com/docs/messenger-platform/guides/quick-start\">docs</a>.<script src=\"https://button.glitch.me/button.js\" data-style=\"glitch\"></script><div class=\"glitchButton\" style=\"position:fixed;top:20px;right:20px;\"></div></body></html>";

// The rest of the code implements the routes for our Express server.
let app = express();
let nlp = null;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

//account linking webpage
app.get('/account_linking', function(req, res) {
    console.log(req.query)
    res.send("<a href=" + req.query.redirect_uri + "&authorization_code=samplecode>click</a>");
})

// Webhook validation
app.get('/webhook', function(req, res) {
    if (req.query['hub.mode'] === 'subscribe' &&
        req.query['hub.verify_token'] === process.env.VERIFY_TOKEN) {
        console.log("Validating webhook");
        res.status(200).send(req.query['hub.challenge']);
    } else {
        console.error("Failed validation. Make sure the validation tokens match.");
        res.sendStatus(403);
    }
});

// Display the web page
app.get('/', function(req, res) {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.write(messengerButton);
    res.end();
});

// Message processing
app.post('/webhook', function(req, res) {
    var data = req.body;
    console.log("request received: " + req);
    //console.log(req)
    // Make sure this is a page subscription
    if (data.object === 'page') {
        console.log("request received: " + req.body);

        // Iterate over each entry - there may be multiple if batched
        data.entry.forEach(function(entry) {
            var pageID = entry.id;
            var timeOfEvent = entry.time;

            // Iterate over each messaging event
            entry.messaging.forEach(function(event) {
                console.log(event)
                if (event.message && !event.message.is_echo) {
                    receivedMessage(event);
                } else if (event.postback) {
                    console.log("postback received");
                } else if (event.account_linking) {
                    receivedAccountLinking(event);
                } else if (event.optin) {
                    sendTextMessage(event.sender.id, "Thankyou. I will keep you updated with latest products");
                } else {
                    //console.log("Webhook received unknown event: ", event);
                }
            });
        });

        // Assume all went well.
        //
        // You must send back a 200, within 20 seconds, to let us know
        // you've successfully received the callback. Otherwise, the request
        // will time out and we will keep trying to resend.
        res.sendStatus(200);
    } else {
        res.sendStatus(200);
    }
});

function receivedAccountLinking(event) {
    console.log("Account linking event received: ", event.account_linking);
    sendTextMessage(event.sender.id, "Account linked successfully");
}

// Incoming events handling
function receivedMessage(event) {
    var senderID = event.sender.id;
    var recipientID = event.recipient.id;
    var timeOfMessage = event.timestamp;
    var message = event.message;

    console.log("Received message for user %d and page %d at %d with message:",
        senderID, recipientID, timeOfMessage);
    console.log(JSON.stringify(message));

    var messageId = message.mid;

    var messageText = message.text.toLowerCase();
    var messageAttachments = message.attachments;

    if (messageText) {
        // If we receive a text message, check to see if it matches a keyword
        // and send back the template example. Otherwise, just echo the text we received.
        callApiAi(messageText, senderID, function(responseText) {
            console.log("callApiAi response")
            sendTextMessage(senderID, responseText);
        });
    } else if (messageAttachments) {
        sendTextMessage(senderID, "Message with attachment received");
    }
}

//////////////////////////
// Sending helpers
//////////////////////////
function sendTextMessage(recipientId, messageText) {
    var messageData = {
        recipient: {
            id: recipientId
        },
        message: {
            text: messageText
        }
    };

    callSendAPI(messageData);
}

function callSendAPI(messageData) {
    request({
        uri: 'https://graph.facebook.com/v2.8/me/messages',
        qs: { access_token: process.env.PAGE_ACCESS_TOKEN },
        method: 'POST',
        json: messageData

    }, function(error, response, body) {

        if (!error && response.statusCode == 200) {
            var recipientId = body.recipient_id;
            var messageId = body.message_id;

            console.log("Successfully sent generic message with id %s to recipient %s",
                messageId, recipientId);
        } else {
            console.error("--Unable to send message.");
            //console.error(response);
            console.error(body);
            console.log(messageData)
            console.log(response.statusCode)
        }
    });
}

function callApiAi(text, senderId, callback) {
    if (null == nlp) {
        nlp = apiAi(process.env.API_AI_TOKEN, { language: 'en', requestSource: 'ttya-bot' })
    }
    var request = nlp.textRequest(text, { sessionId: senderId });
    request.on('response', function(res) {
        if (res.result) {
            console.log(res.result)
            var responseText = res.result.fulfillment.speech;
            callback(responseText);
        }
    })
    request.on('error', function(err) {
        console.log(err);
        callback('I am afraid I didnt get you')
    })
    request.end()
}

// Set Express to listen out for HTTP requests
var server = app.listen(process.env.PORT || 3000, function() {
    console.log("Listening on port %s", server.address().port);
});