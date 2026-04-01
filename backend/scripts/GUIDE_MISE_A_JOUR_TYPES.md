# 📘 Guide complet : Mise à jour des types d'agents

## 🎯 Objectif

Attribuer automatiquement le type d'agent correct (FONCTIONNAIRE ou CONTRACTUEL) à tous les agents de votre base de données selon leur catégorie.

## 📋 Règle de classification

| Condition | Type d'agent |
|-----------|--------------|
| Agent avec catégorie (A, B, C ou D) | **FONCTIONNAIRE** |
| Agent sans catégorie | **CONTRACTUEL** |

## 📊 Statistiques attendues

D'après l'analyse du fichier CSV :
- **Total agents** : 829
- **Agents avec catégorie** : 740 → deviendront FONCTIONNAIRES
- **Agents sans catégorie** : 89 → deviendront CONTRACTUELS

---

## 🚀 Méthode 1 : Utilisation du script Node.js (RECOMMANDÉE)

### Avantages
✅ Interface colorée et claire  
✅ Mode simulation (dry-run) intégré  
✅ Vérifications automatiques  
✅ Plus sécurisé  

### Étape 1 : Prévisualisation (mode simulation)

```bash
cd backend/scripts
node updateAgentTypes.js
```

**Ce que fait cette commande :**
- Analyse l'état actuel de la base
- Affiche les agents qui seront modifiés
- **N'applique AUCUNE modification** (mode simulation)

### Étape 2 : Application réelle

Si la prévisualisation est satisfaisante :

```bash
node updateAgentTypes.js --apply
```

**Ce que fait cette commande :**
- Applique réellement les modifications
- Valide automatiquement les changements (COMMIT)
- Affiche un rapport de confirmation

---

## 🔧 Méthode 2 : Utilisation des scripts SQL

### Option A : Prévisualisation complète

```bash
psql -U isegroup -d votre_base -f backend/scripts/preview_changes.sql
```

**Résultat :** Affiche tous les agents qui seront modifiés SANS les modifier

### Option B : Mise à jour avec transaction manuelle

```bash
psql -U isegroup -d votre_base -f backend/scripts/update_agent_types.sql
```

Ensuite, dans psql :
- Pour **VALIDER** : `COMMIT;`
- Pour **ANNULER** : `ROLLBACK;`

### Option C : Mise à jour automatique

```bash
psql -U isegroup -d votre_base -f backend/scripts/update_types_simple.sql
```

**⚠️ Attention** : Cette version applique immédiatement les changements !

---

## 📝 Scripts disponibles

| Fichier | Description | Usage |
|---------|-------------|-------|
| `analyze_agent_types.sql` | Analyse détaillée de l'état actuel | Lecture seule |
| `preview_changes.sql` | Prévisualisation des changements | Lecture seule |
| `update_agent_types.sql` | Mise à jour avec transaction manuelle | COMMIT/ROLLBACK manuel |
| `update_types_simple.sql` | Mise à jour automatique | Application immédiate |
| `updateAgentTypes.js` | Script Node.js avec simulation | **RECOMMANDÉ** |

---

## 🔍 Vérifications post-mise à jour

### 1. Vérifier le nombre d'agents par type

```sql
SELECT 
    ta.libele as type_agent,
    COUNT(*) as nombre
FROM agents a
LEFT JOIN type_d_agents ta ON a.id_type_d_agent = ta.id
GROUP BY ta.libele
ORDER BY nombre DESC;
```

**Résultat attendu :**
- FONCTIONNAIRE : ~740
- CONTRACTUEL : ~89

### 2. Vérifier qu'aucun agent n'est sans type

```sql
SELECT COUNT(*) as agents_sans_type
FROM agents
WHERE id_type_d_agent IS NULL;
```

**Résultat attendu :** 0

### 3. Vérifier la cohérence catégorie-type

```sql
SELECT 
    COALESCE(c.libele, 'SANS CATÉGORIE') as categorie,
    ta.libele as type_agent,
    COUNT(*) as nombre
FROM agents a
LEFT JOIN categories c ON a.id_categorie = c.id
LEFT JOIN type_d_agents ta ON a.id_type_d_agent = ta.id
GROUP BY c.libele, ta.libele
ORDER BY 
    CASE 
        WHEN c.libele = 'A' THEN 1
        WHEN c.libele = 'B' THEN 2
        WHEN c.libele = 'C' THEN 3
        WHEN c.libele = 'D' THEN 4
        ELSE 5
    END;
```

**Résultat attendu :**
- Catégorie A, B, C, D → Type FONCTIONNAIRE
- SANS CATÉGORIE → Type CONTRACTUEL (ou BNETD, CONTRACTUEL ARTICLE 18)

---

## 🛡️ Sécurité et sauvegarde

### Sauvegarde avant mise à jour

**OBLIGATOIRE** : Faites une sauvegarde complète avant d'exécuter le script :

```bash
# Sauvegarde complète
pg_dump -U isegroup votre_base > backup_avant_update_types_$(date +%Y%m%d_%H%M%S).sql

# Ou sauvegarde de la table agents uniquement
pg_dump -U isegroup -t agents votre_base > backup_agents_$(date +%Y%m%d_%H%M%S).sql
```

### Restauration en cas de problème

```bash
psql -U isegroup votre_base < backup_avant_update_types_YYYYMMDD_HHMMSS.sql
```

---

## 📞 Support

En cas de problème :
1. Vérifiez les logs d'erreur
2. Consultez le fichier README_UPDATE_TYPES.md
3. Exécutez le script d'analyse pour diagnostiquer

---

## ✅ Checklist de validation

- [ ] Sauvegarde effectuée
- [ ] Script d'analyse exécuté
- [ ] Résultats de l'analyse vérifiés
- [ ] Prévisualisation des changements effectuée
- [ ] Mise à jour exécutée (simulation d'abord)
- [ ] Vérifications post-mise à jour effectuées
- [ ] Résultats conformes aux attentes
- [ ] Application validée (COMMIT)

---

## 📊 Exemple de résultat final attendu

```
AVANT MISE À JOUR :
  Total : 829 agents
  SANS TYPE : 829 agents

APRÈS MISE À JOUR :
  Total : 829 agents
  FONCTIONNAIRE : 740 agents
  CONTRACTUEL : 89 agents
  SANS TYPE : 0 agents
```

---

**Date de création** : 2025-11-06  
**Version** : 1.0  
**Auteur** : Système RH - Ministère du Tourisme et des Loisirs

