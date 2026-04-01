# 📋 Guide de mise à jour des types d'agents

## 🎯 Objectif

Ce guide vous aide à attribuer automatiquement le bon type d'agent (FONCTIONNAIRE ou CONTRACTUEL) à tous les agents de votre base de données en fonction de leur catégorie.

## 📊 Règle de classification

- **FONCTIONNAIRE** (id_type_d_agent = 1) : Agents ayant une catégorie (A, B, C ou D)
- **CONTRACTUEL** (id_type_d_agent = 2) : Agents sans catégorie

## 📁 Fichiers fournis

1. **`analyze_agent_types.sql`** : Script d'analyse (à exécuter en PREMIER)
2. **`update_agent_types.sql`** : Script de mise à jour (à exécuter en DEUXIÈME)

## 🚀 Procédure pas à pas

### Étape 1 : Analyse préliminaire

Connectez-vous à votre base de données PostgreSQL et exécutez :

```bash
psql -U isegroup -d votre_base_de_donnees -f backend/scripts/analyze_agent_types.sql
```

Ou dans psql :

```sql
\i backend/scripts/analyze_agent_types.sql
```

**Résultat attendu :** 
- Nombre total d'agents
- Répartition par catégorie
- Répartition par type actuel
- Liste des agents à mettre à jour

### Étape 2 : Vérification

Examinez attentivement les résultats de l'analyse :
- Vérifiez que le nombre d'agents correspond à vos attentes (~829 agents)
- Vérifiez la répartition entre agents avec/sans catégorie

### Étape 3 : Mise à jour

Si l'analyse est satisfaisante, exécutez le script de mise à jour :

```bash
psql -U isegroup -d votre_base_de_donnees -f backend/scripts/update_agent_types.sql
```

Ou dans psql :

```sql
\i backend/scripts/update_agent_types.sql
```

### Étape 4 : Validation ou Annulation

Le script de mise à jour ouvre une transaction sans la valider automatiquement.

**Pour VALIDER les changements :**
```sql
COMMIT;
```

**Pour ANNULER les changements :**
```sql
ROLLBACK;
```

## 📊 Résultats attendus

D'après l'analyse du fichier CSV `Liste-du-Personel-_1_.csv` :

- **Total agents** : 829
- **Agents avec catégorie (A, B, C, D)** : 740 → seront FONCTIONNAIRES
- **Agents sans catégorie** : 89 → seront CONTRACTUELS

## 🔍 Vérification post-mise à jour

Après avoir validé (COMMIT), vérifiez les résultats :

```sql
-- Nombre d'agents par type
SELECT 
    ta.libele as type_agent,
    COUNT(*) as nombre
FROM agents a
LEFT JOIN type_d_agents ta ON a.id_type_d_agent = ta.id
GROUP BY ta.libele
ORDER BY nombre DESC;

-- Vérifier qu'aucun agent n'est sans type
SELECT COUNT(*) as agents_sans_type
FROM agents
WHERE id_type_d_agent IS NULL;
```

## ⚠️ Notes importantes

1. **Sauvegarde** : Avant d'exécuter le script de mise à jour, faites une sauvegarde de votre base :
   ```bash
   pg_dump -U isegroup votre_base > backup_avant_update_types.sql
   ```

2. **Transaction** : Le script utilise une transaction pour permettre l'annulation en cas de problème

3. **Logs** : Les scripts affichent des messages détaillés pour suivre la progression

4. **Sécurité** : La mise à jour ne modifie que les agents qui correspondent aux critères

## 🛠️ En cas de problème

Si vous rencontrez une erreur :

1. Exécutez `ROLLBACK;` pour annuler les changements
2. Vérifiez les logs d'erreur
3. Ré-exécutez le script d'analyse pour comprendre le problème
4. Contactez l'équipe de support si nécessaire

## ✅ Validation finale

Après la mise à jour réussie, vous devriez avoir :
- ✅ Tous les agents avec catégorie → type FONCTIONNAIRE
- ✅ Tous les agents sans catégorie → type CONTRACTUEL
- ✅ Aucun agent sans type (id_type_d_agent = NULL)

