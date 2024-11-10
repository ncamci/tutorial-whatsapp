const express = require("express");
const body_parser = require("body-parser");
const axios = require("axios");
require('dotenv').config();

// OpenAI Client Setup
const { OpenAI } = require('openai');
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const app = express().use(body_parser.json());

const token = process.env.TOKEN;
const mytoken = process.env.MYTOKEN; // prasath_token

app.listen(process.env.PORT, () => {
    console.log("webhook is listening");
});

// Webhook Verification
app.get("/webhook", (req, res) => {
    let mode = req.query["hub.mode"];
    let challange = req.query["hub.challenge"];
    let token = req.query["hub.verify_token"];

    if (mode && token) {
        if (mode === "subscribe" && token === mytoken) {
            res.status(200).send(challange);
        } else {
            res.status(403).send('Forbidden');
        }
    }
});

// Webhook for receiving messages and responding via OpenAI
app.post("/webhook", async (req, res) => {
    let body_param = req.body;

    console.log(JSON.stringify(body_param, null, 2));

    if (body_param.object) {
        if (body_param.entry &&
            body_param.entry[0].changes &&
            body_param.entry[0].changes[0].value.messages &&
            body_param.entry[0].changes[0].value.messages[0]) {

            let phon_no_id = body_param.entry[0].changes[0].value.metadata.phone_number_id;
            let from = body_param.entry[0].changes[0].value.messages[0].from;
            let msg_body = body_param.entry[0].changes[0].value.messages[0].text.body;

            console.log("phone number " + phon_no_id);
            console.log("from " + from);
            console.log("body param " + msg_body);

            try {
                // Send the message body to OpenAI for a response
                const openaiResponse = await openai.chat.completions.create({
                    model: "gpt-4",  // Or any other model you'd like to use
                    messages: [
                        { role: "system", content: "You are a helpful assistant." },
                        { role: "user", content: msg_body }
                    ]
                });

                // Extract the message from OpenAI response
                const openaiReply = openaiResponse.choices[0].message.content;

                // Send the OpenAI response back to the user via WhatsApp
                await axios({
                    method: "POST",
                    url: `https://graph.facebook.com/v13.0/${phon_no_id}/messages?access_token=${token}`,
                    data: {
                        messaging_product: "whatsapp",
                        recipient_type: "individual",
                        to: from,
                        type: "text",
                        text: {
                            body: openaiReply,
                        },
                    },
                    headers: {
                        "Content-Type": "application/json",
                    },
                });

                res.sendStatus(200);  // Successfully handled the request
            } catch (error) {
                console.error("Error interacting with OpenAI or sending message:", error);
                res.sendStatus(500);  // Internal server error if something goes wrong
            }
        } else {
            res.sendStatus(404);  // No valid message found
        }
    }
});

// Health check route
app.get("/", (req, res) => {
    res.status(200).send("hello this is webhook setup");
});
