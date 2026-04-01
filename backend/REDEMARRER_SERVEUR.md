# Instructions pour redémarrer le serveur de production

## Problème
Si vous rencontrez des erreurs CORS (503 Service Unavailable sur les requêtes OPTIONS), le serveur de production doit être redémarré pour appliquer les nouvelles modifications.

## Étapes pour redémarrer le serveur

### Option 1: Redémarrage via PM2 (recommandé)
```bash
# Se connecter au serveur de production
ssh user@tourisme.2ise-groupe.com

# Aller dans le répertoire du backend
cd /chemin/vers/backend

# Redémarrer le serveur PM2
pm2 restart all

# Ou redémarrer un processus spécifique
pm2 restart server

# Vérifier le statut
pm2 status

# Voir les logs
pm2 logs
```

### Option 2: Redémarrage via systemd
```bash
# Se connecter au serveur de production
ssh user@tourisme.2ise-groupe.com

# Redémarrer le service
sudo systemctl restart votre-service-nodejs

# Vérifier le statut
sudo systemctl status votre-service-nodejs
```

### Option 3: Redémarrage manuel
```bash
# Se connecter au serveur de production
ssh user@tourisme.2ise-groupe.com

# Aller dans le répertoire du backend
cd /chemin/vers/backend

# Arrêter le processus Node.js actuel
# (Trouver le PID avec: ps aux | grep node)
kill -9 <PID>

# Redémarrer le serveur
npm start
# ou
node server.js
# ou
pm2 start server.js
```

## Vérification après redémarrage

1. **Tester la route OPTIONS directement:**
```bash
curl -X OPTIONS https://tourisme.2ise-groupe.com/api/auth/check-login-ministere \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type,Authorization" \
  -v
```

2. **Vérifier les logs du serveur:**
   - Les logs devraient montrer: `✅ OPTIONS: Réponse envoyée avec headers CORS`

3. **Tester depuis le frontend:**
   - Ouvrir la console du navigateur
   - Vérifier que les requêtes OPTIONS retournent maintenant 200 au lieu de 503

## Configuration Nginx (si applicable)

Si vous utilisez Nginx comme reverse proxy, assurez-vous que la configuration permet les requêtes OPTIONS:

```nginx
location /api/ {
    proxy_pass http://localhost:5000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
    
    # CORS headers
    add_header 'Access-Control-Allow-Origin' '$http_origin' always;
    add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, PATCH, DELETE, OPTIONS' always;
    add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization, X-Requested-With, Accept' always;
    add_header 'Access-Control-Allow-Credentials' 'true' always;
    
    # Gérer les requêtes OPTIONS
    if ($request_method = 'OPTIONS') {
        add_header 'Access-Control-Allow-Origin' '$http_origin' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, PATCH, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization, X-Requested-With, Accept' always;
        add_header 'Access-Control-Allow-Credentials' 'true' always;
        add_header 'Access-Control-Max-Age' 86400;
        add_header 'Content-Type' 'text/plain charset=UTF-8';
        add_header 'Content-Length' 0;
        return 204;
    }
}
```

Après modification de Nginx, redémarrer Nginx:
```bash
sudo nginx -t  # Vérifier la configuration
sudo systemctl restart nginx  # Redémarrer Nginx
```

## Notes importantes

- Les modifications du code nécessitent un redémarrage du serveur pour être appliquées
- Les modifications de Nginx nécessitent un redémarrage de Nginx
- Vérifiez toujours les logs après redémarrage pour détecter d'éventuelles erreurs


