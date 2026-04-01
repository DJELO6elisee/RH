# 📋 Gestion des Congés en Jours Ouvrés

## 🎯 Objectif

Le système calcule les congés en **jours ouvrés**, c'est-à-dire en excluant automatiquement :
- Les **weekends** (samedi et dimanche) uniquement

**Note importante** : Les jours fériés officiels (1er janvier, 7 juillet, etc.) sont **comptabilisés** comme jours de congés normaux. Seuls les weekends (samedi et dimanche) sont exclus.

## 📊 Fonctionnement

### 1. Jours alloués (30 jours)

Les 30 jours de congés alloués par année sont des **jours ouvrés**, ce qui signifie que l'agent a droit à 30 jours de travail effectif de congés.

### 2. Calcul des jours ouvrés

Quand un agent prend des congés du **lundi au vendredi** (5 jours calendaires), cela compte pour **5 jours ouvrés** de congés.

**Exemple :**
- Congés du **lundi 6 janvier 2025** au **vendredi 10 janvier 2025**
  - Jours calendaires : 5 jours
  - Jours ouvrés : 5 jours (du lundi au vendredi)
  - Congés déduits : **5 jours**

Si les congés incluent un weekend ou un jour férié, ces jours ne sont pas décomptés :

**Exemple avec weekend :**
- Congés du **vendredi 3 janvier 2025** au **lundi 6 janvier 2025**
  - Jours calendaires : 4 jours
  - Jours ouvrés : 2 jours (vendredi et lundi, le weekend n'est pas compté)
  - Congés déduits : **2 jours**

**Exemple avec jour férié (comptabilisé) :**
- Congés du **mercredi 1er janvier 2025** au **vendredi 3 janvier 2025**
  - Jours calendaires : 3 jours
  - Jours ouvrés : 3 jours (mercredi, jeudi et vendredi - le 1er janvier est comptabilisé)
  - Congés déduits : **3 jours**

### 3. Jours reportés

Si un agent n'a pas pris tous ses congés dans l'année, les jours restants sont automatiquement reportés à l'année suivante.

**Exemple :**
- Année 2025 : 30 jours alloués, 10 jours pris, **20 jours restants**
- Année 2026 : **50 jours alloués** (30 de base + 20 reportés), 0 jours pris, 50 jours restants

## 📅 Exclusion des weekends

**Seuls les weekends sont exclus** :
- **Samedi** (jour 6 de la semaine)
- **Dimanche** (jour 0 de la semaine)

Les jours fériés officiels (1er janvier, 7 juillet, etc.) sont **comptabilisés normalement** dans les jours de congés.

## 📁 Fichiers

1. **`create_function_jours_ouvres.sql`** : Crée la fonction `calculer_jours_ouvres()` qui exclut uniquement les weekends
2. **`CongesController.js`** : Contient la logique de calcul des jours ouvrés
3. **`DemandesController.js`** : Déduit automatiquement les jours ouvrés des congés lors de la validation d'une demande d'absence

## 🚀 Utilisation

### 1. Créer la fonction SQL

Exécuter le script SQL :

```sql
-- Créer la fonction de calcul des jours ouvrés
\i backend/database/create_function_jours_ouvres.sql
```

### 3. Utilisation automatique

Le système calcule automatiquement les jours ouvrés :
- Lors de la **validation** d'une demande d'absence par le DRH
- Les jours ouvrés sont automatiquement déduits des congés restants de l'agent
- L'agent voit ses congés mis à jour en temps réel dans son tableau de bord

## 🔍 Vérification

### Calculer les jours ouvrés entre deux dates (API)

```bash
GET /api/conges/calculer-jours-ouvres?date_debut=2025-01-06&date_fin=2025-01-10
```

**Réponse :**
```json
{
  "date_debut": "2025-01-06",
  "date_fin": "2025-01-10",
  "jours_ouvres": 5
}
```

### Vérifier les congés d'un agent

```bash
GET /api/conges/current-year
```

**Réponse :**
```json
{
  "id": 1,
  "id_agent": 123,
  "annee": 2025,
  "jours_pris": 5,
  "jours_alloues": 30,
  "jours_restants": 25,
  "jours_reportes": 0
}
```

## ⚠️ Notes importantes

- Les jours de congés sont calculés en **jours ouvrés**, pas en jours calendaires
- **Seuls les weekends (samedi et dimanche) sont exclus** du calcul
- Les jours fériés officiels (1er janvier, 7 juillet, etc.) sont **comptabilisés normalement** dans les jours de congés
- Les jours reportés sont automatiquement ajoutés à l'année suivante
- La déduction des congés se fait uniquement après **validation de la demande** par le DRH

