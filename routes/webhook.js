const express = require('express');
const router = express.Router();

router.get('/webhook/', function (req, res) {
    if (req.query['hub.verify_token'] === 'tokenDeVerificacaoFacebook') {
        res.send(req.query['hub.challenge']);
    }
    res.send('Erro de validação no token.');
});


router.post('/webhook/', function (req, res) {
    var text = null;

    messaging_events = req.body.entry[0].messaging;

    for (i = 0; i < messaging_events.length; i++) {
        event = req.body.entry[0].messaging[i];
        sender = event.sender.id;

        if (event.message && event.message.text) {
            text = event.message.text;
        }else if (event.postback && !text) {
            text = event.postback.payload;
        }else{
            break;
        }

        var params = {
            input: text,
            context: {"conversation_id": conversation_id}
        }

        var payload = {
            workspace_id: workspace
        };

        if (params) {
            if (params.input) {
                params.input = params.input.replace("\n","");
                payload.input = { "text": params.input };
            }
            if (params.context) {
                payload.context = params.context;
            }
        }
        callWatson(payload, sender);
    }
    res.sendStatus(200);
});


module.exports = router;
