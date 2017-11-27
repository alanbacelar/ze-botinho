const axios = require('axios');
const express = require('express');
const router = express.Router();

const Conversation = require('watson-developer-cloud/conversation/v1'); // watson sdk

const WORKSPACE_ID = process.env.WORKSPACE_ID;

const VERIFY_FB_TOKEN = process.env.VERIFY_FB_TOKEN;
const FB_TOKEN = process.env.FB_TOKEN;

var CONTEXT = undefined;

const conversation = new Conversation({
    username: process.env.CONVERSATION_USERNAME,
    password: process.env.CONVERSATION_PASSWORD,
    version_date: '2017-05-26'
});

router.get('/', function(req, res, next) {
    res.json({name: 'Zé Botinho'});
});

router.get('/webhook', function (req, res) {
    let mode = req.query['hub.mode'];
    let token = req.query['hub.verify_token'];
    let challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_FB_TOKEN) {
            res.status(200).send(challenge);
        } else {
          res.sendStatus(403);
        }
    } else {
        res.sendStatus(401);
    }
});


router.post('/webhook', function (req, res) {
    const messaging_entry = req.body.entry[0].messaging;

    console.log('[FB:WEBHOOK]', messaging_entry);

    for (let i = 0; i < messaging_entry.length; i++) {
        let text = "";

        const messaging = messaging_entry[i];
        const sender = messaging.sender;
        const recipient = messaging.recipient;

        if (messaging.message && messaging.message.text) {
            text = messaging.message.text;
        } else if (messaging.postback && !text) {
            text = messaging.postback.payload;
        } else {
            res.sendStatus(200);
            return;
        }

        callWatson(text, sender, function(result, error) {
            if (error) {
                console.log('[FB:WEBHOOK:callWatson] ERRO: ', error, text);
            }

            res.json(result);
        });
    }
});


router.post('/message', function(req, res) {
    if (!WORKSPACE_ID) {
        return res.json({
            'output': {
                'text': 'The app has not been configured with a <b>WORKSPACE_ID</b> environment variable. Please refer to the ' + '<a href="https://github.com/watson-developer-cloud/conversation-simple">README</a> documentation on how to set this variable. <br>' + 'Once a workspace has been defined the intents may be imported from ' + '<a href="https://github.com/watson-developer-cloud/conversation-simple/blob/master/training/car_workspace.json">here</a> in order to get a working application.'
            }
        });
    }

    // Send the input to the conversation service
    callWatson(req.body.text, null, function(result, error) {
        if (error) {
            console.log('[message:callWatson] ERRO: ', error);
            res.json(error);
        } else {
            res.json(result);
        }
    });
});


function callWatson(text, sender, callback) {
    const payload = {
        workspace_id: WORKSPACE_ID,
        context: CONTEXT,
        input: { text: text }
    };

    conversation.message(payload, function (err, conversation_result) {
        if (err) {
            callback(null, err);
            return;
        }

        const intents = conversation_result.intents[0] || {};
        const intent = intents.intent;

        if (intent === 'whoami') {
            getUserInfo(sender.id).then(function(response) {
                const user = response.data;

                sendMessage(sender, 'Vocé é o ' + user.first_name + ', meu brother!').then(function() {
                    callback(conversation_result);
                });
            });

            return;
        }

        if (conversation_result.context != null) {
            CONTEXT = conversation_result.context;
        }

        if (conversation_result != null && conversation_result.output != null) {
            const promises = [];

            conversation_result.output.text.forEach(function(answer) {
                promises.push(sendMessage(sender, answer));
            });

            Promise.all(promises).then(function() {
                callback(conversation_result);
            }).catch(function(error) {
                callback(null, error);
            });
        }
    });
}

function getUserInfo(id) {
    return axios({
        method: 'get',
        url: 'https://graph.facebook.com/v2.6/' + id,
        params: { access_token: FB_TOKEN }
    });
};

function sendMessage(sender, text) {
    const data = {
        recipient: sender,
        message: { text: text.substring(0, 319) }
    };

    console.log('[sendMessage]', text);

    return axios({
        method: 'post',
        url: 'https://graph.facebook.com/v2.6/me/messages',
        params: { access_token: FB_TOKEN },
        data: data
    });

    // request({
    //     url: 'https://graph.facebook.com/v2.6/me/messages',
    //     qs: { access_token: FB_TOKEN },
    //     method: 'POST',
    //     json: json_data
    // }, function (error, response, body) {
    //     if (error) {
    //         error.json_data = json_data;
    //         console.log('[sendMessage] Error sending message: ', error);
    //     } else if (response.body.error) {
    //         console.log('[sendMessage] Error: ', {error: response.body.error, json_data: json_data});
    //     }
    // });
};


module.exports = router;
