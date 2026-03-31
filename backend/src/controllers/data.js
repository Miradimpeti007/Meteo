'use strict';
const { Op } = require('sequelize');
const { dbNord, dbSud } = require('../models');

const getData = async (req, res) => {
  try {
    const { date_start, date_end, zone, indice_min, indice_max } = req.query;
    const where = {};

    if (date_start && date_end) {
      where.dateprevision = {
        [Op.between]: [new Date(date_start), new Date(date_end)]
      };
    }

    if (indice_min || indice_max) {
      where.indice = {};
      if (indice_min) where.indice[Op.gte] = parseFloat(indice_min);
      if (indice_max) where.indice[Op.lte] = parseFloat(indice_max);
    }

    if (zone) {
      where.name = { [Op.iLike]: `%${zone}%` };
    }

    const [nord, sud] = await Promise.all([
      dbNord.previsions.findAll({ where }),
      dbSud.previsions.findAll({ where })
    ]);

    res.json({ data: [...nord, ...sud] });
  } catch (err) {
    console.error('getData error:', err.message);
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getData };
