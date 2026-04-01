#!/bin/bash

# Script de redémarrage sécurisé du serveur Node.js
# À utiliser sur CloudLinux avec limites de ressources

echo "🛑 Arrêt de tous les processus Node.js et PM2..."

# Tuer tous les processus Node.js
pkill -9 node 2>/dev/null || true
pkill -9 pm2 2>/dev/null || true

# Tuer PM2 proprement
pm2 kill 2>/dev/null || true

# Attendre que les processus soient terminés
echo "⏳ Attente de 5 secondes..."
sleep 5

# Vérifier qu'il n'y a plus de processus
NODE_PROCESSES=$(ps aux | grep -E "node|pm2" | grep -v grep | wc -l)
if [ "$NODE_PROCESSES" -gt 0 ]; then
    echo "⚠️  Il reste $NODE_PROCESSES processus actifs, arrêt forcé..."
    ps aux | grep -E "node|pm2" | grep -v grep | awk '{print $2}' | xargs kill -9 2>/dev/null || true
    sleep 3
fi

echo "✅ Nettoyage terminé"

# Aller dans le répertoire du projet
cd /home/isegroup/tourisme || {
    echo "❌ Impossible de se rendre dans /home/isegroup/tourisme"
    exit 1
}

# Vérifier que server.js existe
if [ ! -f "server.js" ]; then
    echo "❌ Fichier server.js introuvable"
    exit 1
fi

echo "🚀 Démarrage du serveur avec PM2 (1 instance uniquement)..."

# Démarrer avec UNE SEULE instance et limite de mémoire
NODE_OPTIONS="--max-old-space-size=400" pm2 start server.js \
    --name tourisme-api \
    -i 1 \
    --max-memory-restart 400M \
    --log-date-format "YYYY-MM-DD HH:mm:ss Z" \
    --merge-logs

# Attendre que le serveur démarre
sleep 3

# Vérifier le statut
pm2 status

# Sauvegarder la configuration
pm2 save

echo ""
echo "✅ Redémarrage terminé"
echo "📊 Vérifiez les logs avec: pm2 logs tourisme-api"
echo "🏥 Testez la santé avec: curl http://localhost:5000/health"

