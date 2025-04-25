const router = require('express').Router();
const loginController = require('./../controllers/loginController');
const auth = require('../middlewares/auth');

router.post('/login/user',loginController.iniciarsesion);
router.post('/register/user',auth ,loginController.registrarusuario);

module.exports = router;