# 🎯 GUIDE : MISE À JOUR DES GRADES

## 📋 Vue d'ensemble

Ce guide explique comment mettre à jour les **grades** des agents depuis le fichier CSV vers la base de données PostgreSQL.

---

## 🚀 DÉMARRAGE RAPIDE (2 étapes)

### Étape 1 : Simulation (Prévisualisation)
```bash
node backend/scripts/updateAgentGrades.js --simulate
```

✅ Vérifiez que tout est correct dans la prévisualisation

### Étape 2 : Application (Définitif)
```bash
node backend/scripts/updateAgentGrades.js --apply
```

🎉 **C'est terminé !**

---

## 📊 Grades disponibles

Les grades sont composés de la **catégorie** + **numéro** :

| Grade | ID  | Description        |
|-------|-----|--------------------|
| A3    | 37  | Catégorie A, Grade 3 |
| A4    | 38  | Catégorie A, Grade 4 |
| A5    | 39  | Catégorie A, Grade 5 |
| A6    | 40  | Catégorie A, Grade 6 |
| A7    | 41  | Catégorie A, Grade 7 |
| B1    | 42  | Catégorie B, Grade 1 |
| B2    | 43  | Catégorie B, Grade 2 |
| B3    | 44  | Catégorie B, Grade 3 |
| C1    | 45  | Catégorie C, Grade 1 |
| C2    | 46  | Catégorie C, Grade 2 |
| D1    | 47  | Catégorie D, Grade 1 |

---

## 🛠 Méthodes disponibles

### Méthode 1 : Script Node.js automatique (RECOMMANDÉE)

**Avantages :**
- ✅ Prévisualisation avec `--simulate`
- ✅ Statistiques avant/après
- ✅ Validation automatique
- ✅ Gestion d'erreurs
- ✅ Mode transactionnel (tout ou rien)

**Commandes :**
```bash
# Simulation
node backend/scripts/updateAgentGrades.js --simulate

# Application
node backend/scripts/updateAgentGrades.js --apply
```

### Méthode 2 : Script SQL direct

**Avantages :**
- ✅ Exécution rapide
- ✅ Peut être modifié manuellement

**Commande :**
```bash
psql -U isegroup -d rh -f backend/scripts/update_grades_from_csv.sql
```

⚠️ **Attention :** Pensez à décommenter `COMMIT` ou `ROLLBACK` à la fin du fichier SQL !

---

## 📈 Statistiques attendues

D'après l'analyse du CSV, voici la répartition des grades :

- **Grade A3** : 117 agents
- **Grade A4** : 122 agents
- **Grade A5** : 25 agents
- **Grade A6** : 6 agents
- **Grade A7** : 4 agents
- **Grade B1** : 51 agents
- **Grade B3** : 335 agents
- **Grade C1** : 50 agents
- **Grade C2** : 4 agents
- **Grade D1** : 26 agents

**Total : 740 agents** avec un grade défini

---

## 🔍 Vérification des résultats

Après avoir appliqué les changements, vérifiez avec cette requête :

```sql
-- Statistiques des grades
SELECT 
    COALESCE(g.libele, 'SANS GRADE') as grade,
    COUNT(*) as nombre
FROM agents a
LEFT JOIN grades g ON a.id_grade = g.id
GROUP BY g.libele, g.id
ORDER BY g.libele;
```

---

## 🎯 Logique de mise à jour

Le script combine :
1. **Catégorie** (colonne 3 du CSV) : A, B, C ou D
2. **Numéro de grade** (colonne 4 du CSV) : 1, 2, 3, 4, 5, 6 ou 7

Exemple : 
- CSV : Catégorie = `A`, Grade = `3` → **Grade A3** (id=37)
- CSV : Catégorie = `B`, Grade = `3` → **Grade B3** (id=44)

---

## 🆘 Problèmes courants

### Problème : "Grade non reconnu"

**Cause :** Le grade n'existe pas dans la table `grades`

**Solution :** 
1. Vérifiez les grades disponibles : `SELECT * FROM grades;`
2. Ajoutez les grades manquants si nécessaire
3. Ou ignorez si ce sont des données invalides

### Problème : "Matricule non trouvé"

**Cause :** Le matricule du CSV n'existe pas dans la table `agents`

**Solution :**
1. Vérifiez que les agents ont bien été importés
2. Vérifiez l'orthographe des matricules

---

## 📝 Notes importantes

1. ⚠️ **Faites toujours une simulation d'abord** avec `--simulate`
2. 💾 **Sauvegardez votre base** avant d'appliquer les changements
3. 📊 Les statistiques avant/après vous permettent de valider les changements
4. 🔄 Le script est **transactionnel** : soit tout passe, soit rien ne passe

---

## 🔗 Ordre de mise à jour recommandé

1. ✅ **Catégories** (déjà fait)
2. 🔵 **Grades** (vous êtes ici)
3. ⏳ **Types d'agents** (à refaire après les grades)

---

## 📞 Support

Si vous rencontrez des problèmes :
1. Vérifiez les logs d'erreur
2. Assurez-vous que la base de données est accessible
3. Vérifiez que le fichier CSV est au bon endroit

---

**Créé le :** ${new Date().toLocaleDateString('fr-FR')}  
**Version :** 1.0

