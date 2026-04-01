# 📋 Guide de Restructuration de la Hiérarchie Organisationnelle

## 🎯 Objectif

Ce guide vous aide à restructurer votre application RH pour gérer correctement la hiérarchie complète :

```
Ministère
    └── Direction Générale (DG)
            └── Direction
                    └── Sous-Direction
                            └── Service
```

## 📊 Structure des Codes DIR/SER

Les codes DIR/SER suivent cette logique :
- `47 05 00 00 00 00` - Niveau Ministère/Cabinet (6 segments, 4 paires de 00)
- `47 10 05 00 00 00` - Niveau Direction Générale (3 paires de 00)
- `47 05 15 00 00 00` - Niveau Direction (2 paires de 00)
- `47 05 15 05 00 00` - Niveau Sous-Direction (1 paire de 00)
- `47 05 25 00 05 00` - Niveau Service (aucune paire de 00 consécutive)

## 🗂️ Directions Générales Identifiées

Les directions générales sont extraites de la colonne **"Fonction"** des agents :

1. **DG INDUSTRIE TOURISTIQUE ET HOTELIERE** (code: DG ITH)
   - Code DIR/SER: `47 10 05 00 00 00`
   - Directions rattachées:
     - Direction des Activités Touristiques
     - Direction Coopération et Professionnalisation
     - Direction des Services Extérieurs

2. **DIRECTION GENERALE DES LOISIRS** (code: DG LOISIRS)
   - Code DIR/SER: `47 10 10 00 00 00`
   - Directions rattachées:
     - Direction Parcs de Loisirs, Attractions, Jeux Numériques
     - Direction Valorisation, Formation & Promotion Jeux Traditionnels

## 📁 Fichiers SQL Créés

| Fichier | Description | Ordre d'exécution |
|---------|-------------|-------------------|
| `restructure_hierarchie_complete.sql` | Crée toutes les tables de la hiérarchie | 1️⃣ |
| `import_hierarchie_from_csv.sql` | Importe les données des codes DIR/SER | 2️⃣ |
| `update_agents_from_csv.sql` | Met à jour les affectations des agents | 3️⃣ |

## 🚀 Installation

### Méthode 1: Exécution manuelle (PostgreSQL)

```bash
# 1. Se connecter à la base de données
psql -U postgres -d ma_rh_db

# 2. Exécuter les scripts dans l'ordre
\i backend/database/restructure_hierarchie_complete.sql
\i backend/database/import_hierarchie_from_csv.sql
\i backend/database/update_agents_from_csv.sql
```

### Méthode 2: Exécution via fichier batch (Windows)

```powershell
# Créer un fichier execute_restructuration.bat
cd backend\database
psql -U postgres -d ma_rh_db -f restructure_hierarchie_complete.sql
psql -U postgres -d ma_rh_db -f import_hierarchie_from_csv.sql
psql -U postgres -d ma_rh_db -f update_agents_from_csv.sql
pause
```

### Méthode 3: Exécution via Node.js (recommandé)

Utilisez le script `execute_restructuration.js` :

```bash
node backend/database/execute_restructuration.js
```

## 📋 Vérification Post-Installation

Après l'exécution, vérifiez que tout s'est bien passé :

```sql
-- 1. Vérifier le nombre d'enregistrements
SELECT 
    (SELECT COUNT(*) FROM direction_generale) as nb_dg,
    (SELECT COUNT(*) FROM directions) as nb_directions,
    (SELECT COUNT(*) FROM sous_directions) as nb_sous_directions,
    (SELECT COUNT(*) FROM services) as nb_services;

-- 2. Visualiser la hiérarchie complète
SELECT * FROM v_hierarchie_complete LIMIT 20;

-- 3. Vérifier les agents avec affectations
SELECT 
    COUNT(*) as total_agents,
    COUNT(id_direction_generale) as avec_dg,
    COUNT(id_direction) as avec_direction,
    COUNT(id_sous_direction) as avec_sous_direction,
    COUNT(id_service) as avec_service
FROM agents;

-- 4. Afficher la hiérarchie d'une direction générale
SELECT 
    dg.libelle as "Direction Générale",
    d.libelle as "Direction",
    COUNT(DISTINCT sd.id) as "Nb Sous-Directions",
    COUNT(DISTINCT s.id) as "Nb Services"
FROM direction_generale dg
LEFT JOIN directions d ON d.id_direction_generale = dg.id
LEFT JOIN sous_directions sd ON sd.id_direction = d.id
LEFT JOIN services s ON s.id_sous_direction = sd.id
WHERE dg.code = 'DG ITH'
GROUP BY dg.libelle, d.libelle;
```

## 📊 Résultats Attendus

Après exécution, vous devriez avoir :

- ✅ **2 Directions Générales** créées
- ✅ **16 Directions** importées
- ✅ **40+ Sous-Directions** importées
- ✅ **Services** rattachés aux sous-directions
- ✅ **Agents** affectés à leur hiérarchie respective

## 🔄 Migration des Données Existantes

Si vous avez déjà des données dans d'anciennes tables :

### Option 1: Conserver les anciennes tables

```sql
-- Renommer les anciennes tables
ALTER TABLE directions RENAME TO directions_old;
ALTER TABLE services RENAME TO services_old;

-- Puis exécuter les scripts de restructuration

-- Migrer les données
INSERT INTO directions (libelle, id_ministere, description)
SELECT libelle, id_ministere, description
FROM directions_old
WHERE libelle NOT IN (SELECT libelle FROM directions);
```

### Option 2: Nettoyer et recommencer

```sql
-- ⚠️ ATTENTION: Cette opération supprime toutes les données !
DROP TABLE IF EXISTS services CASCADE;
DROP TABLE IF EXISTS sous_directions CASCADE;
DROP TABLE IF EXISTS directions CASCADE;
DROP TABLE IF EXISTS direction_generale CASCADE;

-- Puis exécuter les scripts de restructuration
```

## 🎨 Utilisation dans l'Application

### Controller Backend

Les controllers suivants ont été créés/mis à jour :

- `directionGeneraleController.js` - Gestion des directions générales
- `DirectionsController.js` - Gestion des directions
- `SousDirectionsController.js` - Gestion des sous-directions
- `ServicesController.js` - Gestion des services

### Routes API

```javascript
// Directions Générales
GET    /api/directions-generales
GET    /api/directions-generales/:id
POST   /api/directions-generales
PUT    /api/directions-generales/:id
DELETE /api/directions-generales/:id

// Directions
GET    /api/directions
GET    /api/directions/direction-generale/:id
...

// Sous-Directions
GET    /api/sous-directions
GET    /api/sous-directions/direction/:id
...

// Services
GET    /api/services
GET    /api/services/sous-direction/:id
...
```

### Exemple de Requête Frontend

```javascript
// Récupérer la hiérarchie complète
const response = await fetch('/api/hierarchie/complete');
const hierarchie = await response.json();

// Récupérer les directions d'une DG
const dg_id = 1;
const directionsResponse = await fetch(`/api/directions/direction-generale/${dg_id}`);
const directions = await directionsResponse.json();
```

## 🛠️ Maintenance

### Ajouter une nouvelle Direction Générale

```sql
INSERT INTO direction_generale (id_ministere, code, libelle, description)
VALUES (
    1,
    'DG NOUVELLE',
    'Direction Générale Nouvelle',
    'Description de la nouvelle DG'
);
```

### Rattacher une Direction à une DG

```sql
UPDATE directions 
SET id_direction_generale = (SELECT id FROM direction_generale WHERE code = 'DG ITH')
WHERE code = '47 10 05 05 00 00';
```

### Affecter un Agent à une Sous-Direction

```sql
UPDATE agents 
SET id_sous_direction = (SELECT id FROM sous_directions WHERE code = '47 05 25 05 00 00')
WHERE matricule = '123456A';
```

## 📝 Notes Importantes

1. **Codes DIR/SER**: Les codes sont conservés pour traçabilité et référencement
2. **Relations en cascade**: Suppression d'un ministère → supprime ses DG → supprime leurs directions
3. **Relations SET NULL**: Suppression d'un agent responsable → le champ devient NULL
4. **Vues automatiques**: La vue `v_hierarchie_complete` est mise à jour automatiquement
5. **Triggers**: Les champs `updated_at` sont mis à jour automatiquement

## 🆘 Dépannage

### Erreur: "relation does not exist"

```sql
-- Vérifier que les tables existent
SELECT tablename FROM pg_tables WHERE schemaname = 'public' 
AND tablename IN ('direction_generale', 'directions', 'sous_directions', 'services');
```

### Erreur: "column does not exist" dans agents

```sql
-- Ajouter les colonnes manquantes manuellement
ALTER TABLE agents ADD COLUMN IF NOT EXISTS id_direction_generale INTEGER;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS id_direction INTEGER;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS id_sous_direction INTEGER;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS id_service INTEGER;
```

### Performances lentes

```sql
-- Reconstruire les index
REINDEX TABLE direction_generale;
REINDEX TABLE directions;
REINDEX TABLE sous_directions;
REINDEX TABLE services;

-- Mettre à jour les statistiques
ANALYZE direction_generale;
ANALYZE directions;
ANALYZE sous_directions;
ANALYZE services;
```

## 📞 Support

Pour toute question ou problème :
1. Consultez les commentaires dans les fichiers SQL
2. Vérifiez les logs PostgreSQL
3. Consultez la documentation PostgreSQL

---

**Date de création** : Novembre 2025  
**Version** : 1.0  
**Auteur** : Assistant IA




















