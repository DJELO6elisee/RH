# 🔌 Guide d'intégration - Direction Générale dans server.js

## Vue d'ensemble

Ce guide explique comment intégrer les routes de la table `direction_generale` dans votre serveur backend Node.js/Express.

## 📁 Fichiers créés

Les fichiers suivants ont été créés et doivent être intégrés :

```
backend/
├── controllers/
│   └── directionGeneraleController.js  ← Controller avec toute la logique
├── routes/
│   └── directionGenerale.js           ← Routes API
└── database/
    └── [Fichiers SQL...]
```

## 🔧 Étape 1 : Vérifier la structure du projet

Votre `server.js` devrait ressembler à ceci :

```javascript
const express = require('express');
const cors = require('cors');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes existantes
const agentRoutes = require('./routes/agents');
const ministereRoutes = require('./routes/ministeres');
// ... autres routes

app.use('/api/agents', agentRoutes);
app.use('/api/ministeres', ministereRoutes);
// ... autres routes

// Démarrage du serveur
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});
```

## 🚀 Étape 2 : Ajouter les routes direction_generale

### Option A : Modification manuelle de server.js

Ajoutez ces lignes dans votre `server.js` :

```javascript
// ============================================================================
// AJOUT - Direction Générale
// ============================================================================

// 1. Importer les routes (avec les autres imports de routes)
const directionGeneraleRoutes = require('./routes/directionGenerale');

// 2. Utiliser les routes (avec les autres app.use)
app.use('/api/directions-generales', directionGeneraleRoutes);
```

### Exemple complet avec contexte :

```javascript
const express = require('express');
const cors = require('cors');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// ============================================================================
// ROUTES
// ============================================================================

// Routes existantes
const agentRoutes = require('./routes/agents');
const ministereRoutes = require('./routes/ministeres');
const directionRoutes = require('./routes/directions');
const entiteRoutes = require('./routes/entites');

// 👉 NOUVELLE ROUTE - Direction Générale
const directionGeneraleRoutes = require('./routes/directionGenerale');

// Utilisation des routes
app.use('/api/agents', agentRoutes);
app.use('/api/ministeres', ministereRoutes);
app.use('/api/directions', directionRoutes);
app.use('/api/entites', entiteRoutes);

// 👉 NOUVELLE ROUTE - Direction Générale
app.use('/api/directions-generales', directionGeneraleRoutes);

// ============================================================================
// Route par défaut
// ============================================================================

app.get('/', (req, res) => {
  res.json({ 
    message: 'API RH - Serveur fonctionnel',
    version: '1.0.0'
  });
});

// ============================================================================
// Gestion des erreurs
// ============================================================================

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: 'Erreur serveur',
    message: err.message
  });
});

// ============================================================================
// Démarrage du serveur
// ============================================================================

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
  console.log(`📡 API disponible sur http://localhost:${PORT}`);
  console.log(`📋 Endpoints:`);
  console.log(`   - GET    /api/directions-generales`);
  console.log(`   - GET    /api/directions-generales/:id`);
  console.log(`   - POST   /api/directions-generales`);
  console.log(`   - PUT    /api/directions-generales/:id`);
  console.log(`   - DELETE /api/directions-generales/:id`);
});

module.exports = app;
```

### Option B : Script d'intégration automatique (PowerShell)

Créez un fichier `integrate_routes.ps1` :

```powershell
# Script d'intégration automatique
$serverFile = ".\server.js"
$backup = ".\server.js.backup"

# Sauvegarder server.js
Copy-Item $serverFile $backup

# Lire le contenu
$content = Get-Content $serverFile

# Trouver où ajouter l'import
$importLine = "const directionGeneraleRoutes = require('./routes/directionGenerale');"
$useLine = "app.use('/api/directions-generales', directionGeneraleRoutes);"

# Ajouter si pas déjà présent
if ($content -notcontains $importLine) {
    # Logique d'insertion...
    Write-Host "Routes ajoutées avec succès!"
} else {
    Write-Host "Routes déjà présentes."
}
```

## ✅ Étape 3 : Vérifier l'intégration

### 1. Vérifier la syntaxe

```bash
# Tester que le fichier n'a pas d'erreurs de syntaxe
node --check server.js
```

### 2. Démarrer le serveur

```bash
# Arrêter le serveur s'il est en cours
# Ctrl+C

# Redémarrer
node server.js

# Ou avec nodemon
nodemon server.js
```

### 3. Vérifier les logs

Vous devriez voir :

```
🚀 Serveur démarré sur le port 5000
📡 API disponible sur http://localhost:5000
📋 Endpoints:
   - GET    /api/directions-generales
   - GET    /api/directions-generales/:id
   - POST   /api/directions-generales
   - PUT    /api/directions-generales/:id
   - DELETE /api/directions-generales/:id
```

## 🧪 Étape 4 : Tester les endpoints

### Test 1 : GET toutes les directions générales

```bash
# Windows PowerShell
Invoke-RestMethod -Uri "http://localhost:5000/api/directions-generales" -Headers @{"Authorization"="Bearer YOUR_TOKEN"}

# Ou avec curl
curl http://localhost:5000/api/directions-generales -H "Authorization: Bearer YOUR_TOKEN"
```

### Test 2 : POST créer une direction générale

```bash
curl -X POST http://localhost:5000/api/directions-generales ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer YOUR_TOKEN" ^
  -d "{\"id_ministere\": 1, \"libelle\": \"Test DG\", \"code\": \"TESTDG\"}"
```

### Test 3 : GET une direction générale par ID

```bash
curl http://localhost:5000/api/directions-generales/1 -H "Authorization: Bearer YOUR_TOKEN"
```

### Test 4 : Statistiques

```bash
curl http://localhost:5000/api/directions-generales/statistiques/overview ^
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 📝 Exemple de réponse API

### GET /api/directions-generales

```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "id": 1,
      "id_ministere": 1,
      "libelle": "Direction Générale des Ressources Humaines",
      "code": "DGRH",
      "description": "Gestion stratégique des ressources humaines",
      "directeur_general_id": 123,
      "email": "dgrh@ministere.gouv.ma",
      "telephone": "+212 5 37 XX XX XX",
      "is_active": true,
      "ministere_nom": "Ministère de l'Éducation",
      "directeur_nom": "Ahmed BENALI",
      "nombre_directions": 5,
      "nombre_agents": 150,
      "created_at": "2025-01-15T10:00:00Z",
      "updated_at": "2025-01-15T10:00:00Z"
    }
  ]
}
```

### POST /api/directions-generales

```json
{
  "success": true,
  "message": "Direction générale créée avec succès",
  "data": {
    "id": 6,
    "id_ministere": 1,
    "libelle": "Direction Générale de Test",
    "code": "DGT",
    "is_active": true,
    "created_at": "2025-10-28T14:30:00Z"
  }
}
```

## 🔒 Étape 5 : Sécurité et permissions

### Modifier les routes selon vos besoins

Dans `routes/directionGenerale.js`, vous pouvez :

#### Option 1 : Toutes les routes nécessitent l'authentification (par défaut)

```javascript
// Déjà configuré dans le fichier fourni
router.get('/', auth, directionGeneraleController.getAllDirectionsGenerales);
```

#### Option 2 : Certaines routes publiques

```javascript
// Routes publiques (consultation)
router.get('/', directionGeneraleController.getAllDirectionsGenerales);
router.get('/:id', directionGeneraleController.getDirectionGeneraleById);

// Routes protégées (modification)
router.post('/', auth, directionGeneraleController.createDirectionGenerale);
router.put('/:id', auth, directionGeneraleController.updateDirectionGenerale);
router.delete('/:id', auth, directionGeneraleController.deleteDirectionGenerale);
```

#### Option 3 : Permissions par rôle

```javascript
const checkRole = require('../middleware/checkRole');

// Seulement les admins
router.post('/', auth, checkRole(['admin', 'super_admin']), 
  directionGeneraleController.createDirectionGenerale);

// Seulement les super admins
router.delete('/:id', auth, checkRole(['super_admin']), 
  directionGeneraleController.deleteDirectionGenerale);
```

## 🐛 Dépannage

### Erreur : "Cannot find module './routes/directionGenerale'"

**Cause** : Le fichier n'est pas au bon endroit

**Solution** :
```bash
# Vérifier l'emplacement
ls backend/routes/directionGenerale.js

# S'assurer que le fichier existe
```

### Erreur : "Cannot find module '../controllers/directionGeneraleController'"

**Cause** : Le controller n'est pas trouvé

**Solution** :
```bash
# Vérifier l'emplacement
ls backend/controllers/directionGeneraleController.js
```

### Erreur : "Column 'id_direction_generale' does not exist"

**Cause** : Le script SQL n'a pas été exécuté

**Solution** :
```bash
# Exécuter le script de création
psql -U postgres -d ma_rh_db -f backend/database/create_direction_generale.sql
```

### Le serveur ne redémarre pas

**Solution** :
```bash
# Tuer le processus Node.js
# Windows
taskkill /F /IM node.exe

# Linux/Mac
killall node

# Redémarrer
node server.js
```

### Les routes ne répondent pas (404)

**Solution** :
1. Vérifier que les routes sont bien ajoutées dans `server.js`
2. Vérifier l'URL : `/api/directions-generales` (avec un S à générales)
3. Redémarrer le serveur
4. Vérifier les logs du serveur

## 📊 Monitoring et logs

### Ajouter des logs détaillés

Dans `server.js` :

```javascript
// Middleware de logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});
```

### Logger les requêtes API

```javascript
const morgan = require('morgan');
app.use(morgan('combined'));
```

## 🎯 Checklist d'intégration

- [ ] Fichiers créés et placés au bon endroit
  - [ ] `controllers/directionGeneraleController.js`
  - [ ] `routes/directionGenerale.js`
- [ ] Routes ajoutées dans `server.js`
  - [ ] Import ajouté
  - [ ] app.use() ajouté
- [ ] Script SQL exécuté
  - [ ] Table créée
  - [ ] Vérification OK
- [ ] Serveur redémarré
- [ ] Tests API effectués
  - [ ] GET liste
  - [ ] GET par ID
  - [ ] POST création
  - [ ] PUT mise à jour
  - [ ] DELETE suppression
- [ ] Authentification configurée
- [ ] Documentation mise à jour

## 📚 Ressources supplémentaires

- **Documentation complète** : `backend/database/DIRECTION_GENERALE_README.md`
- **Exemples SQL** : `backend/database/exemples_requetes_direction_generale.md`
- **Guide installation** : `backend/database/GUIDE_INSTALLATION_DIRECTION_GENERALE.md`

## 🎉 Félicitations !

Une fois toutes ces étapes complétées, votre API sera opérationnelle avec les endpoints suivants :

- ✅ GET    `/api/directions-generales` - Liste
- ✅ GET    `/api/directions-generales/:id` - Détails
- ✅ POST   `/api/directions-generales` - Création
- ✅ PUT    `/api/directions-generales/:id` - Modification
- ✅ DELETE `/api/directions-generales/:id` - Suppression
- ✅ GET    `/api/directions-generales/:id/directions` - Relations
- ✅ GET    `/api/directions-generales/:id/agents` - Relations
- ✅ GET    `/api/directions-generales/statistiques/overview` - Stats

---

**Date** : Octobre 2025  
**Version** : 1.0

