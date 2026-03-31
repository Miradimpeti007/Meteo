const express = require('express');
const router = express.Router();
const PrevisionController = require('../controllers/PrevisionController');

/**
 * Route defining the entry point for weather data.
 * Endpoint: GET /api/previsions
 */
router.get('/getAll', PrevisionController.getAll);

module.exports = router;