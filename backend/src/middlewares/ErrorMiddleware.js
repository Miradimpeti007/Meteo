/**
 * Global error handling middleware.
 * Catches all errors passed via next(err) and returns a clean 500 response.
 */
module.exports = (err, req, res, next) => {
  // Log technique pour le développeur
  console.error(" [ERREUR CRITIQUE] :", err.message || err);
  
  if (err.name && err.name.includes('Sequelize')) {
    console.error("Detail Sequelize :", err.parent || err);
  }

  // Réponse propre pour le client (Postman ou Front-end)
  res.status(500).json({ 
    message: "Erreur serveur interne",
    error: process.env.NODE_ENV === 'development' ? err.message : undefined 
  });
};