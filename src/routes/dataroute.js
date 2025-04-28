const router = require('express').Router();
const dataController = require('./../controllers/dataController');
const auth = require('../middlewares/auth');
const file = require('../middlewares/file');

router.post('/card/validate',dataController.validateCard);
router.post('/face/validate', file.uploadSingleFile, dataController.validateFace);
router.get('/data/graph',auth ,dataController.getData);

module.exports = router;