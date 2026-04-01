# Guide d'importation des agents depuis un fichier CSV

Ce guide explique comment importer les données des agents depuis votre fichier CSV `Liste-du-Personel-_1_.csv` vers la base de données PostgreSQL.

## 📋 Prérequis

1. **Package CSV Parser** : Installez le package `csv-parser` si ce n'est pas déjà fait :
   ```bash
   cd backend
   npm install csv-parser
   ```

2. **Base de données** : Assurez-vous que votre base de données PostgreSQL est configurée et accessible.

3. **Fichier CSV** : Le fichier `Liste-du-Personel-_1_.csv` doit être à la racine du projet.

## 🗂️ Structure du CSV

Le fichier CSV contient les colonnes suivantes :
- **Matricule** : Identifiant unique de l'agent
- **Nom et Prénom** : Nom complet de l'agent
- **Sexe** : M ou F
- **Date nais.** : Date de naissance (format M/D/YYYY)
- **1ère PS** : Première prise de service
- **PS Min.** : Prise de service au ministère
- **PS Dir.** : Prise de service dans la direction
- **Localité** : Lieu de naissance/localité
- **Direction** : Direction d'affectation
- **Service** : Service d'affectation
- **Position** : Position administrative
- **Emploi** : Emploi de l'agent
- **Echelon** : Échelon de l'agent
- **fonction** : Fonction actuelle
- **N° tel. bureau**, **N° tel. domicile**, **N° tel. cellulaire** : Téléphones
- **Adresse mail** : Email

## 🚀 Scripts disponibles

### 1. Script de base : `import_agents_from_csv.js`

Ce script importe uniquement les données de base des agents.

**Utilisation :**
```bash
cd backend
node scripts/import_agents_from_csv.js
```

Ou avec un chemin personnalisé :
```bash
node scripts/import_agents_from_csv.js /chemin/vers/fichier.csv
```

**Fonctionnalités :**
- ✅ Import des informations de base (nom, prénom, matricule, dates, contacts)
- ✅ Création automatique des localités, directions, services et positions manquants
- ✅ Détection des agents déjà existants (évite les doublons)
- ✅ Validation des données (sexe, dates, matricule)

### 2. Script avancé : `import_agents_advanced.js` ⭐ RECOMMANDÉ

Ce script gère également les tables de référence et l'historique des fonctions.

**Utilisation :**
```bash
cd backend
node scripts/import_agents_advanced.js
```

**Fonctionnalités supplémentaires :**
- ✅ Toutes les fonctionnalités du script de base
- ✅ Création automatique des emplois
- ✅ Gestion des échelons
- ✅ Insertion dans la table `fonction_agents` (historique)
- ✅ Transaction complète (rollback en cas d'erreur)

## 📊 Mapping des colonnes

| Colonne CSV | Champ DB | Table | Remarque |
|-------------|----------|-------|----------|
| Matricule | matricule | agents | Obligatoire, unique |
| Nom et Prénom | nom + prenom | agents | Séparé automatiquement |
| Sexe | sexe | agents | M ou F |
| Date nais. | date_de_naissance | agents | Format M/D/YYYY → YYYY-MM-DD |
| 1ère PS | date_embauche | agents | - |
| PS Min. | date_prise_service_au_ministere | agents | - |
| PS Dir. | date_prise_service_dans_la_direction | agents | - |
| Localité | id_localite | localites | Créé si inexistant |
| Direction | id_direction | directions | Créé si inexistant |
| Service | id_service | services | Cherché, pas créé |
| Position | id_position | positions | Créé si inexistant |
| Emploi | id_emploi | emplois | Créé si inexistant |
| Echelon | id_echelon | echelons | Créé si inexistant |
| fonction | fonction_actuelle | agents | - |
| N° tel. bureau | telephone1 | agents | - |
| N° tel. domicile | telephone2 | agents | - |
| N° tel. cellulaire | telephone1 | agents | Utilisé si tel. bureau vide |
| Adresse mail | email | agents | - |

## ⚠️ Points d'attention

### 1. Lignes ignorées
Le script ignore automatiquement :
- Les lignes de séparation (commençant par "DIR / SER")
- Les lignes avec un matricule vide
- Les lignes où le nom/prénom ne peut pas être parsé

### 2. Doublons
Si un agent avec le même **matricule** existe déjà, il ne sera **pas** importé à nouveau. Le script affichera un avertissement.

### 3. Dates
Les dates vides ou invalides (comme "CPS abs.") sont converties en `NULL`.

### 4. Ministère
Le script recherche automatiquement le ministère contenant "TOURISME" dans son nom. Assurez-vous qu'il existe dans la table `ministeres`.

## 📝 Exemple de résultat

```
🚀 Démarrage de l'importation avancée des agents...

📂 Fichier CSV: C:\Users\HP\Desktop\LES RH\Liste-du-Personel-_1_.csv

📍 Ministère ID: 1

📋 1073 lignes lues du fichier CSV

⏳ Traitement en cours...

✅ 503281V - M'BAHIA BLE LEATITIA JOSEPHA
✅ 201957B - KODJO GUY FRANCIS
✅ 272129B - DOSSANGO KONE
...

📊 RÉSUMÉ DE L'IMPORTATION:
═══════════════════════════════════
📝 Total de lignes traitées: 1073
✅ Agents créés avec succès: 950
⚠️  Agents déjà existants: 23
⏭️  Lignes ignorées (vides): 100
❌ Erreurs rencontrées: 0
═══════════════════════════════════

🎉 Importation terminée avec succès !
```

## 🔧 Personnalisation

### Modifier le mapping
Pour modifier le mapping des colonnes, éditez la fonction `processRow()` dans le script :

```javascript
const agentData = {
    matricule: row.Matricule.trim(),
    nom: nom,
    prenom: prenom,
    // Ajoutez vos propres mappings ici
};
```

### Ajouter des validations
Ajoutez des validations supplémentaires avant l'insertion :

```javascript
// Exemple : valider l'email
if (row['Adresse mail'] && !isValidEmail(row['Adresse mail'])) {
    console.warn(`Email invalide pour ${row.Matricule}`);
    agentData.email = null;
}
```

## 🐛 Dépannage

### Erreur : "Cannot find module 'csv-parser'"
```bash
cd backend
npm install csv-parser
```

### Erreur : "Ministère du Tourisme non trouvé"
Assurez-vous qu'un ministère contenant "TOURISME" existe dans la table `ministeres` :
```sql
SELECT * FROM ministeres WHERE nom LIKE '%TOURISME%';
```

Si absent, créez-le :
```sql
INSERT INTO ministeres (nom, code) VALUES ('MINISTERE DU TOURISME ET DES LOISIRS', 'MTL');
```

### Erreur de connexion à la base de données
Vérifiez le fichier `backend/config/database.js` et assurez-vous que les paramètres de connexion sont corrects.

## 📞 Support

Pour toute question ou problème, consultez les logs détaillés affichés par le script. Chaque erreur est loggée avec le matricule de l'agent concerné.

## ✅ Recommandations

1. **Testez d'abord** sur une copie de votre base de données
2. **Utilisez le script avancé** pour un import complet
3. **Vérifiez les résultats** après l'import avec des requêtes SQL
4. **Sauvegardez** votre base de données avant l'import

```sql
-- Vérifier les agents importés
SELECT COUNT(*) FROM agents;

-- Vérifier un agent spécifique
SELECT * FROM agents WHERE matricule = '503281V';

-- Vérifier les fonctions importées
SELECT a.matricule, a.nom, a.prenom, fa.designation_poste, fa.date_entree
FROM agents a
LEFT JOIN fonction_agents fa ON a.id = fa.id_agent
WHERE a.matricule = '503281V';
```

