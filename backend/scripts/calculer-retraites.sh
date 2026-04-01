#!/bin/bash

# Script pour calculer les dates de retraite de tous les agents
# Usage: ./calculer-retraites.sh [token]

TOKEN=$1
BASE_URL="https://tourisme.2ise-groupe.com/api"

echo "========================================="
echo "Calcul en masse des dates de retraite"
echo "========================================="
echo ""

if [ -z "$TOKEN" ]; then
    echo "⚠️  Aucun token fourni. Si l'endpoint nécessite une authentification,"
    echo "    veuillez fournir un token JWT en paramètre"
    echo ""
    echo "Usage: ./calculer-retraites.sh YOUR_JWT_TOKEN"
    echo ""
    read -p "Voulez-vous continuer sans token ? (o/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Oo]$ ]]; then
        echo "Opération annulée."
        exit 1
    fi
fi

URL="${BASE_URL}/agents/batch-calculate-retirement"

echo "🔄 Envoi de la requête à : $URL"
echo ""

if [ -z "$TOKEN" ]; then
    RESPONSE=$(curl -s -X POST "$URL" \
        -H "Content-Type: application/json" \
        -w "\nHTTP_STATUS:%{http_code}")
else
    RESPONSE=$(curl -s -X POST "$URL" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -w "\nHTTP_STATUS:%{http_code}")
fi

HTTP_STATUS=$(echo "$RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" -eq 200 ]; then
    echo "========================================="
    echo "✅ SUCCÈS - Calcul terminé"
    echo "========================================="
    echo ""
    echo "📊 Résultats :"
    echo "$BODY" | jq '.'
    echo ""
    echo "✅ Vous pouvez maintenant consulter les projections de retraite !"
else
    echo "========================================="
    echo "❌ ERREUR (Code HTTP: $HTTP_STATUS)"
    echo "========================================="
    echo ""
    echo "$BODY" | jq '.'
fi


















