# 📋 Guide d'installation - Système de gestion des congés

## 🚀 Ordre d'exécution des scripts SQL

Vous devez exécuter **3 scripts SQL** dans l'ordre suivant :

### Étape 1 : Créer la table des congés
```sql
-- Exécuter : backend/database/create_conges_table.sql
```
**Ce que fait ce script :**
- Crée la table `agent_conges` pour stocker les congés des agents
- Crée les index pour améliorer les performances
- Crée le trigger pour mettre à jour automatiquement `updated_at`

### Étape 2 : Créer la table des jours fériés
```sql
-- Exécuter : backend/database/create_jours_feries_table.sql
```
**Ce que fait ce script :**
- Crée la table `jours_feries` pour stocker les jours fériés de Côte d'Ivoire
- Crée les index pour améliorer les performances
- Crée le trigger pour mettre à jour automatiquement `updated_at`

### Étape 3 : Créer la fonction de calcul des jours ouvrés
```sql
-- Exécuter : backend/database/create_function_jours_ouvres.sql
```
**Ce que fait ce script :**
- Crée la fonction `calculer_jours_ouvres()` qui exclut les weekends (samedi et dimanche) et les jours fériés

### Étape 4 : Initialiser les jours fériés
```sql
-- Exécuter : backend/database/init_jours_feries_ci.sql
```
**Ce que fait ce script :**
- Insère les jours fériés de Côte d'Ivoire pour l'année 2025
- Jours fixes : 1er janvier, 1er mai, 7 juillet, 15 août, 1er novembre, 25 décembre
- Jours mobiles : Pâques, Lundi de Pâques, Ascension, Lundi de Pentecôte

### Étape 5 : Initialiser les congés de tous les agents
```sql
-- Exécuter : backend/database/init_conges_agents.sql
```
**Ce que fait ce script :**
- Initialise 30 jours de congés pour tous les agents actifs de l'année en cours
- 0 jour pris au début
- 30 jours restants

## 📝 Résumé de l'ordre d'exécution

1. ✅ `create_conges_table.sql` - Créer la table des congés
2. ✅ `create_jours_feries_table.sql` - Créer la table des jours fériés
3. ✅ `create_function_jours_ouvres.sql` - Créer la fonction de calcul
4. ✅ `init_jours_feries_ci.sql` - Initialiser les jours fériés de 2025
5. ✅ `init_conges_agents.sql` - Initialiser les congés de tous les agents

## ⚠️ Important

- L'ordre d'exécution est **crucial**
- La fonction de calcul nécessite la table `jours_feries` (créée à l'étape 2)
- L'initialisation des congés nécessite la table `agent_conges` (créée à l'étape 1)

## 🔄 Pour les années suivantes

- Les jours fériés mobiles (Pâques, Ascension, Pentecôte) doivent être mis à jour chaque année
- Les jours de congés restants de l'année précédente sont automatiquement reportés à l'année suivante

