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
  },
  getActual: async (req, res, next) => {
    try {
      const time = Date.now(); // Request time
      const range = 3 * 60 * 60 * 1000 - 1; // 3 hours -1 millisecond
      const data = await previsions.findAll({
        where: {
          dateprevision : {
            [Op.between] : [
              time - range,   // Finds the latest data
              time
            ]
          }
        },
        order: [['name', 'ASC']]
      });

      if (!previsions) {
        throw new Error("Le modèle 'previsions' n'a pas été trouvé dans l'index des modèles.");
      }

      return res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  },
  getDate: async (req, res, next) => {
    try {
      const range = 1.5 * 60 * 60 * 1000; // 1 hours 30 minutes
      const day = 24 * 60 * 60 * 1000; // 1 day
      date = Date(req.params.date);
      hour = Date(req.params.hour);
      time = new Date();
      if (!date) {
        date = Date.now() / day; // Today
      }
      if (!hour) {
        hour = Date.now() / (60 * 60 * 1000);
      }
      time = date + hour;
      
      const data = await previsions.findAll({
        where: {
          dateprevision: {
            [Op.between]: [                     // Finds with the nearest datetime.
              new Date(date.getTime() - range),
              new Date(date.getTime() + range-1)
            ]
          }
        },
        order: [['name', 'ASC']]
      });

      if (!prevision) {
        throw new Error("Le modèle 'previsions' n'a pas été trouvé dans l'index des modèles.");
      }

      return res.status(200).json(data);
    } catch (error) {
      next(error);
    }
  }
};

module.exports = PrevisionController;