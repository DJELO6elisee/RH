# ✅ Vérification après exécution des scripts

## 🔍 Étape 1 : Vérifier que les scripts ont fonctionné

Exécutez ce script pour vérifier que tout est en place :

```bash
cd backend
node scripts/test-conges-api.js
```

Ce script devrait afficher :
- ✅ Table agent_conges existe
- ✅ Table jours_feries existe
- ✅ Fonction calculer_jours_ouvres existe
- ✅ Nombre d'agents avec congés
- ✅ Test d'accès réussi

---

## 🌐 Étape 2 : Tester dans l'interface web

1. **Connectez-vous à l'interface agent** :
   - Allez sur `https://tourisme.2ise-groupe.com`
   - Connectez-vous avec un compte agent

2. **Allez dans l'onglet "Informations professionnelles"** :
   - Dans le menu latéral, cliquez sur "Informations professionnelles"

3. **Vérifiez que la section "MES CONGÉS" s'affiche** :
   - Vous devriez voir :
     - Année (2025)
     - Jours alloués (30 ou plus si des jours ont été reportés)
     - Jours pris (0 normalement)
     - **Jours restants** (mis en évidence)
     - Une note indiquant que les weekends et jours fériés ne sont pas comptabilisés

---

## 🔍 Étape 3 : Vérifier les logs du navigateur

Ouvrez la console du navigateur (F12) et vérifiez qu'il n'y a **plus d'erreur** :
- ❌ Plus d'erreur `permission denied for relation agent_conges`
- ✅ La requête `GET /api/conges/current-year` retourne 200 OK (pas 500)

---

## 📊 Étape 4 : Vérifier dans la base de données (Optionnel)

Si vous avez accès à phpPgAdmin, exécutez cette requête pour vérifier :

```sql
-- Vérifier qu'un agent a des congés
SELECT 
    id_agent,
    annee,
    jours_alloues,
    jours_pris,
    jours_restants
FROM agent_conges
WHERE annee = EXTRACT(YEAR FROM CURRENT_DATE)
LIMIT 5;

-- Vérifier les permissions
SELECT 
    grantee,
    privilege_type
FROM information_schema.role_table_grants 
WHERE table_name = 'agent_conges'
ORDER BY grantee;
```

---

## ✅ Résultat attendu

### Dans l'interface agent, vous devriez voir :

**Section "MES CONGÉS"** :
```
┌─────────────────────────────────────┐
│         MES CONGÉS                  │
├─────────────────────────────────────┤
│                                     │
│  [2025]  [30 jours]  [0 pris]  [30]│
│          alloués            restants│
│                                     │
│  ℹ️ Note importante :               │
│  Les jours de congés sont calculés  │
│  en jours ouvrés. Les weekends      │
│  (samedis et dimanches) ainsi que   │
│  les jours fériés ne sont pas       │
│  comptabilisés.                     │
└─────────────────────────────────────┘
```

### Dans la console du navigateur :
- ✅ Plus d'erreur 500
- ✅ `GET /api/conges/current-year` retourne 200 OK
- ✅ Les données de congés sont chargées

---

## 🆘 Si cela ne fonctionne toujours pas

### Erreur persiste : "permission denied"

1. Vérifiez que vous avez bien exécuté l'ÉTAPE 2 (Accorder les permissions)
2. Vérifiez que vous avez utilisé le BON nom d'utilisateur
3. Exécutez dans phpPgAdmin :
```sql
SELECT grantee FROM information_schema.role_table_grants 
WHERE table_name = 'agent_conges';
```
   Vérifiez que votre utilisateur apparaît dans la liste

### Les tables n'existent pas

1. Vérifiez que vous avez bien exécuté l'ÉTAPE 1 (Initialiser le système)
2. Exécutez dans phpPgAdmin :
```sql
SELECT tablename FROM pg_tables 
WHERE tablename IN ('agent_conges', 'jours_feries');
```
   Si les tables n'existent pas, réexécutez l'ÉTAPE 1

### Aucune donnée de congés

1. Vérifiez que les agents ont bien été initialisés :
```sql
SELECT COUNT(*) FROM agent_conges 
WHERE annee = EXTRACT(YEAR FROM CURRENT_DATE);
```
   Si le résultat est 0, réexécutez l'ÉTAPE 1

---

## 🎉 Si tout fonctionne

Félicitations ! Le système de gestion des congés est maintenant opérationnel :

- ✅ Les agents peuvent voir leurs jours de congés restants
- ✅ Le système calcule automatiquement les jours ouvrés (hors weekends et jours fériés)
- ✅ Les jours de congés seront déduits automatiquement lors de la finalisation d'une demande d'absence

