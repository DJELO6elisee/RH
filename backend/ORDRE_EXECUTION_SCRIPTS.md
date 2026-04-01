# 📋 Ordre d'Exécution des Scripts - Système de Gestion des Congés

## ⚠️ IMPORTANT
Ces scripts doivent être exécutés **sur le serveur de production** où se trouve la base de données PostgreSQL accessible via `tourisme.2ise-groupe.com`.

---

## 🚀 ORDRE D'EXÉCUTION COMPLET

### ÉTAPE 1 : Initialiser le système de gestion des congés
**Script :** `backend/scripts/init-systeme-conges.js`

**Commande :**
```bash
cd backend
node scripts/init-systeme-conges.js
```

**Ce que fait ce script :**
- ✅ Crée la table `agent_conges`
- ✅ Crée la table `jours_feries`
- ✅ Crée la fonction `calculer_jours_ouvres()`
- ✅ Initialise les jours fériés de Côte d'Ivoire pour 2025
- ✅ Initialise 30 jours de congés pour tous les agents actifs

**Durée :** ~30 secondes - 2 minutes (selon le nombre d'agents)

---

### ÉTAPE 2 : Accorder les permissions
**Script :** `backend/scripts/grant-permissions-conges.js`  
**OU** Commandes SQL directes dans phpPgAdmin

#### Option A : Via Script Node.js (Recommandé)
**Commande :**
```bash
cd backend
node scripts/grant-permissions-conges.js
```

#### Option B : Via phpPgAdmin (Si le script ne fonctionne pas)
1. Connectez-vous à phpPgAdmin
2. Ouvrez l'éditeur SQL
3. Exécutez ces commandes (remplacez `isegroup` par votre utilisateur si différent) :

```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE agent_conges TO "isegroup";
GRANT USAGE, SELECT ON SEQUENCE agent_conges_id_seq TO "isegroup";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE jours_feries TO "isegroup";
GRANT USAGE, SELECT ON SEQUENCE jours_feries_id_seq TO "isegroup";
GRANT EXECUTE ON FUNCTION calculer_jours_ouvres(DATE, DATE) TO "isegroup";
```

**Ce que fait cette étape :**
- ✅ Donne les permissions nécessaires à l'utilisateur de l'application
- ✅ Résout l'erreur `permission denied for relation agent_conges`

**Durée :** ~5 secondes

---

### ÉTAPE 3 : Vérifier que tout fonctionne (Optionnel mais recommandé)
**Script :** `backend/scripts/test-conges-api.js`

**Commande :**
```bash
cd backend
node scripts/test-conges-api.js
```

**Ce que fait ce script :**
- ✅ Vérifie que les tables existent
- ✅ Vérifie que la fonction existe
- ✅ Vérifie les permissions
- ✅ Teste les données d'un agent exemple

**Durée :** ~10 secondes

---

## 📝 RÉSUMÉ RAPIDE

### Sur le serveur de production, exécutez dans cet ordre :

```bash
# 1. Aller dans le répertoire backend
cd /chemin/vers/votre/projet/backend

# 2. Initialiser le système de congés
node scripts/init-systeme-conges.js

# 3. Accorder les permissions
node scripts/grant-permissions-conges.js

# 4. Vérifier (optionnel)
node scripts/test-conges-api.js
```

**OU** si le script de permissions ne fonctionne pas, utilisez phpPgAdmin pour exécuter les commandes SQL de l'Étape 2.

---

## 🔄 Si vous devez réexécuter

### Réinitialiser les tables (⚠️ Supprime les données existantes)
```bash
# Dans psql ou phpPgAdmin, exécutez :
DROP TABLE IF EXISTS agent_conges CASCADE;
DROP TABLE IF EXISTS jours_feries CASCADE;
DROP FUNCTION IF EXISTS calculer_jours_ouvres(DATE, DATE) CASCADE;

# Puis réexécutez l'ÉTAPE 1
```

### Réinitialiser uniquement les congés des agents (conserve les tables)
```bash
# Supprimer uniquement les données de congés
TRUNCATE TABLE agent_conges;

# Puis réexécutez l'ÉTAPE 1 (ou utilisez uniquement init_conges_agents.sql)
```

---

## ⚠️ NOTES IMPORTANTES

1. **Ordre obligatoire** : L'Étape 1 doit être exécutée AVANT l'Étape 2
   - Les tables doivent exister avant d'accorder les permissions

2. **Permissions SUPERUSER** : L'Étape 2 nécessite des permissions SUPERUSER (généralement l'utilisateur `postgres`)

3. **Base de données** : Assurez-vous d'être connecté à la BONNE base de données (généralement `isegroup_tourisme`)

4. **Utilisateur de l'application** : Si vous utilisez phpPgAdmin pour l'Étape 2, vous devez connaître l'utilisateur utilisé par votre application (trouvable dans `.env` -> `DB_USER`)

---

## 🆘 DÉPANNAGE

### Erreur : "relation agent_conges does not exist"
**Solution :** Exécutez l'Étape 1 d'abord

### Erreur : "permission denied for relation agent_conges"
**Solution :** Exécutez l'Étape 2 (Accorder les permissions)

### Erreur : "role does not exist" lors de l'attribution des permissions
**Solution :** Vérifiez le nom de l'utilisateur avec :
```sql
SELECT rolname FROM pg_roles WHERE rolcanlogin = true ORDER BY rolname;
```

### Erreur : "permission denied" lors de l'exécution des commandes GRANT
**Solution :** Connectez-vous à PostgreSQL avec un compte SUPERUSER (généralement `postgres`)

---

## ✅ Après l'exécution

Une fois les scripts exécutés avec succès :
1. ✅ Les agents verront leurs jours de congés dans l'onglet "Informations professionnelles"
2. ✅ Le système calculera automatiquement les jours ouvrés (hors weekends et jours fériés)
3. ✅ Les jours de congés seront déduits automatiquement lors de la finalisation d'une demande d'absence

**Test final :** Rechargez la page de l'agent dans l'interface web et vérifiez que la section "MES CONGÉS" s'affiche correctement.

