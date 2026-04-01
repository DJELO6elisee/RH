# Scripts de création du Ministère de l'Agriculture et agent DRH

## 📋 Description

Ce package contient les scripts nécessaires pour créer :
1. Le Ministère de l'Agriculture
2. Un agent DRH
3. Le rôle DRH (si non existant)
4. Un compte utilisateur avec mot de passe hashé

## 🔧 Prérequis

### Installation de Python et bcrypt

1. **Installer Python** (si ce n'est pas déjà fait)
   - Télécharger depuis https://www.python.org/downloads/

2. **Installer la bibliothèque bcrypt**
   ```bash
   pip install bcrypt
   ```
   
   Ou utiliser le fichier requirements.txt :
   ```bash
   pip install -r requirements.txt
   ```

## 📝 Utilisation

### Étape 1 : Générer le hash du mot de passe

Avant d'exécuter le script SQL, vous devez générer le hash du mot de passe.

#### Option A : Utiliser les valeurs par défaut du script

```bash
python generate_password_hash.py
```

Cela générera le hash pour :
- Nom : `OUATTARA`
- Année de naissance : `1980`
- Mot de passe : `OUATTARA1980`

#### Option B : Personnaliser les valeurs

Modifiez les variables dans `generate_password_hash.py` :
```python
nom = "VOTRE_NOM"
date_naissance = "1980-05-15"  # ou directement
annee_naissance = 1980
```

Puis exécutez :
```bash
python generate_password_hash.py
```

#### Option C : Passer les valeurs en ligne de commande

```bash
python generate_password_hash.py NOM ANNEE
```

Exemple :
```bash
python generate_password_hash.py DIALLO 1985
```

### Étape 2 : Copier le hash dans le script SQL

1. Le script Python affichera le hash généré, par exemple :
   ```
   '$2b$12$XMvlt9KRdgHHq.kf29WdHO5hjqSQSRZJDHGw9ZLzQ6go27YUowOka'
   ```

2. Ouvrez `create_ministere_agriculture_drh.sql`

3. Trouvez la ligne avec `v_password_hash` (ligne ~62)

4. Remplacez la valeur par le hash généré :
   ```sql
   v_password_hash VARCHAR(255) := '$2b$12$VOTRE_HASH_GENERE';
   ```

### Étape 3 : Personnaliser les informations de l'agent (optionnel)

Dans le script SQL, modifiez les variables selon vos besoins :
- `v_matricule` : Matricule de l'agent
- `v_nom` : Nom de l'agent
- `v_prenom` : Prénom de l'agent
- `v_date_naissance` : Date de naissance
- `v_email` : Email de l'agent
- `v_telephone` : Téléphone
- `v_sexe` : Sexe (M ou F)

**Important** : Si vous modifiez le nom ou l'année de naissance, vous devez régénérer le hash du mot de passe !

### Étape 4 : Exécuter le script SQL

```bash
psql -U votre_utilisateur -d votre_base_de_donnees -f create_ministere_agriculture_drh.sql
```

Ou via pgAdmin ou tout autre client PostgreSQL.

## 🔐 Informations de connexion générées

Après l'exécution du script, le compte utilisateur sera créé avec :
- **Nom d'utilisateur** : Le matricule de l'agent (ex: `DRH2024001`)
- **Mot de passe** : Nom + Année de naissance (ex: `OUATTARA1980`)
- **Rôle** : DRH
- **Ministère** : Ministère de l'Agriculture

## ⚠️ Notes importantes

1. **Sécurité** : Le mot de passe est hashé avec bcrypt pour la sécurité
2. **Extension pgcrypto** : Le script SQL n'utilise plus pgcrypto, donc fonctionne même si cette extension n'est pas disponible
3. **Transaction** : Le script utilise une transaction, donc soit tout réussit, soit tout est annulé
4. **Vérification** : Le script inclut des requêtes SELECT à la fin pour vérifier les données créées

## 🐛 Dépannage

### Erreur : "bcrypt not found"
```bash
pip install bcrypt
```

### Erreur : "Le Ministère de l'Agriculture n'a pas été trouvé"
Vérifiez que le code du ministère dans le script correspond bien à celui créé.

### Erreur : "Duplicate key" ou "Violation de contrainte unique"
Le ministère, l'agent ou l'utilisateur existe déjà. Modifiez les valeurs (code, matricule, username) ou supprimez les enregistrements existants.

## 📞 Support

Pour toute question ou problème, vérifiez :
1. Que bcrypt est bien installé
2. Que le hash a été correctement copié dans le script SQL
3. Que les valeurs (nom, année) correspondent entre le script Python et le script SQL

