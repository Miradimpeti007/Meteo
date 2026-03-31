'use strict';
const express = require('express');
const router = express.Router();
const { getData } = require('../controllers/data');

router.get('/data', getData);

module.exports = router;
