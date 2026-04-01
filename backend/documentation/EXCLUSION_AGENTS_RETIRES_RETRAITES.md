# 📋 EXCLUSION DES AGENTS RETIRÉS ET À LA RETRAITE

## 🎯 Vue d'ensemble

Les agents **retirés** et **à la retraite** sont maintenant exclus de :
1. ✅ L'effectif du ministère (statistiques)
2. ✅ La connexion au système
3. ✅ Les listes d'agents actifs

## 🔒 BLOCAGE DE LA CONNEXION

### Agents concernés :

1. **Agents retirés manuellement** (`retire = true`)
2. **Agents fonctionnaires à la retraite** (calcul basé sur date de naissance + grade)

### Logique de blocage :

```javascript
// Vérification dans AgentAuthController.loginWithCode

// 1. Agent retiré manuellement
if (agent.retire === true) {
    return res.status(403).json({
        error: 'Vous n\'avez plus droit d\'accès au système. Votre compte a été retiré.'
    });
}

// 2. Agent fonctionnaire à la retraite
if (date_retraite_calculee < date_actuelle) {
    return res.status(403).json({
        error: 'Vous n\'avez plus droit d\'accès au système. Vous êtes à la retraite depuis le [date].'
    });
}
```

### Message d'erreur :

- **Agent retiré** : "Vous n'avez plus droit d'accès au système. Votre compte a été retiré."
- **Agent à la retraite** : "Vous n'avez plus droit d'accès au système. Vous êtes à la retraite depuis le [date]."

---

## 📊 EXCLUSION DE L'EFFECTIF

### Statistiques du ministère :

Les agents retirés et à la retraite sont **exclus** du calcul de :
- `total_agents` (effectif total)
- `hommes` / `femmes`
- `fonctionnaires`, `contractuels`, etc.
- `age_moyen`
- Toutes les statistiques détaillées

### Condition SQL d'exclusion :

```sql
-- Exclure les agents retirés manuellement
(a.retire IS NULL OR a.retire = false)

AND

-- Exclure les agents fonctionnaires à la retraite
NOT (
    a.id_type_d_agent = 1
    AND a.date_de_naissance IS NOT NULL
    AND g.libele IS NOT NULL
    AND MAKE_DATE(
        EXTRACT(YEAR FROM a.date_de_naissance)::INTEGER + 
        CASE 
            WHEN UPPER(REPLACE(g.libele, ' ', '')) IN ('A4', 'A5', 'A6', 'A7') THEN 65
            ELSE 60
        END,
        12,
        31
    )::DATE < CURRENT_DATE::DATE
)
```

### Endroits où l'exclusion est appliquée :

1. ✅ `MinisteresController.getByIdWithDetails` - Statistiques du ministère
2. ✅ `AgentsController.getAll` - Liste principale des agents
3. ✅ `AgentsController.getStats` - Statistiques globales
4. ✅ `AgentsController.create` - Détermination du premier agent (DRH/drh)

---

## 🔄 RESTAURATION D'UN AGENT

### Méthode `restore` :

Quand un agent retiré est restauré :

1. ✅ `retire` est remis à `false`
2. ✅ `date_retrait` est remis à `NULL`
3. ✅ Le compte utilisateur associé est réactivé (`is_active = true`)
4. ✅ **L'agent re-impactera l'effectif du ministère**
5. ✅ **L'agent pourra se connecter avec le même mot de passe**

### Code de restauration :

```javascript
// Restaurer l'agent
await pool.query(
    'UPDATE agents SET retire = false, date_retrait = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
    [id]
);

// Réactiver le compte utilisateur
await pool.query(
    'UPDATE utilisateurs SET is_active = true WHERE id_agent = $1',
    [id]
);
```

---

## 📝 RÉSUMÉ DES MODIFICATIONS

### Fichiers modifiés :

1. **`backend/controllers/AgentAuthController.js`**
   - Ajout vérification agents retirés
   - Ajout vérification agents à la retraite (calcul)
   - Messages d'erreur explicites

2. **`backend/services/authCodeService.js`**
   - Modification `getAgentByMatricule` pour inclure grade et type d'agent

3. **`backend/controllers/AgentsController.js`**
   - Ajout méthode `getActiveAgentsExclusionCondition`
   - Modification `getAll` pour exclure retirés et retraités
   - Modification `getStats` pour exclure retirés et retraités
   - Modification `create` (comptage premier agent) pour exclure retirés et retraités

4. **`backend/controllers/MinisteresController.js`**
   - Modification `getByIdWithDetails` :
     - Requête agents : exclut retirés et retraités
     - Statistiques : exclut retirés et retraités

---

## ✅ VÉRIFICATIONS

### Après restauration d'un agent :

1. ✅ L'agent apparaît dans `GET /api/agents` (liste principale)
2. ✅ L'effectif du ministère est mis à jour
3. ✅ L'agent peut se connecter avec ses identifiants
4. ✅ L'agent n'apparaît plus dans "Agents Retirés"

---

## 🔍 LOGIQUE DE CALCUL POUR AGENTS À LA RETRAITE

Un agent fonctionnaire est considéré à la retraite si :

1. ✅ `id_type_d_agent = 1` (FONCTIONNAIRE)
2. ✅ `date_de_naissance IS NOT NULL`
3. ✅ `grade_libele IS NOT NULL`
4. ✅ Date de retraite calculée < date actuelle

**Date de retraite calculée** :
- Grade A4, A5, A6, A7 : `date_de_naissance + 65 ans → 31/12/[année]`
- Autres grades : `date_de_naissance + 60 ans → 31/12/[année]`

---

## ⚠️ IMPORTANT

- Les **agents retirés manuellement** (`retire = true`) sont exclus automatiquement
- Les **agents fonctionnaires à la retraite** sont calculés automatiquement (pas besoin de `retire = true`)
- Un agent restauré retrouve automatiquement tous ses droits

