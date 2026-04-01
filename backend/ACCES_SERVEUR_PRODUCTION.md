# Accès au serveur de production

## Problème : Connexion SSH refusée

Vous essayez de vous connecter avec `user@tourisme.2ise-groupe.com` mais le mot de passe est refusé.

## Solutions possibles

### 1. Utiliser le bon nom d'utilisateur

Le nom d'utilisateur `user` est probablement incorrect. Les noms d'utilisateur courants sont :

- `root` (administrateur)
- `admin`
- `isegroup` (d'après les fichiers que j'ai vus)
- Votre nom d'utilisateur personnel
- Le nom d'utilisateur fourni par votre hébergeur

**Essayer :**
```bash
ssh isegroup@tourisme.2ise-groupe.com
# ou
ssh root@tourisme.2ise-groupe.com
# ou
ssh admin@tourisme.2ise-groupe.com
```

### 2. Utiliser une clé SSH au lieu d'un mot de passe

Si vous avez une clé SSH configurée :

```bash
ssh -i /chemin/vers/votre/cle.pem isegroup@tourisme.2ise-groupe.com
```

### 3. Accès via un panneau de contrôle

Si vous avez accès à un panneau de contrôle (cPanel, Plesk, etc.) :

1. **Connectez-vous au panneau de contrôle**
2. **Cherchez "Terminal" ou "SSH Access"**
3. **Utilisez les identifiants du panneau**

### 4. Contacter l'administrateur du serveur

Si vous ne connaissez pas les identifiants :

1. **Contactez l'administrateur du serveur**
2. **Demandez :**
   - Le nom d'utilisateur SSH
   - Le mot de passe SSH
   - Ou une clé SSH pour l'accès

### 5. Vérifier les informations d'hébergement

Si vous avez un compte d'hébergement (CloudLinux, cPanel, etc.) :

1. **Vérifiez l'email de confirmation d'hébergement**
2. **Cherchez les identifiants SSH dans les documents fournis**
3. **Vérifiez le panneau de contrôle de l'hébergeur**

## Alternative : Accès via le panneau de contrôle

Si vous avez accès à cPanel, Plesk, ou un autre panneau :

### Via cPanel

1. Connectez-vous à `https://tourisme.2ise-groupe.com:2083` (ou le port de cPanel)
2. Allez dans "Terminal" ou "SSH Access"
3. Utilisez le terminal intégré

### Via Plesk

1. Connectez-vous au panneau Plesk
2. Allez dans "Tools & Settings" > "SSH Access"
3. Activez l'accès SSH si nécessaire

## Alternative : Utiliser PM2 Remote

Si vous avez configuré PM2 avec un accès distant :

```bash
pm2 link <secret> <public>
```

## Alternative : Modifier les fichiers via FTP/SFTP

Si vous avez accès FTP/SFTP :

1. **Connectez-vous via FileZilla ou un autre client FTP**
2. **Modifiez les fichiers directement**
3. **Redémarrez le serveur via le panneau de contrôle**

## Informations à vérifier

### 1. Vérifier les emails d'hébergement

Cherchez dans vos emails :
- Email de confirmation d'hébergement
- Email avec les identifiants SSH
- Email de l'hébergeur avec les informations de connexion

### 2. Vérifier le panneau de contrôle de l'hébergeur

Si vous avez un compte chez un hébergeur :
- Connectez-vous au panneau de contrôle
- Cherchez "SSH Access" ou "Terminal"
- Les identifiants y sont généralement affichés

### 3. Vérifier les documents du projet

Cherchez dans les documents du projet :
- Fichier `README.md` avec les informations de déploiement
- Fichier `.env` ou configuration avec les identifiants
- Documentation de déploiement

## Si vous avez accès au serveur via un autre moyen

### Option 1 : Terminal intégré (cPanel/Plesk)

1. Connectez-vous au panneau de contrôle
2. Utilisez le terminal intégré
3. Exécutez les commandes directement

### Option 2 : Modifier les fichiers et redémarrer via le panneau

1. Modifiez les fichiers via FTP/SFTP
2. Redémarrez le serveur via le panneau de contrôle
3. Vérifiez les logs via le panneau

## Commandes à exécuter (une fois connecté)

Une fois que vous avez accès au serveur, exécutez :

```bash
# 1. Aller dans le répertoire du backend
cd /chemin/vers/backend

# 2. Vérifier PM2
pm2 status

# 3. Redémarrer avec NODE_ENV=production
NODE_ENV=production pm2 restart tourisme-api

# 4. Vérifier les logs
pm2 logs tourisme-api --lines 20

# 5. Vérifier que le serveur écoute sur 0.0.0.0
netstat -tuln | grep 5000

# 6. Tester le serveur
curl http://localhost:5000/health
```

## Résumé

1. ❓ **Trouvez le bon nom d'utilisateur** (probablement `isegroup` ou `root`)
2. 🔑 **Utilisez le bon mot de passe** ou une clé SSH
3. 🌐 **Ou utilisez le panneau de contrôle** (cPanel, Plesk, etc.)
4. 📧 **Ou contactez l'administrateur** du serveur

Une fois que vous avez accès, suivez les instructions dans `RESOLUTION_PRODUCTION_503.md` pour résoudre le problème 503.



