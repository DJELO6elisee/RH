# Correctifs à déployer sur le serveur de production

## Problèmes identifiés

1. **Erreur AgentAuthController** : Le fichier `AgentAuthController.js` est manquant sur le serveur
2. **Erreur retirement-projection (route)** : Le fichier `routes/agents.js` est obsolète sur le serveur
3. **Erreur getRetirementProjection (méthode)** : Le fichier `controllers/AgentsController.js` est obsolète et ne contient pas la méthode `getRetirementProjection`

## Fichiers à transférer

### 1. Contrôleur des agents (⚠️ IMPORTANT - contient les nouvelles méthodes)
- **Fichier local** : `C:\Users\HP\Desktop\All Folder\RH\backend\controllers\AgentsController.js`
- **Destination serveur** : `/home/isegroup/tourisme/controllers/AgentsController.js`
- **Raison** : Contient la méthode `getRetirementProjection` manquante

### 2. Contrôleur d'authentification des agents
- **Fichier local** : `C:\Users\HP\Desktop\All Folder\RH\backend\controllers\AgentAuthController.js`
- **Destination serveur** : `/home/isegroup/tourisme/controllers/AgentAuthController.js`

### 3. Service d'authentification par code
- **Fichier local** : `C:\Users\HP\Desktop\All Folder\RH\backend\services\authCodeService.js`
- **Destination serveur** : `/home/isegroup/tourisme/services/authCodeService.js`

### 4. Service d'envoi d'emails
- **Fichier local** : `C:\Users\HP\Desktop\All Folder\RH\backend\services\emailService.js`
- **Destination serveur** : `/home/isegroup/tourisme/services/emailService.js`

### 5. Route d'authentification des agents
- **Fichier local** : `C:\Users\HP\Desktop\All Folder\RH\backend\routes\agentAuth.js`
- **Destination serveur** : `/home/isegroup/tourisme/routes/agentAuth.js`

### 6. Routes des agents (MIS À JOUR)
- **Fichier local** : `C:\Users\HP\Desktop\All Folder\RH\backend\routes\agents.js`
- **Destination serveur** : `/home/isegroup/tourisme/routes/agents.js`

## Méthodes de déploiement

### Option 1 : Via PowerShell (Recommandé pour Windows)
```powershell
cd "C:\Users\HP\Desktop\All Folder\RH\backend"
.\deploy-missing-files.ps1 user@tourisme.2ise-groupe.com
```

### Option 2 : Via SCP manuellement
```bash
# Pour chaque fichier
scp "C:\Users\HP\Desktop\All Folder\RH\backend\controllers\AgentsController.js" user@tourisme.2ise-groupe.com:/home/isegroup/tourisme/controllers/
scp "C:\Users\HP\Desktop\All Folder\RH\backend\controllers\AgentAuthController.js" user@tourisme.2ise-groupe.com:/home/isegroup/tourisme/controllers/
scp "C:\Users\HP\Desktop\All Folder\RH\backend\services\authCodeService.js" user@tourisme.2ise-groupe.com:/home/isegroup/tourisme/services/
scp "C:\Users\HP\Desktop\All Folder\RH\backend\services\emailService.js" user@tourisme.2ise-groupe.com:/home/isegroup/tourisme/services/
scp "C:\Users\HP\Desktop\All Folder\RH\backend\routes\agentAuth.js" user@tourisme.2ise-groupe.com:/home/isegroup/tourisme/routes/
scp "C:\Users\HP\Desktop\All Folder\RH\backend\routes\agents.js" user@tourisme.2ise-groupe.com:/home/isegroup/tourisme/routes/
```

### Option 3 : Via FTP/SFTP
Utilisez FileZilla ou WinSCP pour transférer les fichiers listés ci-dessus.

## Après le transfert

### Redémarrer l'application Node.js
```bash
# Se connecter au serveur
ssh user@tourisme.2ise-groupe.com

# Redémarrer avec PM2
pm2 restart tourisme

# Ou avec systemctl
systemctl restart tourisme

# Vérifier les logs
pm2 logs tourisme
```

## Vérification

Après le déploiement, testez :
1. ✅ Connexion agent : `POST https://tourisme.2ise-groupe.com/api/agent-auth/login`
2. ✅ Projection retraites : `GET https://tourisme.2ise-groupe.com/api/agents/retirement-projection?years=5`

## Notes importantes

- ⚠️ Assurez-vous d'avoir une sauvegarde avant de remplacer les fichiers
- ⚠️ Vérifiez que les permissions des fichiers sont correctes après le transfert
- ⚠️ Si vous utilisez Git sur le serveur, faites un `git pull` plutôt qu'un transfert manuel

