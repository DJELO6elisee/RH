# 🔄 Guide de Mise à Jour de Version

## 📋 Comment notifier les utilisateurs d'une nouvelle version ?

Ce système détecte automatiquement quand une nouvelle version est mise en ligne et affiche une notification aux utilisateurs connectés.

---

## 🚀 Processus de Déploiement d'une Nouvelle Version

### Étape 1 : Modifier le Fichier de Version

Avant de déployer votre nouvelle version, **mettez à jour** le fichier :

**Fichier : `public/version.json`**

```json
{
  "version": "1.1.0",
  "buildDate": "2025-12-03T14:30:00Z",
  "description": "Ajout du Corps Préfectoral et améliorations du formulaire agent"
}
```

**Règles de versionnement :**
- Changez le numéro de version selon vos modifications :
  - `1.0.0` → `1.0.1` : Corrections mineures (bugs)
  - `1.0.0` → `1.1.0` : Nouvelles fonctionnalités
  - `1.0.0` → `2.0.0` : Changements majeurs

- Mettez à jour la date : format ISO 8601
- Décrivez brièvement les changements

### Étape 1b : Utiliser le Script Automatique (Recommandé)

Un script est disponible pour faciliter la mise à jour :

```bash
# Mise à jour patch (1.0.0 → 1.0.1)
node scripts/update-version.js patch "Correction de bugs"

# Mise à jour mineure (1.0.0 → 1.1.0)
node scripts/update-version.js minor "Ajout du Corps Préfectoral"

# Mise à jour majeure (1.0.0 → 2.0.0)
node scripts/update-version.js major "Refonte complète"
```

Le script met automatiquement à jour :
- Le numéro de version
- La date de build (format ISO)
- La description des changements

### Étape 2 : Déployer l'Application

```bash
# Build de production
npm run build

# Déploiement (selon votre méthode)
# - FTP vers le serveur
# - Docker
# - Git push
# etc.
```

### Étape 3 : Le Système Fait le Reste !

Une fois déployé :
1. ✅ Les utilisateurs connectés verront automatiquement une notification
2. ✅ La notification apparaît en haut à droite de l'écran
3. ✅ Un bouton "Actualiser maintenant" permet de recharger immédiatement
4. ✅ Le rechargement vide complètement le cache (comme Ctrl+F5)

---

## 🎯 Fonctionnement Technique

### Détection Automatique

Le composant `VersionChecker` :
- Vérifie toutes les **60 secondes** s'il y a une nouvelle version
- Compare la version stockée localement avec la version du serveur
- Affiche une notification si les versions diffèrent

### Rechargement Forcé (Hard Refresh)

Quand l'utilisateur clique sur "Actualiser maintenant" :
1. **Vide tous les caches** du navigateur (Service Workers, Cache API)
2. **Force le rechargement** depuis le serveur (équivalent Ctrl+F5)
3. **Met à jour** le numéro de version local
4. **Charge** tous les nouveaux fichiers JS, CSS, etc.

---

## 📍 Emplacements

Le système de détection est actif sur :
- ✅ **Page d'accueil** (`MinistereHomePage.jsx`)
- ✅ **Tableau de bord DRH** (`DRHDashboardPage.jsx`)
- ✅ **Tableau de bord Agent** (`AgentDashboard.jsx`)

---

## 📱 Notification Visuelle

```
┌────────────────────────────────────────────┐
│ 🎉 Nouvelle version disponible !          │
│                                            │
│ Une nouvelle version de l'application     │
│ est disponible.                           │
│ Version : 1.1.0                           │
│                                            │
│ [Actualiser maintenant] [Plus tard]       │
└────────────────────────────────────────────┘
```

- **Position** : En haut à droite de l'écran
- **Style** : Alerte bleue avec animation d'entrée
- **Actions** :
  - "Actualiser maintenant" → Rechargement complet immédiat
  - "Plus tard" → Ferme la notification (réapparaîtra au prochain check)

---

## 🔧 Configuration

### Intervalle de Vérification

Par défaut : 60 secondes (1 minute)

Pour modifier :
```jsx
<VersionChecker checkInterval={30000} /> // 30 secondes
<VersionChecker checkInterval={120000} /> // 2 minutes
```

### Fichier de Version

Le fichier `public/version.json` **doit être accessible publiquement** :
- URL : `https://votre-domaine.com/version.json`
- Pas d'authentification requise
- Headers anti-cache automatiques

---

## 📝 Exemple de Cycle Complet

### Scénario : Déploiement de la Version 1.1.0

1. **Développeur** : Modifie le code, ajoute le Corps Préfectoral
2. **Développeur** : Change `public/version.json` :
   ```json
   {
     "version": "1.1.0",
     "buildDate": "2025-12-03T15:00:00Z",
     "description": "Ajout du Corps Préfectoral"
   }
   ```
3. **Développeur** : Build et déploie `npm run build`
4. **Utilisateur** : Navigue sur l'application (version 1.0.0 en cache)
5. **Système** : Vérifie automatiquement après 60 secondes
6. **Système** : Détecte version 1.1.0 sur le serveur
7. **Notification** : Apparaît en haut à droite 🎉
8. **Utilisateur** : Clique sur "Actualiser maintenant"
9. **Application** : Vide le cache et recharge → Version 1.1.0 active !

---

## ⚠️ Important

### Quand Incrémenter la Version ?

Changez la version dans `public/version.json` **seulement** pour :
- ✅ Nouvelles fonctionnalités (ex: Corps Préfectoral)
- ✅ Corrections de bugs importantes
- ✅ Changements d'interface visibles
- ✅ Modifications qui nécessitent un rechargement

**Ne pas changer** pour :
- ❌ Modifications mineures de style
- ❌ Changements de configuration backend
- ❌ Mises à jour de données

### Premier Déploiement

Si c'est votre premier déploiement avec ce système :
1. Les utilisateurs verront la version actuelle stockée
2. Aucune notification ne s'affichera (normal)
3. À la prochaine mise à jour, le système fonctionnera

---

## 🎉 Avantages

✅ **Détection automatique** : Les utilisateurs n'ont pas besoin de vérifier manuellement  
✅ **Non intrusif** : Notification discrète en haut à droite  
✅ **Choix utilisateur** : Peut actualiser maintenant ou plus tard  
✅ **Rechargement complet** : Équivalent Ctrl+F5 (vide tous les caches)  
✅ **Simplicité** : Il suffit de changer un numéro dans `version.json`  

---

## 📞 Support

En cas de problème, vérifiez :
1. Le fichier `public/version.json` est accessible publiquement
2. Le numéro de version a bien été incrémenté
3. La console navigateur pour les logs de vérification

---

**Date de création :** 3 Décembre 2025  
**Auteur :** Système de Gestion RH

