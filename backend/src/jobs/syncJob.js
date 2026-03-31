const cron = require('node-cron');
const { previsions } = require('../models');
const syncService = require('../services/dataSyncService');

/**
 * Vérifie l'état de la base et charge l'historique (10 jours) si besoin.
 */
async function runStartupCheck() {
  try {
    const count = await previsions.count();
    // Si on a moins de 300 lignes, on considère que la base est vide/incomplète
    if (count < 300) {
      console.log('[STARTUP] Moins de 300 entrées. Récupération de l\'historique...');
      
      const days = process.env.DAYS_TO_RETRIEVE || 10; 
      
      await syncService.syncHistory(days); 
      
      console.log(`[STARTUP] Récupération des ${days} derniers jours terminée.`);
    }
    else{
        await syncService.syncRecent();
    }
  } catch (error) {
    console.error('[STARTUP ERROR] :', error.message);
  }
}

/**
 * Initialise le planificateur avec la période donnée.
 */
function initScheduler(periode) {
  // On utilise la variable 'periode' passée en argument
  cron.schedule(periode, async () => {
    console.log('[CRON] Lancement de la synchronisation périodique...');
    try {
      await syncService.syncRecent();
      console.log('[CRON] Synchronisation réussie.');
    } catch (error) {
      console.error('[CRON ERROR] :', error.message);
    }
  });

  console.log(`[JOBS] Scheduler initialisé (Fréquence : ${periode})`);
}

/**
 * Point d'entrée exporté
 */
module.exports = async (intTroisHeures) => {
  
  
  initScheduler(intTroisHeures); 
  
  await runStartupCheck();
};