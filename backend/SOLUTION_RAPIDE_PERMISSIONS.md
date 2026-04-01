# 🚨 Solution Rapide : Erreur "permission denied for relation agent_conges"

## ⚡ Solution Express (2 minutes)

### Étape 1 : Exécutez ce script sur le serveur de production

```bash
cd backend
node scripts/fix-permissions-production.js
```

Ce script va :
- ✅ Identifier l'utilisateur utilisé par l'application
- ✅ Vérifier que les tables existent
- ✅ Essayer d'accorder les permissions automatiquement
- ✅ Vous donner les commandes SQL exactes si l'accès automatique échoue

---

### Étape 2 : Si le script ne peut pas accorder les permissions automatiquement

Le script vous donnera les commandes SQL exactes à exécuter. **Copiez-collez ces commandes dans phpPgAdmin** :

1. Connectez-vous à phpPgAdmin
2. Sélectionnez votre base de données (`isegroup_tourisme`)
3. Ouvrez l'éditeur SQL
4. **Copiez-collez les commandes GRANT** fournies par le script
5. Exécutez (F5)

---

### Étape 3 : Alternative - Accorder les permissions à TOUS les utilisateurs possibles

Si vous n'êtes pas sûr de l'utilisateur, **exécutez ce script SQL dans phpPgAdmin** :

```sql
-- Ce script accorde les permissions aux utilisateurs les plus probables
-- Exécutez-le en tant que SUPERUSER dans phpPgAdmin

-- Permissions pour isegroup
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE agent_conges TO "isegroup";
GRANT USAGE, SELECT ON SEQUENCE agent_conges_id_seq TO "isegroup";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE jours_feries TO "isegroup";
GRANT USAGE, SELECT ON SEQUENCE jours_feries_id_seq TO "isegroup";
GRANT EXECUTE ON FUNCTION calculer_jours_ouvres(DATE, DATE) TO "isegroup";

-- Permissions pour isegroup_admin
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE agent_conges TO "isegroup_admin";
GRANT USAGE, SELECT ON SEQUENCE agent_conges_id_seq TO "isegroup_admin";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE jours_feries TO "isegroup_admin";
GRANT USAGE, SELECT ON SEQUENCE jours_feries_id_seq TO "isegroup_admin";
GRANT EXECUTE ON FUNCTION calculer_jours_ouvres(DATE, DATE) TO "isegroup_admin";
```

**Ou utilisez le fichier :** `backend/database/ACCORDER_PERMISSIONS_TOUS_UTILISATEURS.sql`

---

## ✅ Vérification finale

Après avoir exécuté les commandes GRANT, **vérifiez** dans phpPgAdmin :

```sql
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name = 'agent_conges'
ORDER BY grantee;
```

Vous devriez voir `isegroup` ou `isegroup_admin` dans la liste avec les permissions SELECT, INSERT, UPDATE, DELETE.

---

## 🔄 Vérifier que tous les agents ont 30 jours de congés

Exécutez cette requête dans phpPgAdmin pour vérifier :

```sql
SELECT 
    COUNT(*) as nombre_agents,
    SUM(jours_alloues) as total_jours_alloues,
    AVG(jours_alloues) as moyenne_jours_alloues
FROM agent_conges
WHERE annee = EXTRACT(YEAR FROM CURRENT_DATE);
```

**Résultat attendu :**
- `nombre_agents` : nombre total d'agents avec congés (ex: 867)
- `total_jours_alloues` : nombre total de jours alloués
- `moyenne_jours_alloues` : doit être 30 (tous les agents ont 30 jours)

Si certains agents n'ont pas de congés, réexécutez :
```bash
cd backend
node scripts/init-systeme-conges.js
```

---

## 📝 Résumé des actions

1. ✅ Exécuter `node scripts/fix-permissions-production.js` pour identifier l'utilisateur
2. ✅ Accorder les permissions via phpPgAdmin avec les commandes GRANT
3. ✅ Vérifier que les permissions sont accordées
4. ✅ Vérifier que tous les agents ont 30 jours de congés
5. ✅ Tester dans l'interface web (recharger la page de l'agent)

---

## 🎯 Test final

Après avoir exécuté toutes les étapes :

1. Rechargez la page de l'agent dans votre navigateur
2. Allez dans "Informations professionnelles"
3. Vérifiez que la section "MES CONGÉS" s'affiche avec :
   - Année : 2025
   - Jours alloués : 30
   - Jours restants : 30 (en grand)

Si tout fonctionne, l'erreur `permission denied` ne devrait plus apparaître dans la console du navigateur.

