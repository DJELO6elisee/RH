const cron = require('node-cron');
const MariageNotificationService = require('../services/MariageNotificationService');

/**
 * Tâche planifiée pour vérifier et envoyer les notifications de mariage
 * S'exécute tous les jours à 8h00 du matin
 */
const mariageNotificationsJob = cron.schedule('0 8 * * *', async () => {
    console.log('🕐 Démarrage de la vérification des mariages à venir...');
    try {
        await MariageNotificationService.verifierEtEnvoyerNotifications();
        console.log('✅ Vérification des mariages terminée avec succès');
    } catch (error) {
        console.error('❌ Erreur lors de la vérification des mariages:', error);
    }
}, {
    scheduled: false, // Ne pas démarrer automatiquement
    timezone: "Africa/Abidjan"
});

// Fonction pour démarrer le job
const startMariageNotificationsJob = () => {
    mariageNotificationsJob.start();
    console.log('📅 Tâche planifiée des notifications de mariage démarrée (tous les jours à 8h00)');
};

// Fonction pour arrêter le job
const stopMariageNotificationsJob = () => {
    mariageNotificationsJob.stop();
    console.log('🛑 Tâche planifiée des notifications de mariage arrêtée');
};

module.exports = {
    mariageNotificationsJob,
    startMariageNotificationsJob,
    stopMariageNotificationsJob
};

