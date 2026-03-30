module.exports = (err, req, res, next) => {
  console.error("Erreur Sequelize :", err);
  res.status(500).json({ message: "Erreur serveur" });
};
