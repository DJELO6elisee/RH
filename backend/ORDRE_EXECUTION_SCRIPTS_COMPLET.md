# 📋 Ordre d'Exécution Complet - Système de Gestion des Congés

## ⚠️ IMPORTANT
Ces scripts doivent être exécutés **sur le serveur de production** où se trouve la base de données PostgreSQL accessible via `tourisme.2ise-groupe.com`.

---

## 🚀 ORDRE D'EXÉCUTION COMPLET

### ÉTAPE 1 : Initialiser le système de gestion des congés (SI PAS DÉJÀ FAIT)
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

**Quand l'exécuter :**
- ✅ **Si vous ne l'avez pas encore exécuté** (première installation)
- ❌ Si les tables existent déjà (vous avez déjà exécuté ce script)

**Durée :** ~30 secondes - 2 minutes

---

### ÉTAPE 2 : Ajouter les nouvelles colonnes pour les motifs de congé
**Script :** `backend/database/add_all_conges_columns.sql`

**À exécuter dans phpPgAdmin :**
1. Ouvrez phpPgAdmin
2. Sélectionnez votre base de données (`isegroup_tourisme`)
3. Ouvrez l'éditeur SQL
4. Copiez-collez le contenu du script `add_all_conges_columns.sql`
5. Exécutez (F5)

**Ce que fait ce script :**
- ✅ Ajoute `agent_conges.dette_annee_suivante` : Pour stocker les dettes (congés exceptionnels)
- ✅ Ajoute `demandes.motif_conge` : Motif du congé (liste déroulante)
- ✅ Ajoute `demandes.nombre_jours` : Nombre de jours demandés
- ✅ Ajoute `demandes.raison_exceptionnelle` : Raison du congé exceptionnel
- ✅ Ajoute `demandes.jours_restants_apres_deduction` : Jours restants après déduction

**Quand l'exécuter :**
- ✅ **OBLIGATOIRE** : Pour que le nouveau système de motifs fonctionne
- ✅ À exécuter **après** l'étape 1 (si vous l'exécutez)

**Durée :** ~5 secondes

---

### ÉTAPE 3 : Accorder les permissions (SI PAS DÉJÀ FAIT)
**Script :** `backend/scripts/grant-permissions-conges.js`

**Commande :**
```bash
cd backend
node scripts/grant-permissions-conges.js
```

**OU** via phpPgAdmin avec les commandes SQL (si le script ne fonctionne pas) :
```sql
-- Remplacez "isegroup" par votre utilisateur si différent
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE agent_conges TO "isegroup";
GRANT USAGE, SELECT ON SEQUENCE agent_conges_id_seq TO "isegroup";
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE jours_feries TO "isegroup";
GRANT USAGE, SELECT ON SEQUENCE jours_feries_id_seq TO "isegroup";
GRANT EXECUTE ON FUNCTION calculer_jours_ouvres(DATE, DATE) TO "isegroup";
```

**Ce que fait ce script :**
- ✅ Donne les permissions nécessaires à l'utilisateur de l'application
- ✅ Résout l'erreur `permission denied for relation agent_conges`

**Quand l'exécuter :**
- ✅ **Si vous obtenez l'erreur `permission denied`**
- ❌ Si vous n'avez pas cette erreur (déjà exécuté)

**Durée :** ~5 secondes

---

### ÉTAPE 4 : Vérifier que tout fonctionne (Optionnel mais recommandé)
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

## 📝 RÉSUMÉ RAPIDE - Scripts à Exécuter

### Si c'est une PREMIÈRE installation :
```bash
# 1. Initialiser le système de congés
cd backend
node scripts/init-systeme-conges.js

# 2. Ajouter les nouvelles colonnes (OBLIGATOIRE pour les motifs)
# → Exécutez backend/database/add_all_conges_columns.sql dans phpPgAdmin

# 3. Accorder les permissions
node scripts/grant-permissions-conges.js

# 4. Vérifier (optionnel)
node scripts/test-conges-api.js
```

### Si les tables existent déjà (vous avez déjà exécuté l'étape 1) :
```bash
# 1. Ajouter les nouvelles colonnes (OBLIGATOIRE pour les motifs)
# → Exécutez backend/database/add_all_conges_columns.sql dans phpPgAdmin

# 2. Vérifier les permissions (si vous avez encore l'erreur "permission denied")
node scripts/grant-permissions-conges.js
```

---

## 🔍 Comment Savoir Quels Scripts Exécuter ?

### Vérification Rapide dans phpPgAdmin :

**1. Vérifier si les tables existent :**
```sql
SELECT tablename FROM pg_tables 
WHERE tablename IN ('agent_conges', 'jours_feries');
```

- ✅ Si les 2 tables apparaissent → L'ÉTAPE 1 est déjà faite, passez à l'ÉTAPE 2
- ❌ Si les tables n'apparaissent pas → Exécutez l'ÉTAPE 1 d'abord

**2. Vérifier si les nouvelles colonnes existent :**
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'demandes' 
  AND column_name IN ('motif_conge', 'nombre_jours', 'raison_exceptionnelle');
```

- ✅ Si les 3 colonnes apparaissent → L'ÉTAPE 2 est déjà faite
- ❌ Si les colonnes n'apparaissent pas → Exécutez l'ÉTAPE 2

**3. Vérifier les permissions :**
```sql
SELECT grantee FROM information_schema.role_table_grants 
WHERE table_name = 'agent_conges';
```

- ✅ Si votre utilisateur apparaît → L'ÉTAPE 3 est déjà faite
- ❌ Si vous obtenez encore `permission denied` → Exécutez l'ÉTAPE 3

---

## ✅ Script Minimum Requis pour les Modifications d'Aujourd'hui

Pour que les **nouveautés d'aujourd'hui** (liste déroulante de motifs, nombre de jours, congés exceptionnels) fonctionnent, vous devez **OBLIGATOIREMENT** exécuter :

**Script SQL :** `backend/database/add_all_conges_columns.sql`

Ce script ajoute les colonnes nécessaires pour :
- ✅ La liste déroulante de motifs (`motif_conge`)
- ✅ Le nombre de jours (`nombre_jours`)
- ✅ La raison exceptionnelle (`raison_exceptionnelle`)
- ✅ La gestion des dettes (`dette_annee_suivante`)

**Sans ce script, le nouveau formulaire ne fonctionnera pas correctement.**

---

## 📋 Checklist d'Installation

- [ ] ÉTAPE 1 : Tables `agent_conges` et `jours_feries` existent ?
  - [ ] OUI → Passez à l'ÉTAPE 2
  - [ ] NON → Exécutez `init-systeme-conges.js`

- [ ] ÉTAPE 2 : Colonnes `motif_conge`, `nombre_jours`, `raison_exceptionnelle` existent dans `demandes` ?
  - [ ] OUI → Passez à l'ÉTAPE 3
  - [ ] NON → **Exécutez `add_all_conges_columns.sql` (OBLIGATOIRE)**

- [ ] ÉTAPE 3 : Plus d'erreur `permission denied` ?
  - [ ] OUI → Terminé !
  - [ ] NON → Exécutez `grant-permissions-conges.js`

---

## 🎯 Résumé Final

### Scripts à Exécuter selon votre situation :

**Si tout fonctionne déjà (congés s'affichent) :**
→ Exécutez **UNIQUEMENT** : `backend/database/add_all_conges_columns.sql`

**Si les tables n'existent pas encore :**
→ Exécutez dans l'ordre :
1. `init-systeme-conges.js`
2. `add_all_conges_columns.sql` (phpPgAdmin)
3. `grant-permissions-conges.js`

**Si vous avez encore l'erreur "permission denied" :**
→ Exécutez : `grant-permissions-conges.js`

