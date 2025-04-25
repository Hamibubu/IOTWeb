const { response } = require('express');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
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

class loginController {
    async iniciarsesion(req,res) {
        try{
            let user = await getUserByName(req.body.username);
            if (!user) {
                return res.status(400).send({ message: 'Usuario o contraseña incorrecta' });
            }
            var username = user[0].Username;
            const isMatch = await bcrypt.compare(req.body.password, user[0].Password);
            if (!isMatch) {
                return res.status(400).send({ message: 'Usuario o contraseña incorrecta' });
            }
            const userType = user[0].Role;
            const tokenPayload = {
                userType,
                username
            }
            const token = jwt.sign(tokenPayload, process.env.SECRET_KEY, { expiresIn: '1h' });
            const expirationDate = new Date();
            expirationDate.setHours(expirationDate.getHours() + 1);
            res.cookie('authToken', token, {
                expires: expirationDate,
                httpOnly: true,
                secure: true, 
                sameSite: 'Lax',
                path: '/'
            });

            res.json({ message: 'Login exitoso, token enviado en cookie' });
        } catch (err) {
            console.error('Login error: ', err);
            res.sendStatus(500).send("Error interno"); 
        }
    }
    async registrarusuario(req,res){
        try{
            if (req.user.userType === "Viewer"){
                return res.status(401).send({ message: 'No Tienes Permiso de hacer esto' });
            }
            const roles = ["Administrator", "Viewer"]
            if (!roles.includes(req.body.role)){
                return res.status(400).send({ message: 'El rol no existe' }); 
            }
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(req.body.password, salt);
            req.body.password = hashedPassword;
            var user = await getUserByName(req.body.username);
            if (user.length >= 1){
                return res.status(400).send({ message: 'El usuario ya existe' });
            }
            const result = await createUser(req.body)
            if (result.$metadata.httpStatusCode != 200){
                return res.status(500).send({ message: 'Error inesperado' });
            }
            return res.status(200).send({ message: 'Usuario creado exitosamente' });
        }catch(err){
            return res.status(500).send("Error interno");
        }
    }
}

async function createUser(data){
    const {username, password, role, card_id} = data
    const command = new PutCommand({
        TableName: "Users",
        Item: {
            Users: uuidv4(),
            id: uuidv4(),
            Username: username,
            Password: password,
            Role: role,
            Card_ID: card_id
        }
    });
    const response = await docClient.send(command);
    return response
}

async function getUserByName(username) {
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

module.exports = new loginController();