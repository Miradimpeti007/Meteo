const { previsions, Sequelize } = require('../models');
const { Op } = Sequelize;

/**
 * Controller handling weather forecast data retrieval.
 * All errors are caught and forwarded to the global ErrorMiddleware.
 */
const PrevisionController = {


  /**
   * Chemin dédié au filtrage par indice.
   * Utilise les Query Parameters : ?min=X, ?max=Y, ?eq=Z
   */
  getByIndice: async (req, res, next) => {
    console.log("--- [DEBUG] Entrée dans getByIndice ---");
    try {
      const { min, max, eq } = req.query;
      let filter = {};

      // Priorité à l'égalité exacte si elle est fournie
      if (eq) {
        console.log(`[DEBUG] Filtrage égalité exacte : ${eq}`);
        filter.indice = { [Op.eq]: parseInt(eq, 10) };
      } 
      // Sinon, on gère les plages (min et/ou max)
      else if (min || max) {
        filter.indice = {};
        if (min) {
          console.log(`[DEBUG] Filtrage min (>=) : ${min}`);
          filter.indice[Op.gte] = parseInt(min, 10);
        }
        if (max) {
          console.log(`[DEBUG] Filtrage max (<=) : ${max}`);
          filter.indice[Op.lte] = parseInt(max, 10);
        }
      }

      const data = await previsions.findAll({
        where: filter,
        order: [['name', 'ASC']]
      });

      console.log(`[DEBUG] getByIndice : ${data.length} résultats trouvés.`);
      return res.status(200).json(data);

    } catch (error) {
      console.error("[DEBUG ERROR] getByIndice :", error.message);
      next(error); // Envoi vers ton middleware d'erreur (500)
    }
  },
  /**
   * Fetches all weather records from the database.
   */
  getAll: async (req, res, next) => {
    try {
      if (!previsions) {
        console.error("[CONTROLLER ERROR] Le modèle 'previsions' est introuvable.");
        return res.status(500).json({ message: "Erreur de configuration serveur." });
      }

      const data = await previsions.findAll({
        order: [['name', 'ASC']]
      });

      return res.status(200).json(data);
    } catch (error) {
      console.error("[API ERROR] getAll :", error.message);
      next(error);
    }
  },

  /**
   * Retrieves the most recent weather data for each city using DISTINCT ON.
   * Ensures exactly one (the latest) record per city name is returned.
   */
  getActual: async (req, res, next) => {
    try {
      const data = await previsions.findAll({
        attributes: [
          // DISTINCT ON garantit une seule ligne par nom pour PostgreSQL
          [Sequelize.literal('DISTINCT ON ("name") "name"'), 'name'],
          'indice',
          'longitude',
          'latitude',
          'dateprevision',
          'updatedAt'
        ],
        // L'ordre est CRITIQUE : d'abord par nom, puis par date décroissante
        order: [
          ['name', 'ASC'], 
          ['dateprevision', 'DESC']
        ],
        raw: true 
      });

      console.log(`[API] getActual : ${data.length} villes uniques récupérées.`);
      return res.status(200).json(data);
    } catch (error) {
      console.error("[CONTROLLER ERROR] getActual :", error.message);
      next(error);
    }
  }, // <--- La virgule était manquante ici !

  /**
   * Finds weather records for a specific date and hour with a margin of 1.5 hours.
   */
  getDate: async (req, res, next) => {
    try {
      const { date, hour } = req.params;
      const margin = 1.5 * 60 * 60 * 1000;

      // Initialise la date cible ou utilise "maintenant" si vide
      let targetDate = date ? new Date(date) : new Date();
      
      // Ajuste l'heure spécifique si fournie dans l'URL
      if (hour) {
        targetDate.setHours(parseInt(hour, 10), 0, 0, 0);
      }

      const startTime = new Date(targetDate.getTime() - margin);
      const endTime = new Date(targetDate.getTime() + margin);

      const data = await previsions.findAll({
        where: {
          dateprevision: {
            [Op.between]: [startTime, endTime]
          }
        },
        order: [['name', 'ASC']]
      });

      if (data.length === 0) {
        console.log(`[INFO] Aucune donnée trouvée pour le créneau : ${startTime} - ${endTime}`);
      }

      return res.status(200).json(data);
    } catch (error) {
      console.error("[CONTROLLER ERROR] getDate :", error.message);
      next(error);
    }
  }
};

module.exports = PrevisionController;