# 🚨 CORRECTION : Mise à jour de la base de données en ligne

## ❌ PROBLÈME IDENTIFIÉ

Vous avez exécuté les scripts SQL de mise à jour, mais **les changements n'ont PAS été enregistrés** dans votre base de données.

**RAISON** : Les scripts utilisaient des transactions (`BEGIN;`) mais ne faisaient **JAMAIS de `COMMIT;`** à la fin. Sans `COMMIT`, PostgreSQL annule automatiquement tous les changements quand la session se ferme.

---

## ✅ CORRECTION APPLIQUÉE

J'ai modifié les scripts SQL suivants pour qu'ils fassent automatiquement `COMMIT;` :

1. ✅ `update_categories_from_csv.sql` - CORRIGÉ
2. ✅ `update_grades_from_csv.sql` - CORRIGÉ

---

## 🚀 SOLUTION RAPIDE : Utiliser le script PowerShell

### Étape 1 : Exécuter le script PowerShell

**Clic droit** sur le fichier `ExecuterMiseAJourEnLigne.ps1` → **"Exécuter avec PowerShell"**

OU dans PowerShell :

```powershell
cd backend/scripts
.\ExecuterMiseAJourEnLigne.ps1
```

### Étape 2 : Entrer vos informations de connexion

Le script vous demandera :
- 🌐 Adresse du serveur PostgreSQL
- 🔢 Port (par défaut : 5432)
- 💾 Nom de la base de données (par défaut : rh)
- 👤 Nom d'utilisateur (par défaut : isegroup)
- 🔐 Mot de passe

### Étape 3 : Choisir l'action

Le script vous proposera :
1. Mettre à jour les CATÉGORIES
2. Mettre à jour les GRADES
3. Mettre à jour les TYPES D'AGENTS
4. **TOUT mettre à jour** (recommandé !)

### Étape 4 : Vérifier les résultats

Le script affichera les statistiques avant/après pour que vous puissiez vérifier.

---

## 📋 ALTERNATIVE : Exécution manuelle

Si vous préférez exécuter manuellement :

### 1. Créer le fichier `.env`

Créez un fichier nommé `.env` dans le dossier `backend/` avec ce contenu :

```env
DB_HOST=votre-serveur.com
DB_PORT=5432
DB_NAME=rh
DB_USER=isegroup
DB_PASSWORD=votre-mot-de-passe
```

**⚠️ Remplacez les valeurs par vos vraies informations !**

### 2. Exécuter les scripts Node.js dans l'ordre

```bash
# 1. Catégories
cd backend/scripts
node importCategoriesFromCSV.js --apply

# 2. Grades
node updateAgentGrades.js --apply

# 3. Types d'agents
node updateAgentTypes.js --apply
```

---

## 📊 RÉSULTATS ATTENDUS

### Après la mise à jour des GRADES :

- Grade A3 : **121 agents**
- Grade A4 : **124 agents**
- Grade A5 : **25 agents**
- Grade A6 : **6 agents**
- Grade A7 : **4 agents**
- Grade B1 : **51 agents**
- Grade B3 : **335 agents** (le plus nombreux)
- Grade C1 : **50 agents**
- Grade C2 : **4 agents**
- Grade D1 : **26 agents**
- SANS GRADE : **~123 agents**

**TOTAL : 740 agents avec un grade**

### Après la mise à jour des CATÉGORIES :

- Catégorie A : **280 agents**
- Catégorie B : **387 agents**
- Catégorie C : **54 agents**
- Catégorie D : **30 agents**
- SANS CATÉGORIE : **~116 agents**

**TOTAL : 751 agents avec une catégorie**

### Après la mise à jour des TYPES :

- FONCTIONNAIRE : **751 agents** (ceux avec catégorie)
- CONTRACTUEL : **116 agents** (ceux sans catégorie)

---

## 🔍 VÉRIFIER QUE ÇA A MARCHÉ

Connectez-vous à votre base de données et exécutez :

```sql
-- Vérifier les grades
SELECT 
    COALESCE(g.libele, 'SANS GRADE') as grade,
    COUNT(*) as nombre
FROM agents a
LEFT JOIN grades g ON a.id_grade = g.id
GROUP BY g.libele
ORDER BY g.libele;

-- Vérifier les types
SELECT 
    COALESCE(ta.libele, 'SANS TYPE') as type_agent,
    COUNT(*) as nombre
FROM agents a
LEFT JOIN type_d_agents ta ON a.id_type_d_agent = ta.id
GROUP BY ta.libele;
```

Si vous voyez les chiffres attendus ci-dessus, **c'est réussi !** 🎉

---

## 🆘 SI ÇA NE MARCHE TOUJOURS PAS

### Vérifiez que vous êtes connecté à la BONNE base de données

```sql
SELECT current_database();
```

Devrait afficher : `rh`

### Vérifiez que vous avez les permissions

```sql
SELECT has_table_privilege('agents', 'UPDATE');
```

Devrait afficher : `t` (true)

### Exportez à nouveau votre base pour voir les changements

Peut-être que vous regardez un ancien dump. Re-exportez votre base :

```bash
pg_dump -h votre-serveur.com -U isegroup -d rh > donnee_nouveau.sql
```

---

## 📞 BESOIN D'AIDE ?

Si vous rencontrez des problèmes :

1. ✅ Vérifiez que vous avez Node.js installé : `node --version`
2. ✅ Vérifiez que vous êtes dans le bon dossier : `backend/scripts`
3. ✅ Vérifiez vos informations de connexion dans le fichier `.env`
4. ✅ Vérifiez que votre serveur PostgreSQL est accessible depuis votre IP

---

**Créé le :** ${new Date().toLocaleDateString('fr-FR')}  
**Version :** 1.0  
**Statut :** ✅ Scripts corrigés et prêts à l'emploi !

