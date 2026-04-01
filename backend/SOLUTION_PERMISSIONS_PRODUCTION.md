# 🔧 Solution : Erreur "permission denied for relation agent_conges"

## ❌ Problème
Vous obtenez l'erreur :
```
permission denied for relation agent_conges
```

Cela signifie que l'utilisateur PostgreSQL utilisé par votre application sur le serveur de production **n'a pas les permissions** sur les tables `agent_conges` et `jours_feries`.

## 🔍 Étape 1 : Identifier l'utilisateur de la production

### Option A : Via le script Node.js (sur le serveur de production)
```bash
# Connectez-vous au serveur de production
ssh votre_serveur

# Allez dans le répertoire du projet
cd /chemin/vers/votre/projet/backend

# Exécutez le script pour identifier l'utilisateur
node scripts/find-db-user.js
```

Ce script affichera :
- L'utilisateur configuré dans `.env`
- L'utilisateur actuel de la connexion
- Les permissions actuelles

### Option B : Via le fichier .env
Regardez le fichier `.env` sur le serveur de production :
```bash
cat backend/.env | grep DB_USER
```

Vous verrez quelque chose comme :
```
DB_USER=votre_utilisateur_db
```

## 🔧 Étape 2 : Accorder les permissions

### Option A : Via psql (Recommandé)

1. **Connectez-vous à PostgreSQL en tant que SUPERUSER** :
```bash
sudo -u postgres psql votre_base_de_donnees
```

Ou si vous avez un mot de passe :
```bash
psql -U postgres -d votre_base_de_donnees
```

2. **Remplacez `votre_utilisateur_db` par l'utilisateur trouvé à l'étape 1, puis exécutez** :

```sql
-- Permissions sur agent_conges
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE agent_conges TO "votre_utilisateur_db";
GRANT USAGE, SELECT ON SEQUENCE agent_conges_id_seq TO "votre_utilisateur_db";

-- Permissions sur jours_feries
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE jours_feries TO "votre_utilisateur_db";
GRANT USAGE, SELECT ON SEQUENCE jours_feries_id_seq TO "votre_utilisateur_db";

-- Permissions sur la fonction calculer_jours_ouvres
GRANT EXECUTE ON FUNCTION calculer_jours_ouvres(DATE, DATE) TO "votre_utilisateur_db";
```

3. **Vérifiez les permissions** :
```sql
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name = 'agent_conges';
```

4. **Quittez psql** :
```sql
\q
```

### Option B : Via le script Node.js (si vous avez les permissions)

Si vous avez un accès SSH au serveur et les permissions nécessaires :
```bash
cd backend
node scripts/grant-permissions-conges.js
```

**Note** : Ce script utilise l'utilisateur configuré dans `.env`. Si cet utilisateur n'est pas SUPERUSER, cette méthode ne fonctionnera pas. Utilisez l'Option A à la place.

### Option C : Via pgAdmin (Interface Graphique)

1. Connectez-vous à votre base de données avec pgAdmin
2. Sélectionnez votre base de données
3. Allez dans **Tools** → **Query Tool**
4. Exécutez les commandes GRANT ci-dessus (remplacez `votre_utilisateur_db`)

## ✅ Étape 3 : Vérifier que tout fonctionne

1. **Testez l'API directement** :
```bash
curl -X GET https://tourisme.2ise-groupe.com/api/conges/current-year \
  -H "Authorization: Bearer VOTRE_TOKEN"
```

2. **Ou testez depuis l'interface agent** :
   - Connectez-vous en tant qu'agent
   - Allez dans "Informations professionnelles"
   - Vous devriez voir la section "MES CONGÉS" avec les jours restants

## 🆘 Si l'erreur persiste

### Vérifiez que les tables existent :
```sql
SELECT tablename FROM pg_tables WHERE tablename IN ('agent_conges', 'jours_feries');
```

Si les tables n'existent pas, exécutez d'abord :
```bash
cd backend
node scripts/init-systeme-conges.js
```

### Vérifiez que la fonction existe :
```sql
SELECT proname FROM pg_proc WHERE proname = 'calculer_jours_ouvres';
```

### Vérifiez les permissions avec :
```bash
cd backend
node scripts/find-db-user.js
```

## 📝 Exemple complet

Supposons que votre utilisateur est `rh_user` :

```bash
# 1. Se connecter à PostgreSQL
sudo -u postgres psql ma_rh_db

# 2. Dans psql, exécuter :
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE agent_conges TO "rh_user";
GRANT USAGE, SELECT ON SEQUENCE agent_conges_id_seq TO "rh_user";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE jours_feries TO "rh_user";
GRANT USAGE, SELECT ON SEQUENCE jours_feries_id_seq TO "rh_user";
GRANT EXECUTE ON FUNCTION calculer_jours_ouvres(DATE, DATE) TO "rh_user";

# 3. Vérifier
SELECT grantee, privilege_type FROM information_schema.role_table_grants WHERE table_name = 'agent_conges';

# 4. Quitter
\q
```

## ⚠️ Notes importantes

1. **L'utilisateur doit être entre guillemets doubles** si son nom contient des caractères spéciaux ou des majuscules
2. **Les commandes GRANT doivent être exécutées par un SUPERUSER** (généralement `postgres`)
3. **Après avoir accordé les permissions, redémarrez l'application** si nécessaire

