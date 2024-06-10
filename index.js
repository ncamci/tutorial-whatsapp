const express=require("express");
const body_parser=require("body-parser");
const axios=require("axios");
require('dotenv').config();

const app=express().use(body_parser.json());

const token=process.env.TOKEN;
const mytoken=process.env.MYTOKEN;//prasath_token

app.listen(process.env.PORT,()=>{
    console.log("webhook is listening");
});

//to verify the callback url from dashboard side - cloud api side
app.get("/webhook",(req,res)=>{
   let mode=req.query["hub.mode"];
   let challange=req.query["hub.challenge"];
   let token=req.query["hub.verify_token"];


    if(mode && token){

        if(mode==="subscribe" && token===mytoken){
            res.status(200).send(challange);
        }else{
            res.status(403);
        }

    }

});

app.post("/webhook",(req,res)=>{ //i want some 

    let body_param=req.body;

    console.log(JSON.stringify(body_param,null,2));

    if (body_param.object) {
        console.log("inside body param");
        if (
            body_param.entry && 
            body_param.entry[0].changes && 
            body_param.entry[0].changes[0].value.messages && 
            body_param.entry[0].changes[0].value.messages[0]
        ) {
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

            if (msg_body === "hi") {
                responseMessage = "Hi, how can I help you today?";
                userStates[from] = {}; // Reset state
            } else if (msg_body === "name" || userStates[from].awaitingName) {
                if (!userStates[from].awaitingName) {
                    responseMessage = "What's your name?";
                    userStates[from].awaitingName = true;
                } else if (!userStates[from].name) {
                    userStates[from].name = msg_body;
                    responseMessage = "What's your surname?";
                } else {
                    userStates[from].surname = msg_body;
                    responseMessage = `Thank you, ${userStates[from].name} ${userStates[from].surname}!`;
                    userStates[from] = {}; // Reset state
                }
            } else if (msg_body === "age" || userStates[from].awaitingAge) {
                if (!userStates[from].awaitingAge) {
                    responseMessage = "How old are you?";
                    userStates[from].awaitingAge = true;
                } else {
                    responseMessage = `Thank you!`;
                    userStates[from] = {}; // Reset state
                }
            } else if (msg_body === "address" || userStates[from].awaitingAddress) {
                if (!userStates[from].awaitingAddress) {
                    responseMessage = "What country are you in?";
                    userStates[from].awaitingAddress = true;
                } else if (!userStates[from].country) {
                    userStates[from].country = msg_body;
                    responseMessage = "What city are you in?";
                } else {
                    userStates[from].city = msg_body;
                    responseMessage = `Thank you!`;
                    userStates[from] = {}; // Reset state
                }
            } else {
                responseMessage = "Sorry, I didn't understand that. Can you please rephrase?";
            }

            axios({
                method: "POST",
                url: "https://graph.facebook.com/v13.0/" + phon_no_id + "/messages?access_token=" + token,
                data: {
                    messaging_product: "whatsapp",
                    to: from,
                    text: {
                        body: responseMessage
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

app.get("/",(req,res)=>{
    res.status(200).send("hello this is webhook setup");
});
