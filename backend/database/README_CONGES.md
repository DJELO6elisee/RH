# 📋 Initialisation des Congés des Agents

## 🎯 Objectif

Ce script permet d'initialiser les congés de l'année en cours pour tous les agents actifs du système. Chaque agent recevra 30 jours de congés pour l'année en cours.

## 📁 Fichiers

1. **`create_conges_table.sql`** : Crée la table `agent_conges` si elle n'existe pas déjà
2. **`init_conges_agents.sql`** : Script SQL pour initialiser les congés de tous les agents
3. **`../scripts/init-conges-agents.js`** : Script Node.js pour initialiser les congés

## 🚀 Utilisation

### Option 1 : Script SQL direct

Exécuter le script SQL directement dans PostgreSQL :

```bash
psql -U votre_utilisateur -d votre_base_de_donnees -f init_conges_agents.sql
```

Ou via pgAdmin ou un autre client PostgreSQL.

### Option 2 : Script Node.js

Exécuter le script Node.js depuis le répertoire `backend` :

```bash
node scripts/init-conges-agents.js
```

## 📊 Résultat

Après l'exécution :
- Tous les agents actifs (non retirés) auront 30 jours de congés alloués pour l'année en cours
- 0 jour pris initialement
- 30 jours restants
- 0 jour reporté (puisque c'est le début du système)

## ⚠️ Notes importantes

- Le script n'écrase pas les congés existants pour l'année en cours
- Seuls les agents actifs (non retirés) sont initialisés
- Le script utilise `ON CONFLICT DO NOTHING` pour éviter les doublons
- L'année est automatiquement détectée depuis la date système

## 🔄 Pour les années suivantes

Le système calculera automatiquement les jours reportés de l'année précédente lors de la première consultation des congés par un agent via l'API `/api/conges/current-year`.

