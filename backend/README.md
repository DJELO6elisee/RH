# API de Gestion des Ressources Humaines

Cette API permet de gérer toutes les informations relatives aux ressources humaines d'une organisation, incluant les agents, leurs informations personnelles, professionnelles et administratives.

## 🚀 Installation et Configuration

### Prérequis
- Node.js (version 16 ou supérieure)
- PostgreSQL (version 12 ou supérieure)
- npm ou yarn

### Installation des dépendances
```bash
npm install
```

### Configuration de l'environnement
1. Copiez le fichier `env.example` vers `.env`
2. Modifiez les variables selon votre configuration :

```env
# Configuration de la base de données PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ma_rh_db
DB_USER=postgres
DB_PASSWORD=12345

# Configuration du serveur
PORT=3000
NODE_ENV=development

# JWT Secret (pour l'authentification future)
JWT_SECRET=votre_secret_jwt_ici

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Création de la base de données
1. Créez une base de données PostgreSQL nommée `ma_rh_db`
2. Exécutez les scripts SQL dans l'ordre :
   ```bash
   # Créer les tables de base
   psql -d ma_rh_db -f database/schema.sql
   
   # Créer les tables supplémentaires
   psql -d ma_rh_db -f database/schema_part2.sql
   
   # Créer les tables principales et index
   psql -d ma_rh_db -f database/schema_part3.sql
   ```

### Démarrage du serveur
```bash
# Mode développement (avec nodemon)
npm run dev

# Mode production
npm start
```

## 📚 Structure de l'API

### Architecture MVC
L'API suit une architecture **Model-View-Controller (MVC)** avec séparation claire des responsabilités :

```
backend/
├── config/           # Configuration de la base de données
├── controllers/      # Contrôleurs de l'API
├── database/         # Scripts SQL
├── routes/           # Routes de l'API
├── scripts/          # Scripts utilitaires
├── server.js         # Point d'entrée principal
└── package.json      # Dépendances
```

### Contrôleurs

#### 1. BaseController
Contrôleur de base qui fournit les opérations CRUD standard :
- `getAll()` - Récupération avec pagination, recherche et tri
- `getById()` - Récupération par ID
- `create()` - Création d'enregistrement
- `update()` - Mise à jour d'enregistrement
- `delete()` - Suppression d'enregistrement
- `deleteMultiple()` - Suppression multiple

#### 2. SimpleController
Contrôleur pour les tables simples qui étend BaseController :
- Ajoute des méthodes spécifiques comme `getAllForSelect()` et `searchByTerm()`
- Utilisé pour les tables de référence (civilités, nationalités, etc.)

#### 3. Contrôleurs spécialisés
- **AgentsController** : Gestion des agents avec logique métier complexe
- **GradesController** : Gestion des grades avec validation des relations
- **CivilitesController** : Gestion des civilités avec méthodes spécifiques

### Tables principales

#### 1. Tables de référence
- **civilites** : Civilités (M., Mme, Dr., etc.)
- **nationalites** : Nationalités
- **pays** : Pays
- **fonctions** : Fonctions exercées
- **categories** : Catégories de personnel
- **grades** : Grades avec âge de retraite
- **emplois** : Emplois occupés
- **echelons** : Échelons avec salaires

#### 2. Tables des agents
- **agents** : Informations principales des agents
- **enfants** : Enfants des agents
- **type_d_agents** : Types d'agents (fonctionnaire, contractuel, etc.)

#### 3. Tables administratives
- **services** : Services de l'organisation
- **unite_administratives** : Unités administratives
- **ministeres** : Ministères
- **dossiers** et **classeurs** : Organisation documentaire

### Endpoints disponibles

#### Civilités
```
GET    /api/civilites          # Liste des civilités
GET    /api/civilites/:id      # Civilité par ID
POST   /api/civilites          # Créer une civilité
PUT    /api/civilites/:id      # Modifier une civilité
DELETE /api/civilites/:id      # Supprimer une civilité
GET    /api/civilites/search/:term  # Recherche de civilités
GET    /api/civilites/select/all    # Liste pour sélection
```

#### Agents
```
GET    /api/agents                    # Liste des agents avec pagination
GET    /api/agents/:id                # Agent par ID avec enfants
POST   /api/agents                    # Créer un agent
PUT    /api/agents/:id                # Modifier un agent
DELETE /api/agents/:id                # Supprimer un agent
GET    /api/agents/search/advanced    # Recherche avancée
GET    /api/agents/stats/overview     # Statistiques des agents
```

#### Autres tables
Toutes les autres tables suivent le même pattern CRUD :
```
GET    /api/[table]          # Liste avec pagination
GET    /api/[table]/:id      # Élément par ID
POST   /api/[table]          # Créer
PUT    /api/[table]/:id      # Modifier
DELETE /api/[table]/:id      # Supprimer
DELETE /api/[table]          # Suppression multiple (avec body: {ids: [1,2,3]})
GET    /api/[table]/search/:term  # Recherche
GET    /api/[table]/select/all    # Liste pour sélection
```

## 🔍 Fonctionnalités

### Pagination
Toutes les routes de liste supportent la pagination :
```
GET /api/agents?page=1&limit=20
```

### Recherche
Recherche textuelle dans les champs libele, nom et prénom :
```
GET /api/agents?search=dupont
```

### Tri
Tri par n'importe quel champ :
```
GET /api/agents?sortBy=nom&sortOrder=ASC
```

### Filtres
Filtrage par différents critères :
```
GET /api/agents?civilite=1&sexe=M&age_min=25&age_max=55
```

## 📊 Exemples d'utilisation

### Créer un agent
```bash
curl -X POST http://localhost:3000/api/agents \
  -H "Content-Type: application/json" \
  -d '{
    "nom": "Dupont",
    "prenom": "Jean",
    "matricule": "AG001",
    "date_de_naissance": "1985-03-15",
    "sexe": "M",
    "id_civilite": 1,
    "id_nationalite": 1,
    "id_type_d_agent": 1,
    "enfants": [
      {
        "nom": "Dupont",
        "prenom": "Marie",
        "sexe": "F",
        "date_de_naissance": "2010-07-22",
        "scolarise": true,
        "ayant_droit": true
      }
    ]
  }'
```

### Rechercher des agents
```bash
curl "http://localhost:3000/api/agents?search=dupont&page=1&limit=10"
```

### Obtenir des statistiques
```bash
curl http://localhost:3000/api/agents/stats/overview
```

## 🛡️ Sécurité

- **Helmet** : Protection des en-têtes HTTP
- **CORS** : Configuration des origines autorisées
- **Rate Limiting** : Limitation du nombre de requêtes par IP
- **Validation** : Validation des données d'entrée

## 📝 Validation des données

L'API valide automatiquement :
- Les champs obligatoires
- L'unicité des contraintes (matricule, email, etc.)
- Les types de données
- Les contraintes de clés étrangères

## 🔧 Développement

### Génération automatique des routes
Pour les tables simples, utilisez le script de génération :
```bash
npm run generate-routes
```

### Ajouter une nouvelle table
1. Ajouter la table dans `database/schema.sql`
2. Créer un contrôleur dans `controllers/` si logique spéciale requise
3. Créer un fichier de route dans `routes/`
4. Utiliser la classe appropriée (BaseController, SimpleController, ou contrôleur spécialisé)

### Ajouter un nouveau contrôleur
1. Créer une classe qui étend BaseController ou SimpleController
2. Implémenter les méthodes spécifiques
3. Mettre à jour les routes correspondantes

### Tests
```bash
# Lancer les tests (à implémenter)
npm test

# Tests en mode watch
npm run test:watch
```

## 🚨 Gestion des erreurs

L'API retourne des codes d'erreur HTTP appropriés :
- `400` : Erreur de validation ou données invalides
- `404` : Ressource non trouvée
- `409` : Conflit (ex: doublon)
- `500` : Erreur interne du serveur

## 📈 Performance

- **Index** : Index sur les champs de recherche fréquents
- **Pagination** : Limitation du nombre de résultats retournés
- **Pool de connexions** : Gestion efficace des connexions PostgreSQL
- **Requêtes optimisées** : Jointures et requêtes optimisées

## 🔮 Évolutions futures

- [ ] Authentification JWT
- [ ] Gestion des rôles et permissions
- [ ] Upload de fichiers (photos, documents)
- [ ] Export PDF/Excel
- [ ] Notifications en temps réel
- [ ] Cache Redis
- [ ] Tests automatisés
- [ ] Documentation Swagger/OpenAPI

## 📞 Support

Pour toute question ou problème :
1. Vérifiez les logs du serveur
2. Consultez la documentation PostgreSQL
3. Vérifiez la configuration de votre base de données

## 📄 Licence

Ce projet est sous licence ISC.
