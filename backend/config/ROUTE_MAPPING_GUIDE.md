# Guide de Configuration du Mapping API ↔ RouteId

Ce guide explique comment configurer le système pour que les agents puissent accéder aux routes assignées.

## Fonctionnement

Le système utilise un fichier de mapping (`api-route-mapping.js`) qui lie les routes API aux `routeId` du frontend. Le middleware `requireRoleOrAssignedRoute` vérifie automatiquement si un agent a la route assignée lorsqu'il accède à une API.

## Étapes pour ajouter une nouvelle route

### 1. Ajouter le mapping dans `backend/config/api-route-mapping.js`

```javascript
module.exports = {
    '/api/user-accounts': 'agent-user-accounts',
    '/api/agents': 'agents',  // Exemple
    '/api/conges': 'jours-conges',  // Exemple
    // Ajoutez votre mapping ici
    '/api/votre-route-api': 'votre-route-id',
};
```

### 2. Modifier le fichier de routes pour utiliser `requireRoleOrAssignedRoute`

**Avant :**
```javascript
const requireManageRole = authMiddleware.requireRole(['super_admin', 'DRH', 'drh']);

router.get('/', requireManageRole, controller.list);
```

**Après :**
```javascript
// Le routeId sera détecté automatiquement depuis l'URL
const requireManageRoleOrAssigned = authMiddleware.requireRoleOrAssignedRoute(['super_admin', 'DRH', 'drh']);

router.get('/', requireManageRoleOrAssigned, controller.list);
```

## Détection automatique

Le middleware détecte automatiquement le `routeId` à partir de l'URL de la requête :
- `/api/user-accounts` → cherche dans le mapping → trouve `agent-user-accounts`
- `/api/user-accounts/roles` → cherche dans le mapping → trouve `agent-user-accounts` (par préfixe)
- `/api/user-accounts/123` → normalise en `/api/user-accounts/:id` → trouve `agent-user-accounts`

## Exemple complet

### Fichier `backend/config/api-route-mapping.js`
```javascript
module.exports = {
    '/api/user-accounts': 'agent-user-accounts',
    '/api/agents': 'agents',
    '/api/conges': 'jours-conges',
    '/api/demandes': 'historique-des-agents',
    '/api/mariages': 'gestion-mariages',
};
```

### Fichier `backend/routes/agents.js`
```javascript
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const agentsController = require('../controllers/AgentsController');

const requireAuth = authMiddleware.authenticate.bind(authMiddleware);
const manageRoles = ['super_admin', 'DRH', 'drh'];
// Utilisation du nouveau middleware avec détection automatique
const requireManageRoleOrAssigned = authMiddleware.requireRoleOrAssignedRoute(manageRoles);

router.use(requireAuth);

router.get('/', requireManageRoleOrAssigned, agentsController.getAll);
router.post('/', requireManageRoleOrAssigned, agentsController.create);
// etc.
```

## Notes importantes

1. **Le mapping est basé sur les préfixes** : Si vous avez `/api/agents` dans le mapping, cela fonctionnera aussi pour `/api/agents/123`, `/api/agents/stats`, etc.

2. **Ordre de vérification** :
   - D'abord, vérifie si l'utilisateur a un rôle autorisé (DRH, super_admin)
   - Ensuite, si c'est un agent, vérifie si la route est assignée
   - Si aucune condition n'est remplie, refuse l'accès

3. **Filtrage par ministère** : Pour les agents, assurez-vous que le contrôleur filtre aussi par ministère (comme dans `UserAccountsController.getMinistereFilter`).

## Liste des routeIds disponibles

Voir `ministere-tourisme/src/config/routes.js` pour la liste complète des `routeId` disponibles.

