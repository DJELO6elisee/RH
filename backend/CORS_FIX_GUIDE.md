# Guide de résolution des problèmes CORS et 503

## Problème identifié

Vous rencontrez des erreurs **503 Service Unavailable** sur les requêtes OPTIONS (preflight CORS), ce qui empêche votre frontend de communiquer avec le serveur backend.

## Causes possibles

1. **Le serveur Node.js n'est pas démarré ou n'est pas accessible**
2. **Un proxy (Nginx/Apache) bloque les requêtes OPTIONS**
3. **La configuration `trust proxy` n'est pas correcte**
4. **Le serveur backend n'écoute pas sur le bon port**

## Corrections apportées au code

### 1. Configuration `trust proxy` améliorée
- En **production** : `trust proxy` est maintenant activé pour tous les proxies
- En **développement** : `trust proxy` reste limité pour la sécurité

### 2. Gestion des requêtes OPTIONS améliorée
- Les requêtes OPTIONS sont maintenant traitées **AVANT** tous les autres middlewares
- Les headers CORS sont **TOUJOURS** ajoutés, même si l'origine n'est pas dans la liste autorisée
- Logging amélioré pour diagnostiquer les problèmes

### 3. Fonction helper centralisée
- Nouvelle fonction `getAllowedOrigin()` pour une logique CORS cohérente
- Utilisée dans tous les middlewares (OPTIONS, CORS, erreurs, 404)

## Étapes de résolution

### Étape 1 : Redémarrer le serveur

**Si vous utilisez PM2 :**
```bash
cd /chemin/vers/backend
pm2 restart all
# ou
pm2 restart tourisme-api
pm2 logs tourisme-api
```

**Si vous utilisez systemd :**
```bash
sudo systemctl restart votre-service-nodejs
sudo systemctl status votre-service-nodejs
```

**Si vous démarrez manuellement :**
```bash
cd /chemin/vers/backend
node server.js
```

### Étape 2 : Vérifier que le serveur répond

Testez directement le serveur backend (sans passer par le proxy) :

```bash
# Test de santé
curl http://localhost:5000/health

# Test OPTIONS
curl -X OPTIONS http://localhost:5000/api/auth/check-login-ministere \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" \
  -v
```

Vous devriez voir :
- Status: `200 OK`
- Headers `Access-Control-Allow-Origin` présents

### Étape 3 : Vérifier la configuration Nginx (si applicable)

Si vous utilisez Nginx comme reverse proxy, assurez-vous que la configuration permet les requêtes OPTIONS :

```nginx
location /api/ {
    proxy_pass http://localhost:5000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
    
    # IMPORTANT: Ne pas bloquer les requêtes OPTIONS
    # Nginx doit les transmettre au backend Node.js
    # Le backend gère les headers CORS
    
    # Timeout pour éviter les 503
    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
}
```

**⚠️ IMPORTANT :** Ne configurez PAS les headers CORS dans Nginx si votre backend Node.js les gère déjà. Cela peut causer des conflits.

**Après modification de Nginx :**
```bash
sudo nginx -t  # Vérifier la configuration
sudo systemctl restart nginx  # Redémarrer Nginx
```

### Étape 4 : Vérifier les logs

**Logs du serveur Node.js :**
```bash
# Si PM2
pm2 logs tourisme-api

# Si systemd
sudo journalctl -u votre-service-nodejs -f

# Si démarrage manuel
# Les logs s'affichent dans la console
```

**Ce que vous devriez voir pour une requête OPTIONS :**
```
🔍 OPTIONS preflight request: { path: '/api/auth/check-login-ministere', origin: 'http://localhost:3000', ... }
✅ OPTIONS: Headers CORS envoyés, origin: http://localhost:3000
```

**Si vous voyez une erreur 503 dans les logs :**
- Le serveur Node.js n'est probablement pas démarré
- Vérifiez que le port 5000 (ou celui configuré) est bien écouté
- Vérifiez les logs d'erreur pour plus de détails

### Étape 5 : Vérifier le firewall et les ports

Assurez-vous que :
- Le port du backend (5000 par défaut) est ouvert
- Le firewall n'bloque pas les connexions
- Le proxy peut se connecter au backend

```bash
# Vérifier que le port est écouté
netstat -tuln | grep 5000
# ou
ss -tuln | grep 5000

# Tester la connexion
telnet localhost 5000
```

## Test depuis le navigateur

1. Ouvrez la console du navigateur (F12)
2. Allez sur votre application frontend
3. Vérifiez les requêtes réseau :
   - Les requêtes OPTIONS devraient retourner **200 OK** (pas 503)
   - Les headers `Access-Control-Allow-Origin` devraient être présents

## Configuration des origines autorisées

Les origines suivantes sont autorisées par défaut :
- `http://localhost:3000` (et autres ports localhost)
- `https://tourisme.2ise-groupe.com`
- `http://tourisme.2ise-groupe.com`
- `https://sigrh-mtl.ci`
- `http://sigrh-mtl.ci`

Pour ajouter d'autres origines, modifiez le tableau `allowedOrigins` dans `server.js` ou utilisez la variable d'environnement `CORS_ORIGIN`.

## Dépannage supplémentaire

### Si le problème persiste après redémarrage

1. **Vérifiez que le serveur écoute bien :**
   ```bash
   curl http://localhost:5000/health
   ```

2. **Vérifiez les logs d'erreur du serveur :**
   - Recherchez les erreurs de connexion
   - Recherchez les erreurs de base de données
   - Recherchez les erreurs de configuration

3. **Testez directement depuis le serveur :**
   ```bash
   curl -X OPTIONS https://tourisme.2ise-groupe.com/api/auth/check-login-ministere \
     -H "Origin: http://localhost:3000" \
     -v
   ```

4. **Vérifiez la configuration du proxy :**
   - Assurez-vous que le proxy transmet bien les requêtes au backend
   - Vérifiez les logs Nginx/Apache pour les erreurs 503

### Si vous voyez toujours des erreurs CORS

1. **Vérifiez que l'origine du frontend correspond :**
   - Le frontend doit utiliser exactement l'une des origines autorisées
   - Vérifiez qu'il n'y a pas de slash final (`http://localhost:3000/` vs `http://localhost:3000`)

2. **Vérifiez les headers de la réponse :**
   - Ouvrez les outils de développement du navigateur
   - Allez dans l'onglet Network
   - Cliquez sur une requête qui échoue
   - Vérifiez que les headers `Access-Control-Allow-Origin` sont présents

## Support

Si le problème persiste après avoir suivi ces étapes :
1. Vérifiez les logs complets du serveur
2. Vérifiez les logs du proxy (Nginx/Apache)
3. Testez la connexion directe au backend (sans proxy)
4. Vérifiez la configuration réseau et firewall

