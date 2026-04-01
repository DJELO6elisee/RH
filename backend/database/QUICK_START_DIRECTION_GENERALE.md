# ⚡ Quick Start - Direction Générale

## 🚀 Installation en 5 minutes

### Méthode 1 : Script automatique (Recommandé pour Windows)

```powershell
cd "C:\Users\HP\Desktop\LES RH\backend\database"
.\install_direction_generale.ps1
```

Le script s'occupe de tout automatiquement ! ✨

---

### Méthode 2 : Installation manuelle

#### Étape 1 : Sauvegarde (30 secondes)

```bash
cd "C:\Users\HP\Desktop\LES RH\backend\database"
pg_dump -U postgres -d ma_rh_db -F c -f backup.backup
```

#### Étape 2 : Installation (1 minute)

```bash
psql -U postgres -d ma_rh_db -f create_direction_generale.sql
```

#### Étape 3 : Vérification (30 secondes)

```bash
psql -U postgres -d ma_rh_db -f verify_direction_generale.sql
```

#### Étape 4 : Données de test - Optionnel (30 secondes)

```bash
psql -U postgres -d ma_rh_db -f test_data_direction_generale.sql
```

#### Étape 5 : Intégration backend (2 minutes)

Éditer `backend/server.js`, ajouter ces 2 lignes :

```javascript
// Avec les autres imports
const directionGeneraleRoutes = require('./routes/directionGenerale');

// Avec les autres app.use()
app.use('/api/directions-generales', directionGeneraleRoutes);
```

Redémarrer le serveur :

```bash
cd ..
node server.js
```

#### Étape 6 : Test (1 minute)

```bash
curl http://localhost:5000/api/directions-generales -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🎯 C'est terminé !

Votre API est maintenant opérationnelle avec 8 nouveaux endpoints :

- ✅ `GET /api/directions-generales` - Liste
- ✅ `GET /api/directions-generales/:id` - Détails  
- ✅ `POST /api/directions-generales` - Créer
- ✅ `PUT /api/directions-generales/:id` - Modifier
- ✅ `DELETE /api/directions-generales/:id` - Supprimer
- ✅ `GET /api/directions-generales/:id/directions`
- ✅ `GET /api/directions-generales/:id/agents`
- ✅ `GET /api/directions-generales/statistiques/overview`

---

## 📚 Pour aller plus loin

- **Documentation complète** : `DIRECTION_GENERALE_README.md`
- **Guide détaillé** : `GUIDE_INSTALLATION_DIRECTION_GENERALE.md`
- **Exemples SQL** : `exemples_requetes_direction_generale.sql`
- **Intégration** : `INTEGRATION_DIRECTION_GENERALE.md`
- **Index des fichiers** : `INDEX_DIRECTION_GENERALE.md`

---

## 🆘 Problème ?

1. **La table existe déjà** : Utilisez `rollback_direction_generale.sql`
2. **Erreur de permission** : Vérifiez les droits PostgreSQL
3. **Routes ne fonctionnent pas** : Redémarrer le serveur Node.js

Consultez `GUIDE_INSTALLATION_DIRECTION_GENERALE.md` section "Dépannage"

---

**Installation complète : ~5 minutes** ⚡  
**Documentation : 13 fichiers créés** 📚  
**Code : 100% prêt à l'emploi** ✅

