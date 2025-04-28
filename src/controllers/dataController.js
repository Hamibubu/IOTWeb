const { response } = require('express');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, ScanCommand, PutCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({ 
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
})

const docClient = DynamoDBDocumentClient.from(client);

class MetadataController {
    async validateCard(req, res){
        try{
            if (req.headers["x-api-key"] !== "DejameEntrarPorfavorsitoPorfavorTeLoRuego"){
                return res.status(401).send({ message: 'No intentes entrar si no conoces como!' });
            }
            const st = await getUserByCard(req.body.Card_ID)
            if (st.length === 0){
                const log = {
                    "Card_ID": req.body.Card_ID,
                    "Reason": "Invalid Card",
                    "Status": "Denied",
                    "Timestamp": Math.floor(Date.now() / 1000).toString(),
                    "User": "No User"
                }
                const stt = await createLog(log);
                return  res.status(404).send({ message: 'ACCESO DENEGADO' })
            }
            return res.status(200).send({ user: st[0].Username })
        }catch(err){
            return res.status(500).send("Error interno");
        }  
    }

    async validateFace(req, res){
        try{
            const filename=req.uploadedFiles.UserPhoto;
            var userdata = await getFilesByUser(req.body.User);
            userdata = userdata[0];
            const frontphoto = userdata.frontPhoto;
            const leftphoto = userdata.leftPhoto;
            const rightphoto = userdata.rightPhoto;
            if (req.headers["x-api-key"] !== "DejameEntrarPorfavorsitoPorfavorTeLoRuego"){
                return res.status(401).send({ message: 'No intentes entrar si no conoces como!' });
            }
            const flask_server=process.env.FLASK_SERVER + "/recognize";
            const data = {
                User: req.body.User,
                File2Check: filename,
                frontPhoto: frontphoto,
                leftPhoto: leftphoto,
                rightPhoto: rightphoto
            };
            const resp = await axios.post(flask_server, data)
            const status_face = resp.data.Status;
            const timestamp = resp.data.Timestamp;
            if (status_face === "Denied"){
                const log = {
                    "Card_ID": userdata.Card_ID,
                    "Reason": "Invalid Face",
                    "Status": "Denied",
                    "Timestamp": timestamp,
                    "User": userdata.Username
                }
                const st = await createLog(log);
                return  res.status(200).send({ message: 'Access Denied' })
            }
            const log = {
                "Card_ID": userdata.Card_ID,
                "Reason": "N/A",
                "Status": "Allowed",
                "Timestamp": timestamp,
                "User": userdata.Username
            }
            const st = await createLog(log);
            return  res.status(200).send({ message: 'Access Granted' })
        }catch(err){
            console.log(err)
            return res.status(500).send("Error interno");
        }
    }

    async getData(req, res){
        try{
            const [users, logs] = await fetchAll();
            var timestamps = []
            logs.forEach(log => {
                var timestamp = {
                    "Timestamp":log.Timestamp,
                    "Status":log.Status
                }
                timestamps.push(timestamp)
            });
            const last24 = await getEvents24Hrs(timestamps);
            const usercount = await getUsersFrequency(logs);
            const weeklyaccess = await getAllowedEventsThisWeekFrequencies(timestamps);
            const failedlogins = await getFailedLogins(logs);
            const top5last = await getTop5(logs);
            const simpledata = {
                "Succesful": await countSuccessfulLoginsToday(logs),
                "Failed": await countUnSuccessfulLoginsToday(logs),
                "Users":users.length
            }
            
            return  res.status(200).send([last24, usercount, weeklyaccess, failedlogins, top5last, simpledata]);
        }catch(err){
            console.log(err)
            return res.status(500).send("Error interno");
        }
    }
}

async function countUnSuccessfulLoginsToday(timestamps) {
    const ahorita = Date.now() / 1000; 
    const todayStart = new Date(); 
    todayStart.setHours(0, 0, 0, 0); 
    const todayStartTimestamp = Math.floor(todayStart.getTime() / 1000); 

    var successfulLoginsToday = 0;

    timestamps.forEach(timest => {
        if(timest.Status === "Denied" && timest.Timestamp >= todayStartTimestamp){
            successfulLoginsToday++;
        }
    })

    return successfulLoginsToday;
}

async function countSuccessfulLoginsToday(timestamps) {
    const ahorita = Date.now() / 1000; 
    const todayStart = new Date(); 
    todayStart.setHours(0, 0, 0, 0);
    const todayStartTimestamp = Math.floor(todayStart.getTime() / 1000); 

    var successfulLoginsToday = 0;

    timestamps.forEach(timest => {
        if(timest.Status === "Allowed" && timest.Timestamp >= todayStartTimestamp){
            successfulLoginsToday++;
        }
    })

    return successfulLoginsToday;
}

async function getTop5(logs){
    return logs.sort((a, b) => b.Timestamp - a.Timestamp).slice(0, 5); 
}

async function getFailedLogins(logs){
    var failedLogins = {}
    logs.forEach(log => {
        if(log.Reason !== "N/A"){
            if(failedLogins[log.Reason]){
                failedLogins[log.Reason]++;
            }else{
                failedLogins[log.Reason]=1;
            }
        }
    })
    return failedLogins
}

function getISOWeekYearAndNumber(date) {
    const d = new Date(date.getTime());
    const dayNum = d.getDay() || 7;
    d.setDate(d.getDate() + 4 - dayNum);
    const yearStart = new Date(d.getFullYear(), 0, 1);
    const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    return { year: d.getFullYear(), week: weekNo };
}

async function getAllowedEventsThisWeekFrequencies(timestamps) {
    const today = new Date();
    const { year: currentYear, week: currentWeek } = getISOWeekYearAndNumber(today);

    const frecuencias = [0, 0, 0, 0, 0, 0, 0];

    timestamps.forEach(ts => {
        if (ts.Status !== 'Allowed') return;

        const fechaEvento = new Date(ts.Timestamp * 1000);
        const { year, week } = getISOWeekYearAndNumber(fechaEvento);

        if (year === currentYear && week === currentWeek) {
            let dia = fechaEvento.getDay(); 
            dia = dia === 0 ? 6 : dia - 1;
            frecuencias[dia]++;
        }
    });

    return frecuencias;
}

async function getUsersFrequency(logs){
    userCount = {};
    logs.forEach(log => {
        if(log.Status === "Allowed"){
            if(!userCount[log.User]){
                userCount[log.User]=1;
            }else{
                userCount[log.User]++;
            }
        }
    })
    return userCount;
}

async function getEvents24Hrs(timestamps){
    const ahorita = Date.now() / 1000;
    const hace24hrs =  ahorita - (24 * 60 *60);
    last24hrs = {
        "Allowed": new Array(24).fill(0),
        "Denied": new Array(24).fill(0)
    }
    timestamps.forEach(timestamp => {
        if (timestamp.Timestamp >= hace24hrs){
            const hora = new Date(timestamp.Timestamp * 1000).getHours();
            if(last24hrs[timestamp.Status][hora]){
                last24hrs[timestamp.Status][hora]++;
            }else{
                last24hrs[timestamp.Status][hora]=1;
            }
        }
    });
    return last24hrs
}

async function fetchAll(){
    try {
        var command = new ScanCommand({
            TableName: "Users",
        });
        var { Items } = await docClient.send(command);
        const users = Items
        command = new ScanCommand({
            TableName: "LoginData",
        });
        var { Items } = await docClient.send(command);
        const logs = Items      
        return [users, logs];
    } catch (error) {
        return 0;
    }  
}

async function getUserByCard(Card_ID) {
    try {
        const command = new ScanCommand({
            TableName: "Users",
            FilterExpression: "#Card_ID = :Card_ID",
            ExpressionAttributeNames: {
                "#Card_ID": "Card_ID"
            },
            ExpressionAttributeValues: {
                ":Card_ID": Card_ID
            }
        });
        const { Items } = await docClient.send(command);
        return Items;
    } catch (error) {
        return 0;
    }
}

async function getFilesByUser(username) {
    try {
        const command = new ScanCommand({
            TableName: "Users",
            FilterExpression: "#Username = :Username",
            ExpressionAttributeNames: {
                "#Username": "Username"
            },
            ExpressionAttributeValues: {
                ":Username": username
            }
        });
        const { Items } = await docClient.send(command);
        return Items;
    } catch (error) {
        return 0;
    }
}

async function createLog(data){
    const {Card_ID, Reason, Status, Timestamp, User} = data
    const command = new PutCommand({
        TableName: "LoginData",
        Item: {
            EventID: uuidv4(),
            Card_ID: Card_ID,
            Reason: Reason,
            Status: Status,
            Timestamp: Timestamp,
            User: User
        }
    });
    const response = await docClient.send(command);
    return response
}

module.exports = new MetadataController();