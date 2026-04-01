# 📋 Guide d'Exécution du Script SQL

## ⚠️ IMPORTANT : Les colonnes n'ont pas encore été ajoutées !

D'après la vérification, les colonnes nécessaires ne sont **pas encore présentes** dans votre base de données.

---

## 🚀 Comment Exécuter le Script SQL

### Méthode 1 : Via phpPgAdmin (RECOMMANDÉ)

1. **Ouvrez phpPgAdmin** dans votre navigateur
   - URL : `https://votre-serveur.com/phpPgAdmin` (ou votre URL d'accès)

2. **Sélectionnez votre base de données**
   - Cliquez sur votre serveur PostgreSQL
   - Cliquez sur la base de données `isegroup_tourisme` (ou votre nom de base)

3. **Ouvrez l'éditeur SQL**
   - Cliquez sur l'onglet **SQL** (ou cherchez "Query tool" / "Éditeur SQL")

4. **Copiez-collez le script**
   - Ouvrez le fichier : `backend/database/add_all_conges_columns.sql`
   - Copiez **TOUT le contenu** (Ctrl+A puis Ctrl+C)
   - Collez dans l'éditeur SQL (Ctrl+V)

5. **Exécutez le script**
   - Cliquez sur le bouton **Exécuter** (ou appuyez sur **F5**)
   - Attendez quelques secondes

6. **Vérifiez les résultats**
   - Vous devriez voir des messages comme :
     ```
     ✅ Colonne dette_annee_suivante ajoutée à agent_conges
     ✅ Colonne motif_conge ajoutée à demandes
     ✅ Colonne nombre_jours ajoutée à demandes
     ✅ Colonne raison_exceptionnelle ajoutée à demandes
     ✅ Colonne jours_restants_apres_deduction ajoutée à demandes
     ```

7. **Vérifiez que tout fonctionne**
   - Exécutez à nouveau : `node scripts/verify-new-conges-system.js`

---

### Méthode 2 : Via psql (Ligne de commande)

Si vous avez accès à `psql` en ligne de commande :

```bash
# Se connecter à PostgreSQL
psql -h votre_serveur -U votre_utilisateur -d isegroup_tourisme

# Exécuter le script
\i backend/database/add_all_conges_columns.sql

# Ou directement :
psql -h votre_serveur -U votre_utilisateur -d isegroup_tourisme -f backend/database/add_all_conges_columns.sql
```

---

### Méthode 3 : Via Node.js (Alternative)

Si vous ne pouvez pas utiliser phpPgAdmin, vous pouvez créer un script Node.js :

```bash
cd backend
node scripts/execute-add-columns.js
```

(Je peux créer ce script si vous voulez)

---

## ✅ Vérification Après Exécution

Après avoir exécuté le script SQL, exécutez cette commande pour vérifier :

```bash
cd backend
node scripts/verify-new-conges-system.js
```

Vous devriez voir :
```
✅ Colonne dette_annee_suivante existe dans agent_conges
✅ Colonne motif_conge existe dans demandes
✅ Colonne nombre_jours existe dans demandes
✅ Colonne raison_exceptionnelle existe dans demandes
✅ Colonne jours_restants_apres_deduction existe dans demandes
✅ TOUT EST EN ORDRE !
```

---

## 🔍 Si Vous Avez des Erreurs

### Erreur : "permission denied"
**Solution :** Exécutez d'abord les permissions :
```bash
cd backend
node scripts/grant-permissions-conges.js
```

### Erreur : "column already exists"
**Signification :** C'est normal ! Cela signifie que la colonne existe déjà. C'est une bonne chose.

### Erreur : "syntax error"
**Solution :** Vérifiez que vous avez copié **tout le contenu** du fichier `add_all_conges_columns.sql`

---

## 📝 Résumé des Colonnes à Ajouter

Le script ajoute ces colonnes :

**Dans `agent_conges` :**
- ✅ `dette_annee_suivante` (INTEGER) - Pour stocker les dettes des congés exceptionnels

**Dans `demandes` :**
- ✅ `motif_conge` (VARCHAR(100)) - Motif du congé (liste déroulante)
- ✅ `nombre_jours` (INTEGER) - Nombre de jours demandés
- ✅ `raison_exceptionnelle` (TEXT) - Raison du congé exceptionnel
- ✅ `jours_restants_apres_deduction` (INTEGER) - Jours restants après déduction

---

## ⚡ Action Immédiate

**EXÉCUTEZ MAINTENANT :**
1. Ouvrez phpPgAdmin
2. Sélectionnez votre base de données
3. Ouvrez l'éditeur SQL
4. Copiez-collez le contenu de `backend/database/add_all_conges_columns.sql`
5. Exécutez (F5)
6. Vérifiez avec : `node scripts/verify-new-conges-system.js`

---

Dites-moi quand vous avez exécuté le script SQL, et je vérifierai que tout fonctionne correctement ! 🚀

