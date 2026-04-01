# 📘 Procédure complète de correction des types d'agents

## 🎯 Problème identifié

Dans votre base de données, certains agents ont une catégorie dans le CSV mais pas dans la base. Il faut donc :

1. **D'abord** : Importer les catégories manquantes depuis le CSV
2. **Ensuite** : Mettre à jour les types d'agents selon leur catégorie

---

## ⚡ Solution rapide en 2 étapes

### ÉTAPE 1 : Importer les catégories depuis le CSV

#### Option A : Script Node.js (RECOMMANDÉ)

```bash
cd backend/scripts

# Simulation (voir ce qui sera importé)
node importCategoriesFromCSV.js

# Application réelle
node importCategoriesFromCSV.js --apply
```

#### Option B : Générer puis exécuter un script SQL

```bash
cd backend/scripts

# Générer le script SQL
node generateUpdateCategoriesSQL.js

# Exécuter le script généré
psql -U isegroup -d votre_base -f update_categories_from_csv.sql

# Puis dans psql, valider :
COMMIT;
```

---

### ÉTAPE 2 : Mettre à jour les types d'agents

Maintenant que toutes les catégories sont importées :

```bash
# Simulation
node updateAgentTypes.js

# Application
node updateAgentTypes.js --apply
```

---

## 📊 Résultats attendus

### Après ÉTAPE 1 (Import des catégories)

Tous les agents du CSV avec une catégorie auront leur catégorie dans la base :
- Catégorie A : ~280 agents
- Catégorie B : ~387 agents
- Catégorie C : ~54 agents
- Catégorie D : ~30 agents
- Sans catégorie : ~118 agents

### Après ÉTAPE 2 (Mise à jour des types)

Tous les agents auront le bon type :
- **FONCTIONNAIRE** : ~751 agents (ceux avec catégorie)
- **CONTRACTUEL** : ~118 agents (ceux sans catégorie)

---

## ⚠️ Note importante

**Vous avez déjà exécuté l'ÉTAPE 2**, mais l'ÉTAPE 1 n'avait pas été faite avant !

### Ce qui s'est passé :
- Vous aviez 28 fonctionnaires → 751 fonctionnaires
- Vous aviez 10 contractuels → 117 contractuels
- Vous aviez 829 sans type → 0 sans type

### Le problème :
Certains agents ont été classés CONTRACTUELS alors qu'ils ont une catégorie dans le CSV (donc devraient être FONCTIONNAIRES).

---

## 🔧 Solution de correction

Vous devez maintenant :

### 1️⃣ Importer les catégories manquantes

```bash
node importCategoriesFromCSV.js --apply
```

### 2️⃣ Re-mettre à jour les types d'agents

```bash
node updateAgentTypes.js --apply
```

Cela corrigera les agents qui ont été classés CONTRACTUELS par erreur.

---

## 🔍 Vérification après correction

Après avoir exécuté les 2 étapes, vérifiez :

```sql
-- Agents avec catégorie qui sont CONTRACTUELS (devrait être 0)
SELECT COUNT(*) as erreur
FROM agents
WHERE id_categorie IN (5, 6, 8, 9)
  AND id_type_d_agent = 2;

-- Devrait retourner 0
```

Si le résultat est > 0, cela signifie qu'il y a encore des incohérences.

---

## 📋 Checklist de correction

- [ ] Sauvegarde de la base effectuée
- [ ] **ÉTAPE 1** : Import des catégories depuis le CSV
- [ ] Vérification : Nombre de catégories A, B, C, D correct
- [ ] **ÉTAPE 2** : Mise à jour des types d'agents
- [ ] Vérification finale : Aucune incohérence catégorie/type
- [ ] Test : Création d'un agent non-fonctionnaire
- [ ] Validation : Matricule auto-généré fonctionne

---

## 🆘 En cas de problème

Si vous avez besoin de repartir de zéro :

```sql
-- Réinitialiser tous les types
UPDATE agents SET id_type_d_agent = NULL;

-- Puis relancer la procédure complète
```

---

**Date** : 2025-11-06  
**Version** : 2.0 (avec correction)

