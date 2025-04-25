const router = require('express').Router();
const dataController = require('./../controllers/dataController');
const auth = require('../middlewares/auth')

router.post('/card/validate',dataController.validateCard);
router.post('/log/store',dataController.storeLog);
router.get('/data/graph',auth ,dataController.getData);

module.exports = router;