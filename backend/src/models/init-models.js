var DataTypes = require("sequelize").DataTypes;
var _previsions = require("./previsions");

function initModels(sequelize) {
  var previsions = _previsions(sequelize, DataTypes);


  return {
    previsions,
  };
}
module.exports = initModels;
module.exports.initModels = initModels;
module.exports.default = initModels;
