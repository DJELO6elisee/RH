# ⚡ Démarrage rapide - Correction des catégories et types d'agents

## 🎯 Ce que vous devez faire

1. **D'abord** : Importer les catégories depuis le CSV (certains agents ont une catégorie dans le CSV mais pas dans la base)
2. **Ensuite** : Attribuer automatiquement le type d'agent (FONCTIONNAIRE ou CONTRACTUEL)

---

## 🚀 Solution la plus simple (4 commandes)

### 1️⃣ Importer les catégories du CSV (mode simulation)

```bash
cd backend/scripts
node importCategoriesFromCSV.js
```

**Résultat :** Affiche quelles catégories seront importées SANS modifier la base

### 2️⃣ Appliquer l'import des catégories

Si la simulation est correcte :

```bash
node importCategoriesFromCSV.js --apply
```

**Résultat :** Importe les catégories manquantes depuis le CSV

### 3️⃣ Mettre à jour les types d'agents (mode simulation)

```bash
node updateAgentTypes.js
```

**Résultat :** Affiche quels types seront assignés SANS modifier la base

### 4️⃣ Appliquer les types d'agents

Si tout est correct :

```bash
node updateAgentTypes.js --apply
```

**Résultat :** Applique les types FONCTIONNAIRE/CONTRACTUEL

---

## ✅ Résultat final attendu

Votre base sera mise à jour :
- **~751 agents** → Type FONCTIONNAIRE (ceux avec catégorie A, B, C ou D)
- **~118 agents** → Type CONTRACTUEL (ceux sans catégorie)

---

## 🔍 Vérification rapide après mise à jour

```bash
psql -U isegroup -d votre_base -c "
SELECT 
    ta.libele as type_agent,
    COUNT(*) as nombre
FROM agents a
LEFT JOIN type_d_agents ta ON a.id_type_d_agent = ta.id
GROUP BY ta.libele
ORDER BY nombre DESC;
"
```

**Résultat attendu :**
```
   type_agent    | nombre
-----------------+--------
 FONCTIONNAIRE   |    740
 CONTRACTUEL     |     89
```

---

## 🆘 En cas de problème

1. **Avant toute modification**, faites une sauvegarde :
   ```bash
   pg_dump -U isegroup votre_base > backup_avant_update.sql
   ```

2. **Pour annuler** (si vous avez utilisé update_agent_types.sql) :
   ```sql
   ROLLBACK;
   ```

3. **Pour restaurer** une sauvegarde :
   ```bash
   psql -U isegroup votre_base < backup_avant_update.sql
   ```

---

## 📚 Documentation complète

Pour plus de détails, consultez : `GUIDE_MISE_A_JOUR_TYPES.md`

