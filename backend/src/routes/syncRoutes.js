const express = require('express');
const router = express.Router();
const syncController = require('../controllers/syncController');
const { verifySyncKey } = require('../middlewares/authMiddleware');

/**
 * Route definition for manual synchronization.
 * Uses the auth middleware before reaching the controller.
 */
router.post('/range', verifySyncKey, syncController.handleRangeSync);

module.exports = router;