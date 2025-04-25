const jwt = require('jsonwebtoken');

const secretKey = process.env.SECRET_KEY

const authMiddleware = (req, res, next) => {
    try {
        // Comprobar si la cookie está presente
        if (!req.headers.cookie) {
            return res.redirect('/login.html');
        }

        // Intentar obtener el token de la cookie
        const cookieParts = req.headers.cookie.split('=');
        if (cookieParts.length < 2) {
            res.redirect('/login.html');
        }
        const token = cookieParts[1];
        // Verificar el token
        jwt.verify(token, secretKey, (err, decode) => {
            if (err) {
                return res.redirect('/login.html');
            } else {
                req.user = decode;
                next();
            }
        });
    } catch (err) {
        return res.redirect('/login.html');
    }
}

module.exports = authMiddleware;