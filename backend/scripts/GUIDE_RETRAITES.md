# 🎯 GUIDE : SYSTÈME DE GESTION DES RETRAITES

## 📋 Vue d'ensemble

Ce système calcule automatiquement les dates de retraite des agents selon des règles précises basées sur leur grade.

---

## 📐 RÈGLES DE CALCUL

### Âge de retraite selon le grade

| Grade | Âge de retraite | Catégorie |
|-------|----------------|-----------|
| A4    | **65 ans** 🔵 | Catégorie A supérieure |
| A5    | **65 ans** 🔵 | Catégorie A supérieure |
| A6    | **65 ans** 🔵 | Catégorie A supérieure |
| A7    | **65 ans** 🔵 | Catégorie A supérieure |
| A3    | **60 ans** ⚪ | Autres grades |
| B1-B3 | **60 ans** ⚪ | Autres grades |
| C1-C2 | **60 ans** ⚪ | Autres grades |
| D1    | **60 ans** ⚪ | Autres grades |
| Aucun | **60 ans** ⚪ | Par défaut |

### Date de retraite

La date de retraite est **toujours le 31 décembre** de l'année où l'agent atteint l'âge de retraite.

**Exemple 1 :**
- Agent né le : 15 mars 1965
- Grade : A5
- Âge de retraite : 65 ans
- Année de retraite : 1965 + 65 = 2030
- **Date de retraite : 31/12/2030**

**Exemple 2 :**
- Agent né le : 8 juillet 1970
- Grade : B3
- Âge de retraite : 60 ans
- Année de retraite : 1970 + 60 = 2030
- **Date de retraite : 31/12/2030**

---

## 🚀 MÉTHODES DE CALCUL

### Méthode 1 : Script Node.js automatique (RECOMMANDÉE)

**Avantages :**
- ✅ Prévisualisation avec `--simulate`
- ✅ Statistiques détaillées
- ✅ Gestion d'erreurs
- ✅ Mode transactionnel

**Commandes :**

```bash
# Simulation (prévisualiser sans modifier)
node backend/scripts/calculateRetirementDates.js --simulate

# Application (modifier la base de données)
node backend/scripts/calculateRetirementDates.js --apply
```

### Méthode 2 : Via l'interface web

1. Connectez-vous à l'application
2. Menu : **Gestion du Personnel** → **RETRAITES**
3. Cliquez sur le bouton **"Calculer les dates de retraite"**
4. Confirmez l'action

### Méthode 3 : Via l'API (pour développeurs)

```bash
# POST /api/agents/batch-calculate-retirement
curl -X POST https://tourisme.2ise-groupe.com/api/agents/batch-calculate-retirement \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📊 FONCTIONNALITÉS DE LA PAGE RETRAITES

### Statistiques affichées

1. **Déjà retraités** (Badge rouge) : Nombre d'agents avec statut "retraite"
2. **Retraites cette année** (Badge jaune) : Agents qui partiront dans les 12 mois
3. **Retraites dans 5 ans** (Badge bleu) : Agents qui partiront dans 1-5 ans
4. **Sans date calculée** (Badge gris) : Agents sans date de retraite

### Filtres disponibles

- **Statut** : Retraité / Actif / Tous
- **Sexe** : Masculin / Féminin / Tous
- **Type d'Agent** : FONCTIONNAIRE / CONTRACTUEL / Tous
- **Catégorie** : A / B / C / D / Toutes

### Colonnes du tableau

1. **#** - Numérotation
2. **Matricule** - Identifiant unique
3. **Nom et Prénom** - Identité complète
4. **Sexe** - Badge M/F
5. **Date de Naissance** - Format DD/MM/YYYY
6. **Âge Retraite** - Badge 60 ans ou 65 ans
7. **Date de Retraite** - 31/12/YYYY
8. **Statut** - Badge dynamique :
   - "Retraité" (rouge) si déjà retraité
   - "Retraite dans X mois" (jaune) si < 12 mois
   - "Retraite dans X ans" (bleu) si < 5 ans
   - "Actif" (vert) sinon
9. **Type d'Agent** - FONCTIONNAIRE/CONTRACTUEL
10. **Grade** - A3, A4, B3, etc.
11. **Catégorie** - A, B, C, D
12. **Direction** - Direction d'affectation
13. **Téléphone** - Contact

### Exports disponibles

- 🖨️ **Impression** - Aperçu avant impression
- 📊 **Excel (.xlsx)** - Export complet avec formatage
- 📄 **PDF (.pdf)** - Document professionnel

---

## 🔧 SCRIPT DE CALCUL AUTOMATIQUE

### Fonctionnement

Le script `calculateRetirementDates.js` :

1. Se connecte à la base de données
2. Récupère tous les agents actifs avec date de naissance
3. Pour chaque agent :
   - Identifie son grade
   - Calcule l'âge de retraite (60 ou 65 ans)
   - Calcule la date de retraite (31/12/YYYY)
   - Met à jour la base de données
4. Affiche les statistiques

### Statistiques fournies

- Total d'agents traités
- Nombre de mises à jour
- Nombre de dates inchangées
- Répartition par âge de retraite (60 vs 65 ans)
- Liste des erreurs éventuelles
- Échantillon de 10 agents avec leurs dates

---

## 📝 EXEMPLES D'UTILISATION

### Exemple 1 : Première exécution (simulation)

```bash
$ node backend/scripts/calculateRetirementDates.js --simulate

ℹ️  Mode : SIMULATION
ℹ️  Connexion à la base de données...
ℹ️  867 agents à traiter

📊 Traitement des agents...

  ✏️  201957B - AGENT Nom Prenom
      Grade: A5 → Âge retraite: 65 ans
      Date retraite: Aucune → 31/12/2042

...

============================================================
RÉSUMÉ DU CALCUL DES DATES DE RETRAITE
============================================================

📊 Total d'agents traités : 867
✅ Mises à jour effectuées : 740
➡️  Dates inchangées : 127

🔵 Agents avec retraite à 65 ans (A4-A7) : 158
🔘 Agents avec retraite à 60 ans (autres grades) : 582
⚪ Agents sans grade : 127

⚠️  Mode SIMULATION - Aucun changement appliqué (ROLLBACK)

💡 Pour appliquer les changements, exécutez :
   node calculateRetirementDates.js --apply
```

### Exemple 2 : Application des changements

```bash
$ node backend/scripts/calculateRetirementDates.js --apply

ℹ️  Mode : APPLICATION
✅ 740 agents mis à jour avec succès
✅ Changements APPLIQUÉS avec succès ! (COMMIT)
```

---

## 🔍 VÉRIFICATION DES RÉSULTATS

### Requête SQL pour vérifier

```sql
-- Voir les agents avec leur date de retraite calculée
SELECT 
    a.matricule,
    a.nom,
    a.prenom,
    a.date_de_naissance,
    g.libele as grade,
    a.date_retraite,
    EXTRACT(YEAR FROM a.date_retraite) - EXTRACT(YEAR FROM a.date_de_naissance) as age_retraite
FROM agents a
LEFT JOIN grades g ON a.id_grade = g.id
WHERE a.date_retraite IS NOT NULL
ORDER BY a.date_retraite DESC
LIMIT 20;
```

### Vérifier les âges de retraite

```sql
-- Répartition par âge de retraite calculé
SELECT 
    EXTRACT(YEAR FROM a.date_retraite) - EXTRACT(YEAR FROM a.date_de_naissance) as age_retraite,
    COUNT(*) as nombre,
    STRING_AGG(DISTINCT g.libele, ', ') as grades
FROM agents a
LEFT JOIN grades g ON a.id_grade = g.id
WHERE a.date_retraite IS NOT NULL
GROUP BY age_retraite
ORDER BY age_retraite;
```

**Résultat attendu :**
- 60 ans : ~582 agents (grades A3, B1, B2, B3, C1, C2, D1)
- 65 ans : ~158 agents (grades A4, A5, A6, A7)

---

## 🆘 PROBLÈMES COURANTS

### Problème 1 : "Date de naissance non renseignée"

**Solution :** Certains agents n'ont pas de date de naissance. Le script les ignore automatiquement.

**Action recommandée :** Renseigner les dates de naissance manquantes, puis relancer le calcul.

### Problème 2 : "Dates déjà à jour"

**Cause :** Les dates de retraite ont déjà été calculées précédemment.

**Solution :** C'est normal ! Le script ne modifie que les dates qui ont changé.

### Problème 3 : "Aucun changement appliqué"

**Cause :** Vous êtes en mode `--simulate`

**Solution :** Utilisez `--apply` pour appliquer les changements.

---

## 🔄 MISE À JOUR AUTOMATIQUE

### Quand recalculer les dates de retraite ?

Recalculez les dates de retraite après :

1. ✅ **Mise à jour des grades** (un agent change de grade)
2. ✅ **Ajout de nouveaux agents**
3. ✅ **Correction d'une date de naissance**
4. ✅ **Changement de grade d'un agent**

### Automatisation recommandée

Vous pouvez automatiser le calcul en :

1. **Ajoutant un trigger SQL** qui calcule automatiquement à la création/modification
2. **Exécutant le script périodiquement** (ex: chaque nuit via un cron job)
3. **Utilisant le bouton dans l'interface** après chaque mise à jour de grades

---

## 🎯 ROUTES API DISPONIBLES

### 1. Calculer pour un agent spécifique

```
GET /api/agents/:id/calculate-retirement
```

Calcule et met à jour la date de retraite d'un seul agent.

### 2. Calcul en masse

```
POST /api/agents/batch-calculate-retirement
```

Calcule et met à jour les dates pour TOUS les agents actifs.

### 3. Statistiques des retraites

```
GET /api/agents/retirement-stats
```

Retourne :
- Nombre d'agents déjà retraités
- Retraites prévues cette année
- Retraites dans les 5 prochaines années
- Agents sans date calculée

---

## 📈 STATISTIQUES ATTENDUES

Après exécution du script sur votre base actuelle :

- **~740 agents** auront une date de retraite calculée
- **~158 agents** partiront à 65 ans (grades A4-A7)
- **~582 agents** partiront à 60 ans (autres grades)
- **~127 agents** sans grade resteront à 60 ans par défaut

---

## 💡 CONSEILS

1. 🔹 **Faites toujours une simulation d'abord** (`--simulate`)
2. 🔹 **Sauvegardez votre base** avant d'appliquer
3. 🔹 **Vérifiez les statistiques** pour détecter les anomalies
4. 🔹 **Utilisez les filtres** dans l'interface pour analyser par catégorie
5. 🔹 **Exportez régulièrement** la liste des retraites prévues

---

**Créé le :** ${new Date().toLocaleDateString('fr-FR')}  
**Version :** 1.0  
**Auteur :** Système RH Automatisé

