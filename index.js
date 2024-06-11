const express = require("express");
const body_parser = require("body-parser");
const axios = require("axios");
require('dotenv').config();

const app = express().use(body_parser.json());

const token = process.env.TOKEN;
const mytoken = process.env.MYTOKEN; // prasath_token

const userStates = {}; // To track user state

app.listen(process.env.PORT, () => {
    console.log("webhook is listening");
});

// To verify the callback URL from the dashboard side - cloud API side
app.get("/webhook", (req, res) => {
    let mode = req.query["hub.mode"];
    let challenge = req.query["hub.challenge"];
    let token = req.query["hub.verify_token"];

    if (mode && token) {
        if (mode === "subscribe" && token === mytoken) {
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    }
});

app.post("/webhook", (req, res) => {
    let body_param = req.body;

    console.log(JSON.stringify(body_param, null, 2));

    if (body_param.object) {
        console.log("inside body param");
        if (body_param.entry && 
            body_param.entry[0].changes && 
            body_param.entry[0].changes[0].value.messages && 
            body_param.entry[0].changes[0].value.messages[0]) {
            
            let phon_no_id = body_param.entry[0].changes[0].value.metadata.phone_number_id;
            let from = body_param.entry[0].changes[0].value.messages[0].from;
            let msg_body = body_param.entry[0].changes[0].value.messages[0].text.body.toLowerCase();

            console.log("phone number " + phon_no_id);
            console.log("from " + from);
            console.log("body param " + msg_body);

            let responseMessage;

            if (!userStates[from]) {
                userStates[from] = {};
            }

            // Condition 1: Responding to "hi"
            if (msg_body === "merhaba") {
                responseMessage = "Merhaba, ben YumChatbot bugün size nasıl yardımcı olabilirim?";
                userStates[from] = {}; // Reset state
            } 
            // Condition 2: Handling the name flow
            else if (msg_body === "isim" || userStates[from].awaitingName) {
                if (!userStates[from].awaitingName) {
                    responseMessage = "Adınız nedir?";
                    userStates[from].awaitingName = true;
                } else if (!userStates[from].name) {
                    userStates[from].name = msg_body;
                    responseMessage = "Soyadınız nedir?";
                } else {
                    userStates[from].surname = msg_body;
                    responseMessage = `Teşekkürler, ${userStates[from].name} ${userStates[from].surname}! Kayıt işleminiz gerçekleşmiştir!`;
                    userStates[from] = {}; // Reset state
                }
            } else {
                responseMessage = "Üzgünüm sizi anlayamadım. Tekrar eder misiniz?";
            }

            axios({
                method: "POST",
                url: "https://graph.facebook.com/v13.0/" + phon_no_id + "/messages?access_token=" + token,
                                        data: {
                          "messaging_product": "whatsapp",
                          "recipient_type": "individual",
                          "to": "+16505551234",
                          "type": "interactive",
                          "interactive": {
                            "type": "button",
                            "header": {
                              "type": "image",
                              "image": {
                                "id": "2762702990552401"
                              }
                            },
                            "body": {
                              "text": "Hi Pablo! Your gardening workshop is scheduled for 9am tomorrow. Use the buttons if you need to reschedule. Thank you!"
                            },
                            "footer": {
                              "text": "Lucky Shrub: Your gateway to succulents!™"
                            },
                            "action": {
                              "buttons": [
                                {
                                  "type": "reply",
                                  "reply": {
                                    "id": "change-button",
                                    "title": "Change"
                                  }
                                },
                                {
                                  "type": "reply",
                                  "reply": {
                                    "id": "cancel-button",
                                    "title": "Cancel"
                                  }
                                }
                              ]
                            }
                          }
                        },
                headers: {
                    "Content-Type": "application/json"
                }
            });

            res.sendStatus(200);
        } else {
            res.sendStatus(404);
        }
    }
});

app.get("/", (req, res) => {
    res.status(200).send("Hello, this is webhook setup");
});
