# 🌐 GUIDE : EXÉCUTER LES SCRIPTS SUR LA BASE DE DONNÉES EN LIGNE

## 📋 Vue d'ensemble

Ce guide explique comment exécuter les scripts SQL de mise à jour sur votre **base de données PostgreSQL hébergée en ligne**.

---

## 🚨 PROBLÈME IDENTIFIÉ

Vous avez exécuté les scripts SQL mais les changements n'apparaissent pas dans votre base de données parce que :

1. ❌ Les scripts commençaient une transaction avec `BEGIN;`
2. ❌ Ils n'exécutaient PAS de `COMMIT;` à la fin
3. ❌ Sans `COMMIT`, les changements ne sont **JAMAIS enregistrés**
4. ❌ Quand vous fermez la session, PostgreSQL annule automatiquement (ROLLBACK)

**✅ MAINTENANT CORRIGÉ** : Les scripts ont été modifiés pour exécuter automatiquement `COMMIT;`

---

## 🔧 MÉTHODE 1 : Exécuter les scripts SQL via pgAdmin ou psql

### Étape 1 : Connexion à votre base de données en ligne

**Option A : Avec pgAdmin (Interface graphique)**

1. Ouvrez pgAdmin
2. Créez une nouvelle connexion serveur
3. Entrez les informations de connexion :
   - Host : `votre-serveur.com`
   - Port : `5432`
   - Database : `rh`
   - Username : `isegroup`
   - Password : `votre-mot-de-passe`

**Option B : Avec psql (Ligne de commande)**

```bash
psql -h votre-serveur.com -U isegroup -d rh -p 5432
```

### Étape 2 : Exécuter les scripts dans l'ordre

**1. Mise à jour des catégories**

```bash
psql -h votre-serveur.com -U isegroup -d rh -p 5432 -f backend/scripts/update_categories_from_csv.sql
```

Ou dans pgAdmin :
- Clic droit sur la base de données `rh`
- Query Tool
- File → Open : `backend/scripts/update_categories_from_csv.sql`
- Exécuter (F5)

**2. Mise à jour des grades**

```bash
psql -h votre-serveur.com -U isegroup -d rh -p 5432 -f backend/scripts/update_grades_from_csv.sql
```

**3. Mise à jour des types d'agents**

Utilisez le script Node.js (voir Méthode 2)

---

## 🔧 MÉTHODE 2 : Utiliser les scripts Node.js (RECOMMANDÉ)

Cette méthode est **plus sûre** car elle gère automatiquement les transactions et les erreurs.

### Étape 1 : Créer le fichier `.env`

Créez un fichier `.env` dans le dossier `backend/` avec vos informations de connexion :

```env
# Configuration de la base de données PostgreSQL en ligne
DB_HOST=votre-serveur.com
DB_PORT=5432
DB_NAME=rh
DB_USER=isegroup
DB_PASSWORD=votre-mot-de-passe-ici
```

**⚠️ IMPORTANT** : Remplacez les valeurs par vos vraies informations de connexion !

### Étape 2 : Exécuter les scripts dans l'ordre

**1. Catégories** (si ce n'est pas déjà fait)

```bash
cd backend/scripts
node importCategoriesFromCSV.js --apply
```

**2. Grades**

```bash
node updateAgentGrades.js --apply
```

**3. Types d'agents**

```bash
node updateAgentTypes.js --apply
```

---

## 📊 VÉRIFICATION DES RÉSULTATS

Après avoir exécuté les scripts, vérifiez que les changements ont bien été appliqués :

### Vérifier les grades

```sql
SELECT 
    COALESCE(g.libele, 'SANS GRADE') as grade,
    COUNT(*) as nombre
FROM agents a
LEFT JOIN grades g ON a.id_grade = g.id
GROUP BY g.libele, g.id
ORDER BY g.libele;
```

**Résultat attendu :**
- Grade A3 : 121 agents
- Grade A4 : 124 agents
- Grade A5 : 25 agents
- Grade A6 : 6 agents
- Grade A7 : 4 agents
- Grade B1 : 51 agents
- Grade B3 : 335 agents
- Grade C1 : 50 agents
- Grade C2 : 4 agents
- Grade D1 : 26 agents
- SANS GRADE : ~123 agents

### Vérifier les catégories

```sql
SELECT 
    COALESCE(c.libele, 'SANS CATEGORIE') as categorie,
    COUNT(*) as nombre
FROM agents a
LEFT JOIN categories c ON a.id_categorie = c.id
GROUP BY c.libele, c.id
ORDER BY c.libele;
```

**Résultat attendu :**
- Catégorie A : 280 agents
- Catégorie B : 387 agents
- Catégorie C : 54 agents
- Catégorie D : 30 agents
- SANS CATÉGORIE : ~116 agents

### Vérifier les types d'agents

```sql
SELECT 
    COALESCE(ta.libele, 'SANS TYPE') as type_agent,
    COUNT(*) as nombre
FROM agents a
LEFT JOIN type_d_agents ta ON a.id_type_d_agent = ta.id
GROUP BY ta.libele, ta.id
ORDER BY ta.libele;
```

**Résultat attendu :**
- FONCTIONNAIRE : 751 agents
- CONTRACTUEL : 116 agents

---

## 🆘 PROBLÈMES COURANTS

### Problème 1 : "Permission denied"

**Cause** : Votre utilisateur n'a pas les permissions nécessaires

**Solution** : Connectez-vous avec un utilisateur ayant les droits `UPDATE` sur la table `agents`

### Problème 2 : "Connection refused"

**Cause** : Impossible de se connecter au serveur PostgreSQL

**Solutions** :
1. Vérifiez que votre serveur PostgreSQL est accessible depuis votre IP
2. Vérifiez le pare-feu/firewall de votre hébergeur
3. Vérifiez que le port 5432 est ouvert
4. Vérifiez vos informations de connexion

### Problème 3 : "Database does not exist"

**Cause** : Le nom de la base de données est incorrect

**Solution** : Vérifiez le nom exact de votre base de données (probablement `rh`)

### Problème 4 : Les changements n'apparaissent toujours pas

**Causes possibles** :
1. Vous regardez une ancienne version du dump (re-exportez votre base)
2. Vous êtes connecté à la mauvaise base de données
3. La transaction a été annulée (pas de COMMIT)

**Solution** : Re-exécutez les scripts avec les modifications (COMMIT activé)

---

## 📝 ORDRE D'EXÉCUTION RECOMMANDÉ

Pour une mise à jour complète et cohérente :

1. ✅ **Catégories** (déjà fait si vous avez exécuté le script)
2. ✅ **Grades** (exécutez maintenant avec COMMIT activé)
3. ✅ **Types d'agents** (à exécuter après les catégories et grades)

**Commandes complètes :**

```bash
# Méthode SQL (sur base en ligne)
psql -h votre-serveur.com -U isegroup -d rh -f backend/scripts/update_categories_from_csv.sql
psql -h votre-serveur.com -U isegroup -d rh -f backend/scripts/update_grades_from_csv.sql

# Méthode Node.js (après avoir créé le .env)
cd backend/scripts
node updateAgentTypes.js --apply
```

---

## 🔐 SÉCURITÉ

⚠️ **IMPORTANT** :
- NE PARTAGEZ JAMAIS votre fichier `.env` (il contient vos mots de passe)
- Ajoutez `.env` à votre `.gitignore`
- Faites une sauvegarde de votre base AVANT d'exécuter les scripts

---

## 📞 INFORMATIONS NÉCESSAIRES

Pour vous aider à configurer la connexion, j'ai besoin de :

1. 🌐 **Adresse du serveur PostgreSQL** (ex: `db.exemple.com` ou une IP)
2. 🔢 **Port** (généralement `5432`)
3. 💾 **Nom de la base de données** (probablement `rh`)
4. 👤 **Nom d'utilisateur** (probablement `isegroup`)
5. 🔐 **Mot de passe**

Une fois que vous me donnez ces informations, je créerai automatiquement le fichier `.env` pour vous ! 🚀

---

**Créé le :** ${new Date().toLocaleDateString('fr-FR')}  
**Version :** 1.0

