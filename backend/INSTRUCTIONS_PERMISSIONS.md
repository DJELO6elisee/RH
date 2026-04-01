# 🔧 Instructions pour corriger l'erreur "permission denied for relation agent_conges"

## ❌ Problème actuel
L'erreur `permission denied for relation agent_conges` apparaît sur le serveur de production.

## ✅ Solution (5 minutes)

### Option 1 : Via SSH et psql (Recommandé)

#### Étape 1 : Se connecter au serveur de production
```bash
ssh votre_serveur
cd /chemin/vers/votre/projet/backend
```

#### Étape 2 : Identifier l'utilisateur de la base de données
```bash
# Méthode 1 : Regarder dans .env
cat .env | grep DB_USER

# Méthode 2 : Exécuter le script de détection
node scripts/find-db-user.js
```

Notez le nom de l'utilisateur (exemple: `rh_user`, `app_user`, `tourisme_user`, etc.)

#### Étape 3 : Se connecter à PostgreSQL en tant que SUPERUSER
```bash
sudo -u postgres psql votre_base_de_donnees
```

Remplacez `votre_base_de_donnees` par le nom de votre base (généralement dans `.env` -> `DB_NAME`)

#### Étape 4 : Dans psql, lister les utilisateurs (pour vérifier)
```sql
SELECT rolname FROM pg_roles WHERE rolcanlogin = true ORDER BY rolname;
```

#### Étape 5 : Accorder les permissions (remplacez `VOTRE_UTILISATEUR`)

**Exemple si votre utilisateur est `rh_user`** :
```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE agent_conges TO "rh_user";
GRANT USAGE, SELECT ON SEQUENCE agent_conges_id_seq TO "rh_user";

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE jours_feries TO "rh_user";
GRANT USAGE, SELECT ON SEQUENCE jours_feries_id_seq TO "rh_user";

GRANT EXECUTE ON FUNCTION calculer_jours_ouvres(DATE, DATE) TO "rh_user";
```

#### Étape 6 : Vérifier les permissions
```sql
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name = 'agent_conges'
ORDER BY grantee;
```

#### Étape 7 : Quitter psql
```sql
\q
```

---

### Option 2 : Via pgAdmin (Interface graphique)

1. Connectez-vous à votre base de données avec pgAdmin
2. Allez dans **Tools** → **Query Tool**
3. Exécutez les commandes GRANT ci-dessus (remplacez `VOTRE_UTILISATEUR`)
4. Cliquez sur **Execute** (F5)

---

### Option 3 : Utiliser le script SQL automatique

1. Ouvrez `backend/database/ACCORDER_PERMISSIONS.sql`
2. Remplacez `VOTRE_UTILISATEUR` par votre utilisateur réel
3. Connectez-vous à PostgreSQL : `sudo -u postgres psql votre_base_de_donnees`
4. Exécutez : `\i backend/database/ACCORDER_PERMISSIONS.sql`

---

## 🔍 Comment trouver l'utilisateur ?

### Méthode 1 : Fichier .env
```bash
cat backend/.env | grep DB_USER
```
Vous verrez : `DB_USER=votre_utilisateur`

### Méthode 2 : Script Node.js
```bash
cd backend
node scripts/find-db-user.js
```

### Méthode 3 : Dans PostgreSQL
```sql
SELECT current_user;
```

---

## ⚠️ Points importants

1. **Guillemets doubles** : Si le nom de l'utilisateur contient des majuscules ou des caractères spéciaux, utilisez des guillemets doubles : `"Votre_Utilisateur"`

2. **Superuser requis** : Vous devez être connecté en tant que SUPERUSER (généralement `postgres`) pour exécuter les commandes GRANT

3. **Nom de la base** : Remplacez `votre_base_de_donnees` par le nom réel de votre base (trouvable dans `.env` -> `DB_NAME`)

---

## ✅ Après avoir accordé les permissions

1. **Redémarrez l'application** (si nécessaire) :
```bash
pm2 restart all
# ou
systemctl restart votre_service
```

2. **Testez** : Rechargez la page de l'agent dans l'interface web
   - Allez dans "Informations professionnelles"
   - La section "MES CONGÉS" devrait maintenant s'afficher

3. **Vérifiez les logs** : Plus d'erreur `permission denied` dans les logs

---

## 🆘 Si cela ne fonctionne toujours pas

1. Vérifiez que les tables existent :
```sql
SELECT tablename FROM pg_tables WHERE tablename IN ('agent_conges', 'jours_feries');
```

2. Si les tables n'existent pas, exécutez d'abord :
```bash
cd backend
node scripts/init-systeme-conges.js
```

3. Vérifiez que vous avez utilisé le BON nom d'utilisateur :
```sql
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name = 'agent_conges';
```

