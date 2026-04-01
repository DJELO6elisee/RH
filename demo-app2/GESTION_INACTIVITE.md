# ⏰ Gestion de l'Inactivité et Expiration de Session

## 📋 Vue d'Ensemble

Le système détecte automatiquement l'inactivité des utilisateurs et déconnecte les sessions après **30 minutes** d'inactivité pour des raisons de sécurité.

---

## 🎯 Fonctionnement

### **1. Détection Automatique de l'Activité**

Le système surveille les activités suivantes :
- 🖱️ **Mouvements de souris**
- 🖱️ **Clics de souris**
- ⌨️ **Frappes clavier**
- 📜 **Défilement (scroll)**
- 📱 **Touch sur mobile**

À chaque activité détectée, le **timer d'inactivité est réinitialisé**.

### **2. Timer de 30 Minutes**

- ⏱️ **Durée** : 30 minutes d'inactivité
- 🔄 **Réinitialisation** : À chaque activité de l'utilisateur
- 💾 **Persistance** : L'heure de la dernière activité est sauvegardée

### **3. Avertissement à 2 Minutes**

Quand il reste **moins de 2 minutes** avant l'expiration :

```
┌────────────────────────────────────────────┐
│ ⏰ Session bientôt expirée                 │
├────────────────────────────────────────────┤
│ Votre session va expirer dans 120 secondes│
│ en raison d'une inactivité prolongée.     │
│                                            │
│ Cliquez sur "Continuer" pour prolonger    │
│ votre session, ou vous serez              │
│ automatiquement déconnecté(e).            │
│                                            │
│ [Continuer ma session] [Se déconnecter]   │
└────────────────────────────────────────────┘
```

**Caractéristiques :**
- 🚨 **Modal bloquant** : L'utilisateur doit agir
- ⏳ **Compte à rebours** : Affiche les secondes restantes
- ✅ **Continuer** : Prolonge la session de 30 minutes
- ❌ **Se déconnecter** : Déconnexion immédiate

### **4. Déconnexion Automatique**

Après 30 minutes d'inactivité :
1. ❌ **Déconnexion automatique**
2. 🗑️ **Suppression du token**
3. 🏠 **Redirection vers la page d'accueil** (`/ministere`)
4. 💬 **Message d'alerte** : "Votre session a expiré en raison d'une inactivité prolongée (30 minutes). Veuillez vous reconnecter."

---

## 📁 Fichiers Créés

### **1. `src/hooks/useInactivityTimer.js`**

Hook personnalisé qui :
- Détecte l'activité utilisateur
- Gère le timer d'inactivité
- Utilise un throttle (1 événement/seconde max) pour optimiser les performances
- Sauvegarde la dernière activité dans `sessionStorage`

### **2. `src/components/InactivityHandler.jsx`**

Composant wrapper qui :
- Utilise le hook `useInactivityTimer`
- Affiche le modal d'avertissement
- Gère la déconnexion et la redirection
- S'active seulement pour les utilisateurs connectés
- Ne s'active pas sur les pages publiques

### **3. Intégration dans `src/App.jsx`**

Le composant `InactivityHandler` enveloppe toute l'application :
```jsx
<AuthProvider>
  <DRHLanguageProvider>
    <BrowserRouter>
      <InactivityHandler>
        {/* Toutes les routes */}
      </InactivityHandler>
    </BrowserRouter>
  </DRHLanguageProvider>
</AuthProvider>
```

---

## ⚙️ Configuration

### **Modifier la Durée d'Inactivité**

Pour changer la durée d'inactivité, modifiez dans `InactivityHandler.jsx` :

```javascript
// Durée actuelle : 30 minutes
const INACTIVITY_TIMEOUT = 30 * 60 * 1000;

// Exemples d'autres durées :
const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes
const INACTIVITY_TIMEOUT = 60 * 60 * 1000; // 60 minutes (1 heure)
```

### **Modifier le Délai d'Avertissement**

```javascript
// Avertissement actuel : 2 minutes avant expiration
const WARNING_TIME = 2 * 60 * 1000;

// Autres exemples :
const WARNING_TIME = 5 * 60 * 1000; // 5 minutes avant
const WARNING_TIME = 1 * 60 * 1000; // 1 minute avant
```

---

## 🔒 Sécurité

### **Protection des Données**

Le système d'expiration automatique protège :
- 🔐 **Sessions inactives** : Empêche l'accès non autorisé si l'utilisateur laisse sa session ouverte
- 💾 **Données sensibles** : Protège les informations RH confidentielles
- 🏢 **Conformité** : Respecte les bonnes pratiques de sécurité

### **Pages Non Affectées**

Le système ne s'active **PAS** sur :
- ❌ Page d'accueil publique (`/ministere`)
- ❌ Page de connexion (`/login`, `/login-page`)
- ❌ Page d'inscription (`/signup`)

---

## 📊 Chronologie d'une Session

```
┌─────────────────────────────────────────────────────┐
│  0 min : Connexion                                  │
│  ↓                                                   │
│  5 min : Utilisateur clique → Timer réinitialisé    │
│  ↓                                                   │
│ 15 min : Utilisateur tape → Timer réinitialisé      │
│  ↓                                                   │
│ 28 min : ⚠️ Modal d'avertissement (2 min restantes)│
│  ↓                                                   │
│ 28 min : Utilisateur clique "Continuer"             │
│         → Timer réinitialisé à 0                    │
│  ↓                                                   │
│ 30 min : (nouveau départ si pas d'activité)         │
│  ↓                                                   │
│ 60 min : ❌ Déconnexion automatique                 │
│         → Redirection vers /ministere               │
└─────────────────────────────────────────────────────┘
```

---

## 🛠️ Détails Techniques

### **Optimisations**

1. **Throttling** : Les événements d'activité sont limités à 1 par seconde maximum (évite la surcharge)
2. **SessionStorage** : L'heure de la dernière activité est persistée
3. **Passive Listeners** : Les écouteurs d'événements utilisent `{ passive: true }` pour optimiser les performances
4. **Vérification côté serveur** : Le backend vérifie aussi l'expiration du token JWT

### **Événements Détectés**

| Événement | Description | Réinitialise le Timer |
|-----------|-------------|----------------------|
| `mousedown` | Clic de souris | ✅ Oui |
| `mousemove` | Mouvement de souris | ✅ Oui |
| `keydown` | Frappe clavier | ✅ Oui |
| `scroll` | Défilement | ✅ Oui |
| `touchstart` | Touch mobile | ✅ Oui |
| `click` | Clic | ✅ Oui |

### **Gestion des Onglets Multiples**

Le système utilise `sessionStorage` plutôt que `localStorage` :
- ✅ **Chaque onglet** a sa propre session indépendante
- ✅ **Fermer un onglet** ne déconnecte pas les autres
- ✅ **Activité dans un onglet** ne réinitialise que cet onglet

---

## 🧪 Tests

### **Scénario 1 : Activité Continue**
```
1. Connexion à 10h00
2. Utilisation active toute la journée
3. Résultat : Jamais déconnecté (timer réinitialisé constamment)
```

### **Scénario 2 : Pause Déjeuner**
```
1. Connexion à 10h00
2. Travail jusqu'à 12h00
3. Pause déjeuner (aucune activité pendant 35 minutes)
4. Retour à 12h35
5. Résultat : Déconnecté automatiquement, doit se reconnecter
```

### **Scénario 3 : Avertissement Reçu**
```
1. Connexion à 10h00
2. Pas d'activité
3. À 10h28 : Modal d'avertissement apparaît
4. Utilisateur clique "Continuer ma session"
5. Timer réinitialisé à 0
6. Résultat : Session prolongée de 30 minutes
```

### **Scénario 4 : Ignorer l'Avertissement**
```
1. Connexion à 10h00
2. Pas d'activité
3. À 10h28 : Modal d'avertissement apparaît
4. Utilisateur ne fait rien
5. À 10h30 : Déconnexion automatique
6. Résultat : Redirigé vers /ministere avec message
```

---

## 📝 Notes Importantes

### **Compatibilité**

✅ Compatible avec tous les navigateurs modernes  
✅ Fonctionne sur mobile et desktop  
✅ Gère les onglets multiples indépendamment  
✅ Persiste même si l'utilisateur change d'onglet  

### **Limitations**

⚠️ **Rechargement de page** : Compte comme une activité (réinitialise le timer)  
⚠️ **Activité dans un autre onglet** : N'affecte pas le timer de l'onglet actuel  
⚠️ **Arrêt du navigateur** : La session est perdue (normal)  

---

## 🎉 Résumé

| Caractéristique | Valeur |
|-----------------|--------|
| Durée d'inactivité | **30 minutes** |
| Avertissement | **2 minutes avant expiration** |
| Compte à rebours | **En secondes** |
| Action finale | **Déconnexion + Redirection vers /ministere** |
| Activités détectées | **6 types d'événements** |
| Optimisation | **Throttling 1 événement/seconde** |
| Pages exclues | **Pages publiques** |

---

## 🚀 Activation

Le système est **automatiquement actif** pour tous les utilisateurs connectés sur :
- ✅ Tableau de bord DRH
- ✅ Tableau de bord Agent
- ✅ Toutes les pages protégées

**Aucune configuration supplémentaire n'est nécessaire !**

---

**Date de création :** 3 Décembre 2025  
**Auteur :** Système de Gestion RH

