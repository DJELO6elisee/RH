# 🚀 Guide d'Installation - Table Direction Générale

## 📋 Aperçu rapide

Ce guide vous accompagne dans l'installation de la nouvelle table `direction_generale` dans votre base de données.

## ✅ Prérequis

- PostgreSQL installé et fonctionnel
- Base de données `ma_rh_db` existante
- Accès avec les droits d'administration (utilisateur `postgres`)
- Les tables `ministeres`, `directions`, et `agents` doivent exister

## 📦 Fichiers fournis

| Fichier | Description |
|---------|-------------|
| `create_direction_generale.sql` | Script principal de création |
| `verify_direction_generale.sql` | Script de vérification |
| `rollback_direction_generale.sql` | Script d'annulation |
| `DIRECTION_GENERALE_README.md` | Documentation complète |

## 🔧 Installation

### Étape 1 : Sauvegarder la base de données

⚠️ **IMPORTANT** : Toujours faire une sauvegarde avant toute modification !

#### Windows PowerShell
```powershell
# Naviguer vers le dossier backend/database
cd "C:\Users\HP\Desktop\LES RH\backend\database"

# Créer une sauvegarde
$date = Get-Date -Format "yyyyMMdd_HHmmss"
pg_dump -U postgres -d ma_rh_db -F c -f "backup_avant_direction_generale_$date.backup"
```

#### Linux/Mac
```bash
cd /chemin/vers/backend/database
pg_dump -U postgres -d ma_rh_db -F c -f "backup_avant_direction_generale_$(date +%Y%m%d_%H%M%S).backup"
```

### Étape 2 : Exécuter le script de création

#### Méthode 1 : Via psql (Recommandée)

```bash
# Depuis le dossier backend/database
psql -U postgres -d ma_rh_db -f create_direction_generale.sql
```

#### Méthode 2 : Via pgAdmin

1. Ouvrir pgAdmin
2. Se connecter à la base de données `ma_rh_db`
3. Outils → Query Tool
4. Ouvrir le fichier `create_direction_generale.sql`
5. Cliquer sur le bouton "Exécuter" (▶️)

#### Méthode 3 : Via Windows PowerShell

```powershell
# Depuis le dossier du projet
cd "C:\Users\HP\Desktop\LES RH\backend\database"

# Exécuter le script
& "C:\Program Files\PostgreSQL\[VERSION]\bin\psql.exe" -U postgres -d ma_rh_db -f ".\create_direction_generale.sql"
```

### Étape 3 : Vérifier l'installation

```bash
# Exécuter le script de vérification
psql -U postgres -d ma_rh_db -f verify_direction_generale.sql
```

Vous devriez voir :
- ✓ Table direction_generale existe
- ✓ Colonne id_direction_generale existe dans directions
- ✓ Colonne id_direction_generale existe dans agents
- Les contraintes FK et index créés

## 📊 Résultat attendu

Après l'installation, vous aurez :

### 1. Nouvelle table `direction_generale`
```
direction_generale
├── id (PK)
├── id_ministere (FK → ministeres)
├── libelle
├── directeur_general_id (FK → agents)
├── description
├── code
├── adresse
├── telephone
├── email
├── is_active
├── created_at
└── updated_at
```

### 2. Modifications sur `directions`
- Nouvelle colonne : `id_direction_generale` (FK → direction_generale)

### 3. Modifications sur `agents`
- Nouvelle colonne : `id_direction_generale` (FK → direction_generale)

## 🎯 Premier test

Après l'installation, testez avec des données d'exemple :

```sql
-- 1. Créer une direction générale de test
INSERT INTO public.direction_generale (id_ministere, libelle, code, description)
VALUES (
    1, 
    'Direction Générale de Test', 
    'DGT', 
    'Direction générale créée pour tester l''installation'
)
RETURNING id;

-- Note: Remplacez [ID] par l'ID retourné ci-dessus

-- 2. Rattacher une direction existante (exemple avec ID 1)
UPDATE public.directions 
SET id_direction_generale = [ID]
WHERE id = 1;

-- 3. Vérifier la relation
SELECT 
    dg.libelle as direction_generale,
    d.libelle as direction,
    m.nom as ministere
FROM direction_generale dg
LEFT JOIN directions d ON d.id_direction_generale = dg.id
LEFT JOIN ministeres m ON dg.id_ministere = m.id
WHERE dg.id = [ID];
```

## ❌ En cas de problème

### Problème : Erreur de permission

```
ERROR: permission denied for table xxx
```

**Solution** :
```sql
GRANT ALL ON TABLE direction_generale TO votre_utilisateur;
GRANT USAGE, SELECT ON SEQUENCE direction_generale_id_seq TO votre_utilisateur;
```

### Problème : La table existe déjà

```
ERROR: relation "direction_generale" already exists
```

**Solution** : La table existe déjà. Utilisez le script de rollback si vous voulez la recréer :
```bash
psql -U postgres -d ma_rh_db -f rollback_direction_generale.sql
psql -U postgres -d ma_rh_db -f create_direction_generale.sql
```

### Problème : Clé étrangère violée

```
ERROR: insert or update on table "direction_generale" violates foreign key constraint
```

**Solution** : Vérifiez que :
- L'`id_ministere` existe dans la table `ministeres`
- Le `directeur_general_id` existe dans la table `agents`

```sql
-- Vérifier les ministères
SELECT id, nom FROM ministeres;

-- Vérifier les agents
SELECT id, nom, prenom FROM agents WHERE id = [ID_AGENT];
```

## 🔄 Annuler l'installation (Rollback)

Si vous devez annuler l'installation :

```bash
psql -U postgres -d ma_rh_db -f rollback_direction_generale.sql
```

⚠️ **ATTENTION** : Cela supprimera :
- La table `direction_generale` et toutes ses données
- La colonne `id_direction_generale` dans `directions`
- La colonne `id_direction_generale` dans `agents`

## 📚 Étapes suivantes

Après l'installation réussie :

1. **Lire la documentation complète** : `DIRECTION_GENERALE_README.md`
2. **Peupler les données** : Créez vos directions générales
3. **Mettre à jour les relations** : Rattachez les directions existantes
4. **Adapter le backend** : Créer les routes API (voir section ci-dessous)
5. **Mettre à jour le frontend** : Créer les interfaces utilisateur

## 🔌 Intégration Backend (Node.js)

Créez un nouveau controller `backend/controllers/directionGeneraleController.js` :

```javascript
const pool = require('../config/database');

// GET - Récupérer toutes les directions générales
exports.getAllDirectionsGenerales = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        dg.*,
        m.nom as ministere_nom,
        a.nom || ' ' || a.prenom as directeur_general_nom
      FROM direction_generale dg
      LEFT JOIN ministeres m ON dg.id_ministere = m.id
      LEFT JOIN agents a ON dg.directeur_general_id = a.id
      WHERE dg.is_active = true
      ORDER BY dg.libelle
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// POST - Créer une nouvelle direction générale
exports.createDirectionGenerale = async (req, res) => {
  const { id_ministere, libelle, code, description, directeur_general_id } = req.body;
  
  try {
    const result = await pool.query(
      `INSERT INTO direction_generale 
       (id_ministere, libelle, code, description, directeur_general_id)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id_ministere, libelle, code, description, directeur_general_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ error: 'Erreur lors de la création' });
  }
};

// ... autres méthodes (GET by ID, PUT, DELETE)
```

Créez la route `backend/routes/directionGenerale.js` :

```javascript
const express = require('express');
const router = express.Router();
const directionGeneraleController = require('../controllers/directionGeneraleController');
const auth = require('../middleware/auth');

router.get('/', auth, directionGeneraleController.getAllDirectionsGenerales);
router.post('/', auth, directionGeneraleController.createDirectionGenerale);
// ... autres routes

module.exports = router;
```

Ajoutez dans `backend/server.js` :

```javascript
const directionGeneraleRoutes = require('./routes/directionGenerale');
app.use('/api/directions-generales', directionGeneraleRoutes);
```

## ✅ Checklist finale

- [ ] Sauvegarde de la base de données effectuée
- [ ] Script `create_direction_generale.sql` exécuté avec succès
- [ ] Script `verify_direction_generale.sql` exécuté sans erreur
- [ ] Test d'insertion réussi
- [ ] Documentation lue
- [ ] Backend mis à jour (optionnel)
- [ ] Frontend mis à jour (optionnel)

## 🆘 Support

En cas de problème :

1. Vérifier les logs PostgreSQL
2. Exécuter le script de vérification
3. Consulter la documentation complète
4. Vérifier que toutes les tables dépendantes existent

## 📞 Contact

Pour toute question ou assistance, consultez :
- `DIRECTION_GENERALE_README.md` - Documentation complète
- Logs PostgreSQL : `/var/log/postgresql/` (Linux) ou `%PROGRAMFILES%\PostgreSQL\[VERSION]\data\log\` (Windows)

---

**Bon déploiement! 🎉**

