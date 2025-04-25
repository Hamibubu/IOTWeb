const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv').config();
const jwt = require('jsonwebtoken');
const path = require('path');
const loginroutes = require('./src/routes/loginroute');
const dataroutes = require('./src/routes/dataroute');
const auth = require('./src/middlewares/auth')

const app = express();

app.use(express.json());

app.use('/api', loginroutes);
app.use('/api', dataroutes);

const corsOptions = {
    origin: '*', 
    optionsSuccessStatus: 200
};
  
app.use(cors(corsOptions));

app.get('/clear-cookies',auth , (req, res) => {
    res.clearCookie('authToken', { httpOnly: true, path: '/' });
    res.send("Cookies borradas");
});

app.get('/welcome', auth, (req, res) => {
    if (req.user.userType !== "Administrator") {
        return res.status(200).send("0");
    }
    res.status(200).send('<a href="./register.html" class="menu-item px-4 py-2 rounded-lg text-white text-opacity-90 hover:text-opacity-100 hover:bg-white hover:bg-opacity-10 transition-all flex items-center"><i class="fas fa-shield-alt mr-2 text-amber-300"></i>Registrar</a>');
});

app.get('/index.html', auth,(req, res) => {
    res.sendFile(path.join(__dirname, './views/index.html'));
});

app.get('/register.html', auth,(req, res) => {
    if (req.user.userType !== "Administrator"){
        return res.status(401).send("¿Qué haces?");
    } 
    res.sendFile(path.join(__dirname, './views/register.html'));
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, './views/login.html'));
});

app.use(express.static(path.join(__dirname, 'views')));

app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, './views/404.html'));
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});
