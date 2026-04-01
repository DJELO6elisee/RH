# 📅 Installation - Planning Prévisionnel des Congés

## 📋 Description

Ce module permet de gérer le planning prévisionnel des congés pour les agents du ministère. Il stocke la date de départ en congés pour chaque agent chaque année dans la table `agent_conges`.

## 🚀 Installation

### Étape 1 : Ajouter la colonne à la base de données

Exécutez le script SQL suivant pour ajouter la colonne `date_depart_conges` à la table `agent_conges` :

```bash
psql -U votre_utilisateur -d votre_base_de_donnees -f backend/database/add_date_depart_conges_column.sql
```

Ou directement dans votre client PostgreSQL :

```sql
-- Exécuter : backend/database/add_date_depart_conges_column.sql
```

**Ce que fait ce script :**
- Ajoute la colonne `date_depart_conges` (type DATE) à la table `agent_conges`
- Crée des index pour améliorer les performances des requêtes
- Documente la colonne avec un commentaire

## 📡 Endpoints API

### 1. Créer ou mettre à jour la date de départ pour un agent
```
POST /api/planning-previsionnel
Body: {
  "id_agent": 123,
  "annee": 2025,
  "date_depart_conges": "2025-07-15"
}
```

### 2. Créer ou mettre à jour la date de départ pour plusieurs agents (congés groupés)
```
POST /api/planning-previsionnel/grouped
Body: {
  "agents": [123, 456, 789],
  "annee": 2025,
  "date_depart_conges": "2025-07-15"
}
```

### 3. Récupérer la date de départ pour un agent et une année
```
GET /api/planning-previsionnel/agent/:agentId/annee/:annee
```

### 4. Récupérer toutes les dates de départ pour une année
```
GET /api/planning-previsionnel/annee/:annee
Query params (optionnels):
  - direction_id: Filtrer par direction
  - service_id: Filtrer par service
```

### 5. Supprimer la date de départ pour un agent
```
DELETE /api/planning-previsionnel/agent/:agentId/annee/:annee
```

## 🔐 Authentification

Tous les endpoints nécessitent une authentification via le middleware `authenticate`. 
Vous devez inclure le token JWT dans l'en-tête `Authorization: Bearer <token>`.

## 📊 Structure de la base de données

La colonne `date_depart_conges` est ajoutée à la table existante `agent_conges` :

```sql
agent_conges
├── id
├── id_agent
├── annee
├── jours_pris
├── jours_alloues
├── jours_restants
├── jours_reportes
├── date_depart_conges  ← NOUVELLE COLONNE
├── created_at
└── updated_at
```

## ✅ Vérification

Après l'installation, vous pouvez vérifier que la colonne a été ajoutée :

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'agent_conges' 
AND column_name = 'date_depart_conges';
```

## 🎯 Utilisation

Une fois installé, vous pouvez utiliser l'interface "Planning prévisionnel des congés" dans le frontend pour :
- Programmer la date de départ en congés pour un agent individuel
- Programmer la même date de départ pour plusieurs agents (congés groupés)
- Consulter les dates de départ programmées par année

