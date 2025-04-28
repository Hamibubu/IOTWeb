const router = require('express').Router();
const loginController = require('./../controllers/loginController');
const auth = require('../middlewares/auth');
const file = require('../middlewares/file')

router.post('/login/user',loginController.iniciarsesion);
router.post('/register/user', auth, file.uploadUserPhotos, loginController.registrarusuario);

module.exports = router;