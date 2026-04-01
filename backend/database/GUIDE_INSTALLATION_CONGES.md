# 📋 Guide d'Installation - Système de Gestion des Congés

## ⚠️ IMPORTANT
Ces scripts doivent être exécutés sur le **serveur de production** où se trouve la base de données PostgreSQL accessible via `tourisme.2ise-groupe.com`.

## 🚀 Étapes d'Installation

### Option 1 : Exécution via Script Node.js (Recommandé)

#### Étape 1 : Initialiser le système de gestion des congés
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

#### Étape 2 : Accorder les permissions
```bash
cd backend
node scripts/grant-permissions-conges.js
```

**Ce que fait ce script :**
- ✅ Accorde les permissions SELECT, INSERT, UPDATE, DELETE sur `agent_conges`
- ✅ Accorde les permissions sur les séquences
- ✅ Accorde les permissions EXECUTE sur la fonction `calculer_jours_ouvres()`

---

### Option 2 : Exécution Manuelle via SQL

Si vous préférez exécuter les scripts SQL manuellement :

#### Étape 1 : Créer les tables et fonctions
Exécutez dans cet ordre :
```sql
-- 1. Créer la table des congés
\i backend/database/create_conges_table.sql

-- 2. Créer la table des jours fériés
\i backend/database/create_jours_feries_table.sql

-- 3. Créer la fonction de calcul des jours ouvrés
\i backend/database/create_function_jours_ouvres.sql

-- 4. Initialiser les jours fériés
\i backend/database/init_jours_feries_ci.sql

-- 5. Initialiser les congés des agents
\i backend/database/init_conges_agents.sql
```

#### Étape 2 : Accorder les permissions
```sql
\i backend/database/grant_permissions_conges.sql
```

Ou manuellement (remplacez `votre_utilisateur_db` par votre utilisateur PostgreSQL) :
```sql
-- Permissions sur agent_conges
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE agent_conges TO votre_utilisateur_db;
GRANT USAGE, SELECT ON SEQUENCE agent_conges_id_seq TO votre_utilisateur_db;

-- Permissions sur jours_feries
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE jours_feries TO votre_utilisateur_db;
GRANT USAGE, SELECT ON SEQUENCE jours_feries_id_seq TO votre_utilisateur_db;

-- Permissions sur la fonction
GRANT EXECUTE ON FUNCTION calculer_jours_ouvres(DATE, DATE) TO votre_utilisateur_db;
```

---

## 🔍 Vérification

Après l'installation, vérifiez que tout fonctionne :

```bash
cd backend
node scripts/test-conges-api.js
```

Ce script vérifie :
- ✅ L'existence des tables
- ✅ L'existence de la fonction
- ✅ Les données d'un agent exemple

---

## 📝 Notes Importantes

1. **L'utilisateur PostgreSQL** : Assurez-vous que l'utilisateur configuré dans votre `.env` (DB_USER) a les permissions nécessaires. Si ce n'est pas un superuser, exécutez `grant-permissions-conges.js` avec un compte superuser.

2. **Exécution sur Production** : Ces scripts doivent être exécutés sur le serveur où se trouve la base de données de production, pas uniquement en local.

3. **Données Initiales** : 
   - Tous les agents actifs recevront automatiquement 30 jours de congés pour l'année en cours
   - Les jours fériés de Côte d'Ivoire pour 2025 sont initialisés

4. **Permissions** : Si vous obtenez l'erreur `permission denied for relation agent_conges`, exécutez le script `grant-permissions-conges.js`.

---

## 🆘 Dépannage

### Erreur : `permission denied for relation agent_conges`
**Solution** : Exécutez `node scripts/grant-permissions-conges.js`

### Erreur : `relation "agent_conges" does not exist`
**Solution** : Exécutez `node scripts/init-systeme-conges.js`

### Erreur : `column a.retire does not exist`
**Solution** : Le script a été corrigé pour ne plus utiliser cette colonne. Si l'erreur persiste, vérifiez que vous utilisez la dernière version des scripts.

---

## ✅ Après l'Installation

Une fois les scripts exécutés avec succès :
1. Les agents verront leurs jours de congés dans l'onglet "Informations professionnelles"
2. Le système calculera automatiquement les jours ouvrés (hors weekends et jours fériés)
3. Les jours de congés seront déduits automatiquement lors de la finalisation d'une demande d'absence

