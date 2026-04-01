#!/bin/bash

# Script de déploiement des fichiers manquants vers le serveur de production
# Usage: ./deploy-missing-files.sh [user@server]

SERVER=$1

if [ -z "$SERVER" ]; then
    echo "Usage: ./deploy-missing-files.sh user@server"
    echo "Exemple: ./deploy-missing-files.sh root@tourisme.2ise-groupe.com"
    exit 1
fi

REMOTE_PATH="/home/isegroup/tourisme"

echo "=========================================="
echo "Déploiement des fichiers vers $SERVER"
echo "=========================================="

# Fichiers à déployer
FILES=(
    "routes/agents.js"
    "routes/agentAuth.js"
    "controllers/AgentsController.js"
    "controllers/AgentAuthController.js"
    "services/authCodeService.js"
    "services/emailService.js"
)

for file in "${FILES[@]}"; do
    echo "Transfert de $file..."
    scp "$file" "$SERVER:$REMOTE_PATH/$file"
    
    if [ $? -eq 0 ]; then
        echo "✓ $file transféré avec succès"
    else
        echo "✗ Erreur lors du transfert de $file"
    fi
done

echo ""
echo "=========================================="
echo "Redémarrage de l'application..."
echo "=========================================="

# Redémarrer l'application
ssh "$SERVER" "cd $REMOTE_PATH && pm2 restart tourisme"

if [ $? -eq 0 ]; then
    echo "✓ Application redémarrée avec succès"
else
    echo "✗ Erreur lors du redémarrage"
fi

echo ""
echo "Déploiement terminé !"

