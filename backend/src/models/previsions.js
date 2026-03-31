const { DataTypes } = require('sequelize');

/**
 * Exports the Prevision model definition.
 * This function is used by the main Sequelize initialization to bind the model to the connection.
 */
module.exports = (sequelize) => {
  return sequelize.define('Prevision', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    indice: {
      type: DataTypes.DOUBLE, 
      allowNull: true
    },
    longitude: {
      type: DataTypes.DOUBLE,
      allowNull: false
    },
    latitude: {
      type: DataTypes.DOUBLE,
      allowNull: false
    },
    dateprevision: { 
      type: DataTypes.DATE, 
      allowNull: false
    }
  }, {
    tableName: 'previsions',
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['name', 'dateprevision'],
        name: 'unique_city_forecast_time'
      }
    ]
  });
};