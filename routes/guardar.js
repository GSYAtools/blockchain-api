const express = require('express');
const router = express.Router();
const { guardarJson } = require('../controllers/guardarController');

router.post('/', guardarJson);

module.exports = router;
