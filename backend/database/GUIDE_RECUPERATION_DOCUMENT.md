# Guide de Récupération de Document Supprimé

## Situation
Vous avez supprimé un document de note de service par accident avec une requête SQL.

## Options de Récupération

### Option 1: Vérifier les Sauvegardes PostgreSQL

Si vous avez des sauvegardes récentes de votre base de données :

```sql
-- Vérifier les sauvegardes disponibles
-- Utilisez pg_restore pour restaurer uniquement la table documents_autorisation
pg_restore -d votre_base_de_donnees -t documents_autorisation chemin/vers/backup.dump
```

### Option 2: Vérifier les Fichiers PDF Orphelins

Exécutez le script pour trouver les fichiers PDF qui existent mais ne sont plus référencés :

```bash
cd backend
node database/find_orphaned_pdfs.js
```

Si vous trouvez le fichier PDF, vous pouvez recréer le document avec :

```bash
node database/recreate_document_from_pdf.js "uploads/documents/note_de_service_XXX_YYYY.pdf" <agent_id> <validateur_id>
```

### Option 3: Recréer le Document via l'Interface

1. Allez dans l'interface de gestion des agents
2. Trouvez l'agent concerné
3. Générez une nouvelle note de service
4. Le système utilisera maintenant la numérotation séquentielle (0001, 0002, etc.)

### Option 4: Vérifier les Logs de la Console

Si votre application Node.js est toujours en cours d'exécution, vérifiez la console pour voir les logs de création de documents. Les logs peuvent contenir :
- L'ID du document créé
- L'ID de l'agent
- La date de création

### Option 5: Requête SQL pour Vérifier les Informations

Exécutez cette requête pour voir les agents qui ont pu avoir des notes de service :

```sql
-- Vérifier les agents récemment créés ou modifiés
SELECT 
    a.id,
    a.prenom,
    a.nom,
    a.matricule,
    a.created_at,
    a.updated_at
FROM agents a
WHERE a.created_at >= CURRENT_DATE - INTERVAL '7 days'
   OR a.updated_at >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY a.created_at DESC;
```

## Prévention Future

Pour éviter ce problème à l'avenir :

1. **Toujours faire un SELECT avant un DELETE** :
```sql
-- Vérifier ce qui sera supprimé
SELECT * FROM documents_autorisation 
WHERE type_document = 'note_de_service' 
AND date_generation > '2025-12-30';

-- Puis seulement supprimer
DELETE FROM documents_autorisation 
WHERE type_document = 'note_de_service' 
AND date_generation > '2025-12-30';
```

2. **Utiliser des transactions** :
```sql
BEGIN;
DELETE FROM documents_autorisation WHERE ...;
-- Vérifier le résultat
SELECT * FROM documents_autorisation WHERE ...;
-- Si tout est correct
COMMIT;
-- Sinon
ROLLBACK;
```

3. **Créer des sauvegardes régulières** :
```bash
pg_dump -d votre_base -t documents_autorisation > backup_documents_$(date +%Y%m%d).sql
```

## Si Vous Ne Pouvez Pas Récupérer le Document

Si aucune des options ci-dessus ne fonctionne, vous devrez simplement recréer le document via l'interface. Le système utilisera maintenant la numérotation séquentielle correcte (0001, 0002, etc.) grâce aux modifications récentes.
