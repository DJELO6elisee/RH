# Guide de calcul des dates de retraite

## 📋 Vue d'ensemble

Ce système calcule automatiquement les dates de retraite pour tous les agents en fonction de leur grade et date de naissance.

## 🔢 Règles de calcul

### Âge de retraite selon le grade

| Grades | Âge de retraite |
|--------|----------------|
| A4, A5, A6, A7 | **65 ans** |
| Tous les autres grades | **60 ans** |
| Sans grade | **60 ans** (défaut) |

### Date de retraite

La date de retraite est **toujours le 31 décembre** de l'année où l'agent atteint l'âge de retraite.

**Exemple :**
- Agent né le 15 mars 1965
- Grade : A3 (retraite à 60 ans)
- Âge de retraite atteint : 2025 (1965 + 60)
- **Date de retraite : 31 décembre 2025**

## 🚀 Méthodes de calcul

### Méthode 1 : Calcul en masse (Recommandé) ✅

Calcule les dates de retraite pour **tous les agents actifs** en une seule opération.

#### Via PowerShell (Windows)

```powershell
cd "C:\Users\HP\Desktop\All Folder\RH\backend\scripts"
.\calculer-retraites.ps1

# Avec authentification
.\calculer-retraites.ps1 -Token "VOTRE_TOKEN_JWT"
```

#### Via Bash (Linux/Mac)

```bash
cd backend/scripts
chmod +x calculer-retraites.sh
./calculer-retraites.sh

# Avec authentification
./calculer-retraites.sh "VOTRE_TOKEN_JWT"
```

#### Via cURL

```bash
curl -X POST https://tourisme.2ise-groupe.com/api/agents/batch-calculate-retirement \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer VOTRE_TOKEN_JWT"
```

#### Réponse attendue

```json
{
  "success": true,
  "message": "Calcul des dates de retraite terminé",
  "data": {
    "total_agents": 1234,
    "updated": 1234,
    "errors": 0,
    "error_details": []
  }
}
```

### Méthode 2 : Calcul individuel

Calcule la date de retraite pour **un seul agent** spécifique.

#### Endpoint

```
GET /api/agents/:id/calculate-retirement
```

#### Exemple

```bash
# Calculer pour l'agent avec ID = 42
curl -X GET https://tourisme.2ise-groupe.com/api/agents/42/calculate-retirement \
  -H "Authorization: Bearer VOTRE_TOKEN_JWT"
```

#### Réponse

```json
{
  "success": true,
  "message": "Date de retraite calculée et mise à jour",
  "data": {
    "agent": "DUPONT Jean",
    "matricule": "12345",
    "grade": "A3",
    "date_naissance": "1965-03-15",
    "age_retraite": 60,
    "date_retraite": "2025-12-31"
  }
}
```

## 📊 Vérification des résultats

### 1. Consulter les projections de retraite

Après le calcul, consultez les projections sur les prochaines années :

```bash
# Projections sur 5 ans
GET https://tourisme.2ise-groupe.com/api/agents/retirement-projection?years=5

# Projections sur 20 ans
GET https://tourisme.2ise-groupe.com/api/agents/retirement-projection?years=20
```

### 2. Consulter les statistiques

```bash
GET https://tourisme.2ise-groupe.com/api/agents/retirement-stats
```

## ⚠️ Conditions pour le calcul

Le système calcule les dates de retraite uniquement pour les agents qui :

✅ Ont une **date de naissance** enregistrée
✅ Ne sont PAS en statut : `licencié`, `démission`, ou `retraité`
✅ Sont actifs dans le système

## 🔧 Dépannage

### Problème : "0 agents mis à jour"

**Causes possibles :**
- Aucun agent n'a de date de naissance
- Tous les agents sont déjà en retraite/licenciés/démissionnés

**Solution :**
Vérifiez les données dans la base :

```sql
-- Vérifier les agents sans date de naissance
SELECT COUNT(*) FROM agents WHERE date_de_naissance IS NULL AND statut_emploi = 'actif';

-- Vérifier la distribution des statuts
SELECT statut_emploi, COUNT(*) FROM agents GROUP BY statut_emploi;
```

### Problème : Erreurs lors du calcul

Consultez le champ `error_details` dans la réponse pour identifier les agents problématiques.

## 📝 Logs du serveur

Le processus de calcul génère des logs détaillés :

```bash
# Voir les logs en temps réel
pm2 logs tourisme

# Exemples de logs
🔄 Début du calcul en masse des dates de retraite...
📊 1234 agents à traiter
✅ 100 agents traités...
✅ 200 agents traités...
✅ Mise à jour terminée : 1234 agents mis à jour
```

## 🎯 Prochaines étapes

Après avoir calculé les dates de retraite :

1. ✅ Consultez les projections sur plusieurs années
2. ✅ Analysez les statistiques de retraite
3. ✅ Planifiez les recrutements futurs
4. ✅ Exportez les données pour les rapports RH

## 📞 Support

En cas de problème, vérifiez :
- Les logs du serveur (`pm2 logs tourisme`)
- La console de votre navigateur (F12)
- Les erreurs SQL dans les logs PostgreSQL


















