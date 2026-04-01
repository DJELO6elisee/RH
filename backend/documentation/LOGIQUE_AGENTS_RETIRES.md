# 📋 LOGIQUE POUR LA LISTE "AGENTS RETIRÉS"

## 🎯 Vue d'ensemble

Il existe **DEUX listes différentes** dans l'application :

1. **"Agents Retirés"** (Bouton rose) → Utilise la méthode `getRetiredAgents`
2. **"Agents à la Retraite"** (Bouton bleu) → Utilise la méthode `getRetiredByRetirement`

Ce document explique la logique pour la première liste : **"Agents Retirés"**.

---

## ✅ LOGIQUE POUR "AGENTS RETIRÉS"

### Condition unique pour qu'un agent apparaisse :

Un agent apparaît dans la liste **"Agents Retirés"** si et seulement si :

```sql
a.retire = true
```

### Détails :

- **Colonne utilisée** : `retire` (type BOOLEAN) dans la table `agents`
- **Condition** : `retire` doit être égal à `true` (vrai)
- **Type de retrait** : Retrait **manuel/administratif**

### Comment un agent arrive dans cette liste ?

Un agent apparaît dans cette liste uniquement si :
1. Un administrateur marque manuellement l'agent comme retiré
2. Cela se fait généralement via :
   - La suppression d'un agent (qui le marque comme `retire = true` au lieu de le supprimer réellement)
   - Une action administrative explicite pour retirer un agent
   - Via l'API ou une opération manuelle en base de données

### Exemple SQL :

```sql
-- Pour marquer un agent comme retiré
UPDATE agents 
SET retire = true, 
    date_retrait = CURRENT_TIMESTAMP 
WHERE id = 123;

-- Pour voir tous les agents retirés
SELECT * FROM agents WHERE retire = true;
```

---

## 🔍 COMPARAISON DES DEUX LISTES

| Critère | **"Agents Retirés"** | **"Agents à la Retraite"** |
|---------|---------------------|---------------------------|
| **Méthode** | `getRetiredAgents` | `getRetiredByRetirement` |
| **Condition** | `retire = true` | Calcul automatique basé sur date de naissance + grade |
| **Type** | Retrait manuel/administratif | Retraite calculée automatiquement |
| **Quand ?** | Quand un admin le décide | Quand l'agent atteint l'âge de retraite selon les règles |
| **Fonctionnaires seulement ?** | Non, tous les types d'agents | Oui, uniquement les fonctionnaires |
| **Date utilisée** | `date_retrait` (date du retrait manuel) | `date_de_naissance` (pour calculer la retraite) |

---

## 📝 CODE SOURCE

### Méthode `getRetiredAgents` :

```javascript
// backend/controllers/AgentsController.js - ligne 2003

async getRetiredAgents(req, res) {
    // ...
    const query = `
        SELECT ...
        FROM agents a
        ...
        WHERE a.retire = true
    `;
    // ...
}
```

### Route API :

```
GET /api/agents/retired
```

---

## 🛠️ UTILISATION

### Pour retirer un agent manuellement :

1. **Via l'interface** : Supprimer un agent (il sera marqué comme retiré)
2. **Via l'API** : `DELETE /api/agents/:id` (marque `retire = true`)
3. **Via SQL direct** :
   ```sql
   UPDATE agents 
   SET retire = true, 
       date_retrait = CURRENT_TIMESTAMP 
   WHERE matricule = 'XXXXXX';
   ```

### Pour restaurer un agent retiré :

1. **Via l'interface** : Bouton "Restaurer" dans la liste "Agents Retirés"
2. **Via l'API** : `POST /api/agents/:id/restore`
3. **Via SQL direct** :
   ```sql
   UPDATE agents 
   SET retire = false, 
       date_retrait = NULL 
   WHERE matricule = 'XXXXXX';
   ```

---

## ⚠️ NOTES IMPORTANTES

1. **Pas de calcul automatique** : Cette liste ne calcule rien automatiquement, c'est un retrait manuel
2. **Tous types d'agents** : Fonctionnaires ET contractuels peuvent être dans cette liste
3. **Différent de la retraite** : Ce n'est pas basé sur l'âge ou le calcul de retraite
4. **Historique** : Les agents retirés sont conservés pour l'historique (soft delete)

---

## 📊 EXEMPLE DE REQUÊTE SQL

```sql
-- Voir tous les agents retirés
SELECT 
    a.id,
    a.matricule,
    a.nom,
    a.prenom,
    a.date_retrait,
    a.retire,
    ta.libele as type_agent
FROM agents a
LEFT JOIN type_d_agents ta ON a.id_type_d_agent = ta.id
WHERE a.retire = true
ORDER BY a.date_retrait DESC;
```

---

## ✅ RÉSUMÉ

**Pour qu'un agent apparaisse dans la liste "Agents Retirés" :**

```
✅ UNE SEULE CONDITION : retire = true
```

**Aucun autre critère n'est nécessaire** (pas de date, pas de calcul, pas de vérification de type d'agent).

