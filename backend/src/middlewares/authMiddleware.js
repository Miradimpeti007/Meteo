/**
 * Middleware for API Key authentication.
 * Compares the 'x-api-key' header with the value stored in environment variables.
 */
const verifySyncKey = (req, res, next) => {
  const clientKey = req.headers['x-api-key'];
  const serverKey = process.env.SYNC_API_KEY;

  if (!clientKey || clientKey !== serverKey) {
    return res.status(401).json({
      error: 'Accès refusé : Clé API invalide ou manquante.'
    });
  }

  next();
};

module.exports = { verifySyncKey };