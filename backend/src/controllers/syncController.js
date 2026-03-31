const syncService = require('../services/dataSyncService');

/**
 * Controller handling manual range synchronization requests.
 * Extracts dates from the request body and delegates to the sync service.
 * Errors are passed to the global error middleware via next().
 */
exports.handleRangeSync = async (req, res, next) => {
  const { startDate, endDate } = req.body;

  if (!startDate || !endDate) {
    return res.status(400).json({ 
      error: 'Les champs startDate et endDate sont obligatoires.' 
    });
  }

  try {
    const count = await syncService.syncRange(startDate, endDate);
    
    res.status(200).json({
      message: 'Synchronisation manuelle réussie.',
      entriesSaved: count
    });
  } catch (error) {
    // Delegates error handling to the centralized error middleware
    next(error);
  }
};