# ⚠️ CORRECTION URGENTE - Catégories et Types d'agents

## 🚨 Problème détecté

Vous avez déjà mis à jour les types d'agents, MAIS certains agents ont une catégorie dans le CSV qui n'a pas été importée dans la base de données.

**Conséquence :** Certains agents ont été classés CONTRACTUELS alors qu'ils devraient être FONCTIONNAIRES.

---

## ✅ Solution en 3 commandes (RAPIDE)

### 1️⃣ Importer les catégories manquantes

```bash
cd backend/scripts
node importCategoriesFromCSV.js --apply
```

**Ce que fait cette commande :**
- Lit le fichier CSV `Liste-du-Personel-_1_.csv`
- Trouve tous les agents avec une catégorie (A, B, C, D)
- Met à jour leur catégorie dans la base de données

**Résultat attendu :**
- ~740 agents auront leur catégorie correcte

---

### 2️⃣ Re-mettre à jour les types d'agents

```bash
node updateAgentTypes.js --apply
```

**Ce que fait cette commande :**
- Met à jour les agents avec catégorie → FONCTIONNAIRE
- Met à jour les agents sans catégorie → CONTRACTUEL

**Résultat attendu :**
- ~751 FONCTIONNAIRES (avec catégorie)
- ~118 CONTRACTUELS (sans catégorie)

---

### 3️⃣ Vérifier qu'il n'y a plus d'incohérences

```bash
psql -U isegroup -d votre_base -c "
SELECT 
    'Agents avec catégorie mais CONTRACTUEL' as erreur,
    COUNT(*) as nombre
FROM agents
WHERE id_categorie IN (5, 6, 8, 9)
  AND id_type_d_agent IN (2, 16, 17);
"
```

**Résultat attendu :** `nombre = 0` ✅

---

## 📊 Détails de la correction

### Mapping des catégories

| Catégorie CSV | ID en base | Libellé |
|---------------|------------|---------|
| A | 5 | A |
| B | 6 | B |
| C | 9 | C |
| D | 8 | D |

### Règle finale

| Si l'agent a... | Alors son type sera... |
|-----------------|------------------------|
| Catégorie A, B, C ou D | **FONCTIONNAIRE** (id=1) |
| Aucune catégorie | **CONTRACTUEL** (id=2) |

---

## 🔄 Alternative : Script SQL tout-en-un

Si vous préférez générer et exécuter un script SQL :

```bash
# 1. Générer le script SQL complet
node generateUpdateCategoriesSQL.js

# 2. Exécuter le script
psql -U isegroup -d votre_base -f update_categories_from_csv.sql

# 3. Valider dans psql
COMMIT;

# 4. Re-mettre à jour les types
psql -U isegroup -d votre_base -f update_types_simple.sql
```

---

## 📈 Statistiques attendues après correction

```
AVANT CORRECTION :
  FONCTIONNAIRE : 751
  CONTRACTUEL : 117
  (mais certains CONTRACTUELS devraient être FONCTIONNAIRES)

APRÈS CORRECTION :
  FONCTIONNAIRE : ~751 (ou plus si des catégories étaient manquantes)
  CONTRACTUEL : ~118 (ou moins)
  
  Total : 869
  Incohérences : 0
```

---

## ⏱️ Temps estimé

- Import des catégories : ~30 secondes
- Mise à jour des types : ~10 secondes
- Vérification : ~5 secondes

**Total : < 1 minute**

---

## 🎯 Action immédiate

**Exécutez maintenant :**

```bash
cd backend/scripts
node importCategoriesFromCSV.js --apply
node updateAgentTypes.js --apply
```

Puis vérifiez qu'il n'y a plus d'erreurs ! ✅

