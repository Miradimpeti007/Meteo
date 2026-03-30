const { previsions } = require('../models');

/**
 * Controller handling weather forecast data retrieval.
 */
const PrevisionController = {
  /**
   * Fetches all weather records from the database.
   * @param {Object} req - Express request object.
   * @param {Object} res - Express response object.
   * @param {Function} next - Express next middleware function.
   */
  getAll: async (req, res, next) => {
    try {
      // Retrieves all 100 cities with their coordinates and indices
      const data = await previsions.findAll({
        order: [['name', 'ASC']] // Sorts by city name for better readability
      });

      if (!previsions) {
        throw new Error("Le modèle 'previsions' n'a pas été trouvé dans l'index des modèles.");
      }

      return res.status(200).json(data);
    } catch (error) {
      // Forwards any database error to the global ErrorMiddleware
      next(error);
    }
  }
};

module.exports = PrevisionController;