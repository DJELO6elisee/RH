# 📑 Index des scripts de mise à jour des types d'agents

## 📂 Structure des fichiers

```
backend/scripts/
├── DEMARRAGE_RAPIDE.md          ← ⭐ COMMENCEZ ICI !
├── GUIDE_MISE_A_JOUR_TYPES.md   ← Guide complet
├── README_UPDATE_TYPES.md       ← Documentation détaillée
├── INDEX_SCRIPTS.md             ← Ce fichier
│
├── updateAgentTypes.js          ← 🎯 Script Node.js RECOMMANDÉ
│
├── analyze_agent_types.sql      ← 📊 Analyse de l'état actuel
├── preview_changes.sql          ← 👀 Prévisualisation des changements
├── verify_by_matricule.sql      ← 🔍 Vérification par matricule
├── update_agent_types.sql       ← 🔧 Mise à jour avec transaction
└── update_types_simple.sql      ← ⚡ Mise à jour automatique
```

---

## 🎯 Utilisation selon votre cas

### Cas 1 : Vous voulez la solution la plus simple

➡️ **Utilisez** : `updateAgentTypes.js`

```bash
cd backend/scripts
node updateAgentTypes.js          # Simulation
node updateAgentTypes.js --apply  # Application
```

---

### Cas 2 : Vous préférez utiliser SQL directement

➡️ **Utilisez** : `update_types_simple.sql`

```bash
psql -U isegroup -d votre_base -f backend/scripts/update_types_simple.sql
```

---

### Cas 3 : Vous voulez un contrôle total (transaction manuelle)

➡️ **Utilisez** : `update_agent_types.sql`

```bash
psql -U isegroup -d votre_base -f backend/scripts/update_agent_types.sql
```

Puis dans psql :
```sql
COMMIT;    -- Pour valider
-- OU
ROLLBACK;  -- Pour annuler
```

---

### Cas 4 : Vous voulez juste analyser sans modifier

➡️ **Utilisez** : `analyze_agent_types.sql`

```bash
psql -U isegroup -d votre_base -f backend/scripts/analyze_agent_types.sql
```

---

### Cas 5 : Vous voulez voir exactement ce qui sera modifié

➡️ **Utilisez** : `preview_changes.sql`

```bash
psql -U isegroup -d votre_base -f backend/scripts/preview_changes.sql
```

---

### Cas 6 : Vous voulez vérifier des matricules spécifiques

➡️ **Utilisez** : `verify_by_matricule.sql`

```bash
psql -U isegroup -d votre_base -f backend/scripts/verify_by_matricule.sql
```

---

## 📊 Détails des scripts

| Script | Type | Modifie la base ? | Transaction ? | Niveau difficulté |
|--------|------|-------------------|---------------|-------------------|
| **updateAgentTypes.js** | Node.js | Oui (avec --apply) | Automatique | ⭐ Facile |
| **update_types_simple.sql** | SQL | Oui (immédiat) | Auto-validée | ⭐ Facile |
| **update_agent_types.sql** | SQL | Oui (manuel) | Manuelle | ⭐⭐ Moyen |
| **analyze_agent_types.sql** | SQL | Non | N/A | ⭐ Facile |
| **preview_changes.sql** | SQL | Non | N/A | ⭐ Facile |
| **verify_by_matricule.sql** | SQL | Non | N/A | ⭐ Facile |

---

## 🎓 Pour les débutants

1. Lisez : `DEMARRAGE_RAPIDE.md`
2. Exécutez : `node updateAgentTypes.js` (simulation)
3. Si OK, exécutez : `node updateAgentTypes.js --apply`

---

## 🎓 Pour les utilisateurs avancés

1. Lisez : `GUIDE_MISE_A_JOUR_TYPES.md`
2. Analysez avec : `analyze_agent_types.sql`
3. Prévisualisez avec : `preview_changes.sql`
4. Mettez à jour avec : `update_agent_types.sql`
5. Validez avec : `COMMIT;`

---

## 📞 Support

Pour toute question, consultez d'abord :
1. `DEMARRAGE_RAPIDE.md` pour un guide simple
2. `GUIDE_MISE_A_JOUR_TYPES.md` pour plus de détails
3. `README_UPDATE_TYPES.md` pour la documentation technique

