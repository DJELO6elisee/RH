# Table Direction Générale - Documentation

## 📋 Vue d'ensemble

La table `direction_generale` a été créée pour représenter les directions générales au sein des ministères. Elle établit une hiérarchie organisationnelle entre les ministères, les directions générales, les directions et les agents.

## 🏗️ Structure de la table

### Champs principaux

| Champ | Type | Description | Obligatoire |
|-------|------|-------------|-------------|
| `id` | integer | Identifiant unique (auto-incrémenté) | Oui |
| `id_ministere` | integer | Référence au ministère de tutelle | Oui |
| `libelle` | varchar(200) | Nom de la direction générale | Oui |
| `directeur_general_id` | integer | Référence à l'agent directeur général | Non |
| `description` | text | Description détaillée | Non |
| `code` | varchar(20) | Code ou sigle (ex: DGRH) | Non |
| `adresse` | text | Adresse physique | Non |
| `telephone` | varchar(20) | Numéro de téléphone | Non |
| `email` | varchar(255) | Adresse email | Non |
| `is_active` | boolean | Statut actif/inactif | Oui (défaut: true) |
| `created_at` | timestamp | Date de création | Auto |
| `updated_at` | timestamp | Date de dernière modification | Auto |

## 🔗 Relations avec les autres tables

### 1. Relation avec `ministeres`
- **Type**: Many-to-One (plusieurs directions générales → un ministère)
- **Clé étrangère**: `id_ministere` → `ministeres.id`
- **Action**: CASCADE (suppression en cascade)

### 2. Relation avec `agents` (Directeur général)
- **Type**: Many-to-One (plusieurs directions générales → un agent)
- **Clé étrangère**: `directeur_general_id` → `agents.id`
- **Action**: SET NULL (si l'agent est supprimé, le champ devient NULL)

### 3. Relation avec `directions`
- **Type**: One-to-Many (une direction générale → plusieurs directions)
- **Nouvelle colonne ajoutée**: `directions.id_direction_generale`
- **Clé étrangère**: `directions.id_direction_generale` → `direction_generale.id`
- **Action**: SET NULL (si la direction générale est supprimée)

### 4. Relation avec `agents` (Affectation)
- **Type**: One-to-Many (une direction générale → plusieurs agents)
- **Nouvelle colonne ajoutée**: `agents.id_direction_generale`
- **Clé étrangère**: `agents.id_direction_generale` → `direction_generale.id`
- **Action**: SET NULL (si la direction générale est supprimée)

## 📊 Hiérarchie organisationnelle

```
Ministère
    └── Direction Générale (NOUVELLE)
            ├── Directions
            │       └── Sous-directions
            └── Agents affectés
```

## 🚀 Installation

### Exécuter le script SQL

```bash
# Depuis PostgreSQL
psql -U postgres -d ma_rh_db -f backend/database/create_direction_generale.sql

# Ou depuis la ligne de commande Windows
psql -U postgres -d ma_rh_db -f "backend\database\create_direction_generale.sql"
```

## 💡 Exemples d'utilisation

### 1. Créer une direction générale

```sql
INSERT INTO public.direction_generale (id_ministere, libelle, code, description)
VALUES (
    1, 
    'Direction Générale des Ressources Humaines', 
    'DGRH', 
    'Gestion stratégique des ressources humaines du ministère'
);
```

### 2. Affecter un directeur général

```sql
UPDATE public.direction_generale 
SET directeur_general_id = 123
WHERE id = 1;
```

### 3. Rattacher une direction à une direction générale

```sql
UPDATE public.directions 
SET id_direction_generale = 1
WHERE id = 5;
```

### 4. Affecter un agent à une direction générale

```sql
UPDATE public.agents 
SET id_direction_generale = 1
WHERE id = 456;
```

### 5. Récupérer toutes les directions d'une direction générale

```sql
SELECT d.* 
FROM public.directions d
WHERE d.id_direction_generale = 1
AND d.is_active = true;
```

### 6. Récupérer la hiérarchie complète

```sql
SELECT 
    m.nom as ministere,
    dg.libelle as direction_generale,
    dg.code,
    a.nom || ' ' || a.prenom as directeur_general,
    COUNT(DISTINCT d.id) as nombre_directions,
    COUNT(DISTINCT ag.id) as nombre_agents
FROM public.direction_generale dg
INNER JOIN public.ministeres m ON dg.id_ministere = m.id
LEFT JOIN public.agents a ON dg.directeur_general_id = a.id
LEFT JOIN public.directions d ON d.id_direction_generale = dg.id
LEFT JOIN public.agents ag ON ag.id_direction_generale = dg.id
WHERE dg.is_active = true
GROUP BY m.nom, dg.libelle, dg.code, a.nom, a.prenom
ORDER BY m.nom, dg.libelle;
```

### 7. Trouver tous les agents d'une direction générale (incluant les directions)

```sql
-- Agents directement affectés à la direction générale
SELECT a.* 
FROM public.agents a
WHERE a.id_direction_generale = 1

UNION

-- Agents affectés via les entités liées aux directions de cette direction générale
SELECT DISTINCT a.*
FROM public.agents a
INNER JOIN public.agents_entites ae ON a.id = ae.id_agent
INNER JOIN public.directions d ON d.id = ae.id_entite
WHERE d.id_direction_generale = 1;
```

## 🔧 Modifications apportées aux tables existantes

### Table `directions`
- **Nouvelle colonne**: `id_direction_generale` (integer, nullable)
- Permet de rattacher chaque direction à une direction générale

### Table `agents`
- **Nouvelle colonne**: `id_direction_generale` (integer, nullable)
- Permet d'affecter directement un agent à une direction générale

## 📈 Index créés (pour optimiser les performances)

1. `idx_direction_generale_ministere` - Sur `id_ministere`
2. `idx_direction_generale_directeur` - Sur `directeur_general_id`
3. `idx_direction_generale_active` - Sur `is_active`
4. `idx_directions_direction_generale` - Sur `directions.id_direction_generale`
5. `idx_agents_direction_generale` - Sur `agents.id_direction_generale`

## 🔄 Trigger automatique

Un trigger `trigger_update_direction_generale_updated_at` met automatiquement à jour le champ `updated_at` lors de chaque modification.

## ⚠️ Points importants

1. **Cascade de suppression**: Si un ministère est supprimé, toutes ses directions générales seront également supprimées
2. **Protection des agents**: Si un agent (directeur général) est supprimé, le champ `directeur_general_id` devient NULL
3. **Hiérarchie flexible**: Une direction peut exister sans direction générale (champ nullable)
4. **Double affectation**: Un agent peut être affecté directement à une direction générale ET à une entité/direction spécifique

## 🎯 Cas d'usage

### Organigramme ministériel
Utilisez cette table pour représenter l'organigramme complet:
- Ministère → Directions Générales → Directions → Sous-directions → Services

### Reporting hiérarchique
Générez des rapports par direction générale pour suivre:
- Effectifs
- Budget
- Performance
- Projets

### Gestion des permissions
Attribuez des permissions par direction générale pour contrôler l'accès aux données.

## 📝 Notes de migration

Si vous avez déjà des données dans la table `directions`, vous devrez peut-être:

1. Identifier quelles directions appartiennent à quelles directions générales
2. Créer les directions générales appropriées
3. Mettre à jour les champs `id_direction_generale` dans la table `directions`

```sql
-- Exemple de migration
-- 1. Créer les directions générales
INSERT INTO direction_generale (id_ministere, libelle, code) VALUES (1, 'DG Admin', 'DGA');

-- 2. Mettre à jour les directions existantes
UPDATE directions SET id_direction_generale = 1 WHERE libelle LIKE '%Administration%';
```

## 🆘 Support

Pour toute question ou problème, consultez:
- La documentation principale du projet
- Les fichiers SQL dans `backend/database/`
- Les commentaires dans le code SQL

---
**Date de création**: $(date)
**Version**: 1.0

