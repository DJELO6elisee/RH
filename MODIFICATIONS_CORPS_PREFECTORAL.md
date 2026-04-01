# Modifications - Corps Préfectoral et Améliorations du Formulaire Agent

## Date : 3 Décembre 2025

---

## 1. 🎯 Corps Préfectoral (Nouvel Onglet)

### Modifications Frontend

#### Fichier : `ministere-tourisme/src/pages/AgentsPage.jsx`

**Ajout de 3 nouveaux champs dans l'étape "Carrière et Grade" :**

1. **Corps Préfectoral** (Sélection)
   - Options disponibles :
     - Préfet hors grade → Grade : Hors grade (HG)
     - Préfet → Grade : Grade I (GI)
     - Secrétaire général de préfecture → Grade : Grade II (GII)
     - Sous-préfet → Grade : Grade III (GIII)
   - Visible uniquement pour les fonctionnaires (id_type_d_agent = 1)
   - **Note :** Les grades utilisent des chiffres romains (I, II, III)

2. **Grade Préfectoral** (Lecture seule)
   - Rempli automatiquement selon le corps préfectoral sélectionné
   - Visible uniquement quand un corps préfectoral est sélectionné

3. **Échelon Préfectoral** (Sélection)
   - Options : Échelon 1, 2, 3
   - Visible uniquement quand un corps préfectoral est sélectionné

**⚠️ Comportement Exclusif :**
- **Quand un corps préfectoral est sélectionné**, les champs classiques (Catégorie, Grade, Échelon) sont **automatiquement masqués et vidés**
- **Quand une catégorie/grade classique est sélectionné**, les champs préfectoraux sont **automatiquement masqués et vidés**
- L'utilisateur ne peut utiliser qu'**un seul système à la fois** : soit le système préfectoral, soit le système classique

#### Fichier : `ministere-tourisme/src/components/MultiStepForm.jsx`

**Logique automatique :**
- Quand l'utilisateur sélectionne un corps préfectoral, le grade correspondant est automatiquement attribué
- Ajout de la condition `notEmpty` et `isEmpty` pour afficher/masquer les champs conditionnels
- Ajout de `conditionalMultiple` pour gérer plusieurs conditions simultanées
- Validation intelligente : les champs non affichés ne sont pas validés

---

## 2. 📞 Ajout du 3ème Numéro de Téléphone

### Fichier : `ministere-tourisme/src/pages/AgentsPage.jsx`

**Nouveaux champs dans l'étape "Contact et Adresses" :**
- `telephone1` : Téléphone principal (obligatoire)
- `telephone2` : Numéro d'urgence 1 (obligatoire) 
- `telephone3` : Numéro d'urgence 2 (obligatoire) ✨ NOUVEAU

**Filtrage automatique :** Seuls les chiffres sont acceptés dans ces champs.

---

## 3. 📝 Modification des Labels d'Adresse

### Changements dans l'étape "Contact et Adresses" :

| Ancien Label | Nouveau Label | Obligatoire |
|-------------|---------------|-------------|
| Adresse professionnelle - Rue | Adresse professionnelle - **Adresse** | ✅ Oui |
| Adresse professionnelle - Bâtiment | Adresse professionnelle - **Commune** | ✅ Oui |
| Adresse professionnelle - Ville | Adresse professionnelle - Ville | ✅ Oui |
| Adresse privée - Rue | Adresse privée - **Adresse** | ✅ Oui |
| Adresse privée - Bâtiment | Adresse privée - **Commune** | ✅ Oui |
| Adresse privée - Ville | Adresse privée - Ville | ✅ Oui |

**Tous les champs d'adresse sont maintenant obligatoires.**

---

## 4. 👶 Champs Enfants Non Obligatoires

### Fichier : `ministere-tourisme/src/components/MultiStepForm.jsx`

**Modifications :**
- ❌ Suppression des astérisques rouges (*) sur tous les champs enfants
- ❌ Désactivation de la validation obligatoire pour :
  - Nom de l'enfant
  - Prénoms de l'enfant
  - Sexe de l'enfant
  - Date de naissance de l'enfant
  - Scolarisé

**Comportement :** L'utilisateur peut maintenant saisir un nombre d'enfants et remplir uniquement les informations qu'il souhaite, sans être obligé de tout compléter.

---

## 5. 🔢 Champ Nombre d'Enfants

### Fichier : `ministere-tourisme/src/pages/AgentsPage.jsx`

**Modification :**
- ❌ Suppression de la valeur par défaut "0"
- Le champ est maintenant vide par défaut
- L'utilisateur doit saisir explicitement le nombre d'enfants s'il en a

---

## 6. 🆔 Mise à Jour de la Syntaxe du Matricule

### Fichier : `ministere-tourisme/src/pages/AgentsPage.jsx`

**Changement du placeholder :**
- Ancien : "Généré automatiquement (ex: A0001)"
- Nouveau : "Généré automatiquement (ex: **A000101**)"

**Nouveau format :** [Lettre A-Z sauf O et I][6 chiffres]

---

## 7. 💾 Modifications Base de Données

### Fichier : `backend/database/add_corps_prefectoral_and_telephone3.sql`

**Script SQL à exécuter pour ajouter les nouvelles colonnes :**

```sql
-- Ajouter telephone3
ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS telephone3 VARCHAR(20);

-- Ajouter les colonnes du corps préfectoral
ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS corps_prefectoral VARCHAR(50);

ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS grade_prefectoral VARCHAR(50);

ALTER TABLE agents 
ADD COLUMN IF NOT EXISTS echelon_prefectoral INTEGER;
```

**Colonnes ajoutées :**
1. `telephone3` (VARCHAR(20)) - Deuxième numéro d'urgence
2. `corps_prefectoral` (VARCHAR(50)) - Type de corps préfectoral
3. `grade_prefectoral` (VARCHAR(50)) - Grade préfectoral automatique
4. `echelon_prefectoral` (INTEGER) - Échelon préfectoral (1, 2, 3)

---

## 8. 📋 Instructions d'Installation

### Étape 1 : Exécuter le script SQL

```bash
# Se connecter à PostgreSQL
psql -U votre_utilisateur -d votre_base_de_donnees

# Exécuter le script
\i backend/database/add_corps_prefectoral_and_telephone3.sql
```

### Étape 2 : Redémarrer l'application

```bash
# Backend
cd backend
npm restart

# Frontend
cd ministere-tourisme
npm start
```

---

## 9. ✅ Validation des Modifications

### Tests à effectuer :

1. **Corps Préfectoral :**
   - [ ] Créer un agent fonctionnaire
   - [ ] Vérifier que les champs Catégorie, Grade, Échelon et Corps Préfectoral sont visibles
   - [ ] Sélectionner un corps préfectoral
   - [ ] Vérifier que le grade préfectoral s'affiche automatiquement
   - [ ] Vérifier que les champs Catégorie, Grade, Échelon classiques sont **masqués**
   - [ ] Sélectionner un échelon préfectoral
   - [ ] Désélectionner le corps préfectoral (vider le champ)
   - [ ] Vérifier que les champs préfectoraux disparaissent et que les champs classiques réapparaissent
   - [ ] Sélectionner une catégorie classique
   - [ ] Vérifier que les champs préfectoraux sont **masqués**
   - [ ] Vérifier l'enregistrement en base de données

2. **Numéros de téléphone :**
   - [ ] Créer un agent avec les 3 numéros de téléphone
   - [ ] Vérifier la validation (obligatoire)
   - [ ] Vérifier le filtrage (seuls les chiffres)

3. **Adresses :**
   - [ ] Vérifier les nouveaux labels (Adresse, Commune)
   - [ ] Vérifier que tous les champs sont obligatoires

4. **Enfants :**
   - [ ] Saisir un nombre d'enfants (ex: 2)
   - [ ] Laisser certains champs vides
   - [ ] Vérifier qu'aucune erreur n'est affichée
   - [ ] Valider le formulaire

5. **Matricule :**
   - [ ] Créer un agent non-fonctionnaire
   - [ ] Vérifier le nouveau format du matricule généré

---

## 10. 🔍 Notes Techniques

### Gestion Automatique Backend

Le contrôleur `AgentsController.js` accepte automatiquement tous les nouveaux champs via la destructuration `cleanAgentData`. Aucune modification du backend n'est nécessaire pour la logique métier.

### Champs Conditionnels

La logique conditionnelle utilise maintenant :
- `notEmpty` pour afficher les champs "grade_prefectoral" et "echelon_prefectoral" uniquement quand un corps préfectoral est sélectionné
- `isEmpty` pour afficher les champs classiques uniquement quand le corps préfectoral est vide
- `conditionalMultiple` pour combiner plusieurs conditions (exemple : id_type_d_agent = 1 ET corps_prefectoral est vide)

### Comportement Exclusif Catégorie/Grade vs Corps Préfectoral

Le système garantit qu'un seul mode peut être utilisé à la fois :

**Scénario 1 : Sélection du Corps Préfectoral**
```
Utilisateur sélectionne "Préfet" dans Corps Préfectoral
→ grade_prefectoral = "Grade I (GI)" (automatique)
→ id_categorie = null (vidé)
→ id_grade = null (vidé)
→ id_echelon = null (vidé)
→ Champs Catégorie/Grade/Échelon masqués
```

**Scénario 2 : Sélection du Mode Classique**
```
Utilisateur sélectionne une catégorie dans "Catégorie"
→ corps_prefectoral = null (vidé)
→ grade_prefectoral = null (vidé)
→ echelon_prefectoral = null (vidé)
→ Champs préfectoraux masqués
```

### Validation Intelligente

La fonction `validateCurrentStep` vérifie maintenant si un champ doit être affiché avant de le valider. Ainsi :
- Si un corps préfectoral est sélectionné, les champs Catégorie/Grade (même s'ils sont conditionnellement obligatoires) ne seront pas validés car ils ne sont pas affichés
- Vice versa pour les champs préfectoraux

---

## 📝 Résumé

✅ Ajout du corps préfectoral avec attribution automatique du grade  
✅ Ajout du 3ème numéro de téléphone (obligatoire)  
✅ Modification des labels d'adresse (Rue → Adresse, Bâtiment → Commune)  
✅ Tous les champs d'adresse sont obligatoires  
✅ Champs enfants non obligatoires  
✅ Champ nombre d'enfants sans valeur par défaut  
✅ Mise à jour de la syntaxe du matricule  
✅ Script SQL pour ajouter les colonnes en base de données  

---

## 11. 🔄 Système de Détection Automatique de Nouvelle Version

### Fichiers Créés

1. **`src/components/VersionChecker.jsx`** - Composant de détection automatique
2. **`public/version.json`** - Fichier contenant la version actuelle
3. **`update-version.js`** - Script pour mettre à jour facilement la version
4. **`MISE_A_JOUR_VERSION.md`** - Documentation complète du système

### Fonctionnement

Le système vérifie **automatiquement toutes les 60 secondes** s'il y a une nouvelle version :

- ✅ Compare la version locale (localStorage) avec la version serveur (`/version.json`)
- ✅ Si une nouvelle version est détectée, affiche une **notification flottante** en haut à droite
- ✅ L'utilisateur peut cliquer sur **"Actualiser maintenant"** pour recharger
- ✅ Le rechargement force le vidage du cache (équivalent **Ctrl+F5**)

### Notification Visuelle

Quand une nouvelle version est disponible :

```
┌─────────────────────────────────────────────┐
│ 🎉 Nouvelle version disponible !           │
│                                             │
│ Une nouvelle version de l'application      │
│ est disponible.                            │
│ Version : 1.1.0                            │
│                                             │
│ [Actualiser maintenant] [Plus tard]        │
└─────────────────────────────────────────────┘
```

### Pages Concernées

- ✅ **Page d'accueil** (MinistereHomePage)
- ✅ **Tableau de bord DRH** (DRHDashboardPage)
- ✅ **Tableau de bord Agent** (AgentDashboard)

### Comment Déployer une Nouvelle Version

**Méthode Manuelle :**
1. Modifier `public/version.json` :
   ```json
   {
     "version": "1.1.0",
     "buildDate": "2025-12-03T15:00:00Z",
     "description": "Ajout du Corps Préfectoral"
   }
   ```
2. Build : `npm run build`
3. Déployer sur le serveur

**Méthode Automatique (avec script) :**
```bash
# Mise à jour patch (1.0.0 → 1.0.1)
node scripts/update-version.js patch "Correction de bugs"

# Mise à jour mineure (1.0.0 → 1.1.0)
node scripts/update-version.js minor "Ajout du Corps Préfectoral"

# Mise à jour majeure (1.0.0 → 2.0.0)
node scripts/update-version.js major "Refonte complète"
```

### Rechargement Forcé (Hard Refresh)

Le bouton "Actualiser maintenant" effectue :
1. **Suppression de tous les caches** (Service Workers, Cache API)
2. **Rechargement depuis le serveur** (bypass cache navigateur)
3. **Mise à jour du numéro de version** local
4. **Chargement des nouveaux fichiers** JS, CSS, images, etc.

Équivalent exact de **Ctrl+F5** ou **Cmd+Shift+R** (Mac)

---

## 12. ⏰ Système d'Expiration de Session par Inactivité

### Fichiers Créés

1. **`src/hooks/useInactivityTimer.js`** - Hook de détection d'inactivité
2. **`src/components/InactivityHandler.jsx`** - Composant de gestion de l'inactivité
3. **`GESTION_INACTIVITE.md`** - Documentation complète du système

### Fonctionnement

Le système détecte automatiquement l'inactivité et déconnecte après **30 minutes** :

**Événements Surveillés :**
- 🖱️ Mouvements de souris
- 🖱️ Clics
- ⌨️ Frappes clavier
- 📜 Défilement
- 📱 Touch mobile

**Timeline :**
```
0 min  : Connexion
↓
28 min : ⚠️ Avertissement "Session bientôt expirée"
         Modal avec compte à rebours (120 secondes)
         [Continuer ma session] [Se déconnecter]
↓
30 min : ❌ Déconnexion automatique
         → Redirection vers /ministere
         → Message : "Session expirée (30 min d'inactivité)"
```

**Comportement :**
- ✅ **Activité détectée** : Timer réinitialisé automatiquement
- ✅ **Modal d'avertissement** : Apparaît 2 minutes avant expiration
- ✅ **Compte à rebours** : Affiche les secondes restantes en temps réel
- ✅ **Choix utilisateur** : Peut continuer ou se déconnecter
- ✅ **Déconnexion auto** : Si aucune action après 30 minutes
- ✅ **Redirection** : Vers la page d'accueil (`/ministere`)

**Sécurité :**
- 🔒 Protège les données sensibles RH
- 🔒 Empêche l'accès non autorisé si session laissée ouverte
- 🔒 Conforme aux bonnes pratiques de sécurité

**Optimisation :**
- ⚡ Throttling : Max 1 événement/seconde pour éviter la surcharge
- ⚡ Passive listeners : Optimise les performances
- ⚡ SessionStorage : Persiste entre les rafraîchissements de page

**Pages Concernées :**
- ✅ Toutes les pages protégées (nécessitant authentification)
- ❌ Pages publiques exclues (page d'accueil, login)

---

**Auteur :** Assistant IA  
**Date :** 3 Décembre 2025

