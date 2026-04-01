# 📋 Installation du Nouveau Système de Gestion des Congés

## ✅ Modifications Apportées

### 1. **Frontend (CreateDemandeModal.jsx)**
- ✅ Ajout d'une **liste déroulante pour le motif** de congé avec les options :
  - Congé annuel
  - Congé de paternité
  - Congé de maternité
  - Congé partiel
  - Congé exceptionnel
- ✅ Ajout d'un **champ "Nombre de jours"** pour saisir directement le nombre de jours
- ✅ Ajout d'un **champ "Raison exceptionnelle"** qui apparaît uniquement si "Congé exceptionnel" est sélectionné
- ✅ Affichage des **jours restants** de l'agent
- ✅ Validation côté client : les jours demandés ne doivent pas dépasser les jours restants (sauf pour congés exceptionnels)

### 2. **Backend (DemandesController.js)**
- ✅ Validation lors de la création : vérifie que les jours demandés ne dépassent pas les jours restants (sauf congés exceptionnels)
- ✅ Utilise `nombre_jours` au lieu de calculer depuis les dates
- ✅ Gestion des **congés exceptionnels** : permet de dépasser les jours restants
- ✅ Lors de la finalisation : déduction automatique des jours
- ✅ Pour les **congés exceptionnels** : enregistre la dette (`dette_annee_suivante`) pour l'année suivante

### 3. **Backend (CongesController.js)**
- ✅ Modification de `createOrUpdateConges` pour gérer les **dettes** de l'année précédente
- ✅ Lors de l'initialisation d'une nouvelle année : 
  - `jours_alloues = 30 + jours_reportes - dette_annee_precedente`
  - Si dette = 10 jours → 20 jours alloués au lieu de 30

### 4. **Base de Données**
Nouvelles colonnes à ajouter :
- **agent_conges.dette_annee_suivante** : Stocke la dette pour l'année suivante (congés exceptionnels)
- **demandes.motif_conge** : Motif du congé (liste déroulante)
- **demandes.nombre_jours** : Nombre de jours demandés
- **demandes.raison_exceptionnelle** : Raison du congé exceptionnel
- **demandes.jours_restants_apres_deduction** : Jours restants après déduction

---

## 🚀 Installation

### ÉTAPE 1 : Ajouter les colonnes dans la base de données

Exécutez ce script SQL dans phpPgAdmin :

```sql
-- Exécutez : backend/database/add_all_conges_columns.sql
```

**OU** exécutez manuellement :

```sql
-- 1. Ajouter colonne dette_annee_suivante dans agent_conges
ALTER TABLE agent_conges ADD COLUMN IF NOT EXISTS dette_annee_suivante INTEGER DEFAULT 0;

-- 2. Ajouter colonnes dans demandes
ALTER TABLE demandes ADD COLUMN IF NOT EXISTS motif_conge VARCHAR(100);
ALTER TABLE demandes ADD COLUMN IF NOT EXISTS nombre_jours INTEGER;
ALTER TABLE demandes ADD COLUMN IF NOT EXISTS raison_exceptionnelle TEXT;
ALTER TABLE demandes ADD COLUMN IF NOT EXISTS jours_restants_apres_deduction INTEGER;
```

### ÉTAPE 2 : Vérifier que les colonnes ont été ajoutées

```sql
SELECT 
    table_name,
    column_name, 
    data_type
FROM information_schema.columns 
WHERE (table_name = 'agent_conges' AND column_name = 'dette_annee_suivante')
   OR (table_name = 'demandes' AND column_name IN ('motif_conge', 'nombre_jours', 'raison_exceptionnelle', 'jours_restants_apres_deduction'))
ORDER BY table_name, column_name;
```

---

## 📝 Fonctionnement

### Pour les Congés Normaux (annuel, paternité, maternité, partiel)

1. L'agent sélectionne le motif de congé
2. L'agent saisit le nombre de jours
3. **Validation** : Le système vérifie que `nombre_jours ≤ jours_restants`
4. Si validation OK → Demande créée
5. Lors de la finalisation → Les jours sont déduits

**Exemple** :
- Jours restants : 30
- Demande : 5 jours de congé annuel
- ✅ Validation OK → Demande créée
- Après finalisation : 25 jours restants

---

### Pour les Congés Exceptionnels

1. L'agent sélectionne "Congé exceptionnel"
2. Le champ "Raison exceptionnelle" apparaît (obligatoire)
3. L'agent saisit la raison et le nombre de jours (peut dépasser les jours restants)
4. **Validation** : Pas de vérification de jours restants (peut dépasser)
5. Lors de la finalisation :
   - Les jours sont déduits (peut donner un solde négatif)
   - La dette est enregistrée dans `dette_annee_suivante`
   - L'année suivante, l'agent aura moins de jours

**Exemple** :
- Jours restants : 10
- Demande : 20 jours de congé exceptionnel (Raison: "Maladie grave")
- ✅ Validation OK (congé exceptionnel autorisé)
- Après finalisation :
  - Jours restants cette année : -10 (solde négatif)
  - Dette enregistrée : 10 jours
- **Année suivante** :
  - Normalement : 30 jours alloués
  - Avec dette : 30 - 10 = **20 jours alloués**
  - Note : La raison du congé exceptionnel est stockée dans `raison_exceptionnelle`

---

## 🔍 Exemple Concret

### Scénario : Congé Exceptionnel

**Année 2025** :
- Agent a 30 jours alloués, 0 pris → 30 jours restants
- Fait une demande de 10 jours (congé annuel) → 20 jours restants
- Fait une demande de **20 jours (congé exceptionnel - Raison: "Maladie")**
  - ✅ Demande acceptée (congé exceptionnel)
  - Après finalisation :
    - Jours pris : 10 + 20 = 30
    - Jours restants : 30 - 30 = 0
    - **Solde négatif** : 20 - 20 = 0 ❌ (attendez, ça ne donne pas de solde négatif)

**Correction** :
- Agent a 10 jours restants
- Fait une demande de **20 jours (congé exceptionnel)**
  - ✅ Demande acceptée
  - Après finalisation :
    - Jours pris : 0 + 20 = 20
    - Jours restants : 10 - 20 = **-10 jours** (solde négatif)
    - **Dette enregistrée** : `dette_annee_suivante = 10`

**Année 2026** :
- Initialisation automatique :
  - `jours_alloues = 30 + 0 - 10 = 20 jours`
  - L'agent aura **20 jours** au lieu de 30
  - La raison du congé exceptionnel est stockée dans la demande

---

## ✅ Vérification

Après installation :

1. **Tester une demande de congé normal** :
   - Créer une demande avec motif "Congé annuel"
   - Saisir un nombre de jours ≤ jours restants
   - ✅ Devrait fonctionner

2. **Tester une demande de congé exceptionnel** :
   - Créer une demande avec motif "Congé exceptionnel"
   - Saisir une raison
   - Saisir un nombre de jours > jours restants
   - ✅ Devrait fonctionner et créer une dette

3. **Vérifier la dette sur l'année suivante** :
   - Après création d'une dette, vérifier `agent_conges.dette_annee_suivante`
   - L'année suivante, vérifier que `jours_alloues` tient compte de la dette

---

## 📝 Notes Importantes

1. **Les dates** : Les dates de début/fin sont toujours nécessaires pour les demandes d'absence, mais le nombre de jours est maintenant pris directement depuis `nombre_jours`

2. **Compatibilité** : Le système est rétrocompatible - si `nombre_jours` n'est pas fourni, il calcule depuis les dates (ancien système)

3. **Dette** : La dette est stockée dans `agent_conges.dette_annee_suivante` de l'année en cours, puis appliquée lors de l'initialisation de l'année suivante

4. **Raison exceptionnelle** : Obligatoire uniquement pour les congés exceptionnels, stockée dans `demandes.raison_exceptionnelle`

---

## 🆘 Dépannage

### Erreur : "column motif_conge does not exist"
**Solution** : Exécutez `backend/database/add_all_conges_columns.sql`

### Erreur : "column dette_annee_suivante does not exist"
**Solution** : Exécutez `backend/database/add_all_conges_columns.sql`

### Les jours ne sont pas déduits lors de la finalisation
**Vérification** : Vérifiez que la demande a `nombre_jours` ou `date_debut` et `date_fin`

### La dette n'est pas appliquée l'année suivante
**Vérification** : Vérifiez que `agent_conges.dette_annee_suivante` est bien enregistrée pour l'année en cours

