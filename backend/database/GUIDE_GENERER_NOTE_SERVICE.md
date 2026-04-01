# Guide pour Générer une Note de Service pour un Agent Existant

## Solution 1 : Via l'Interface (Recommandé)

J'ai modifié le composant `NoteDeServiceViewer` pour ajouter un bouton de génération. Voici comment procéder :

### Étapes :

1. **Connectez-vous en tant que DRH** (ou utilisateur avec les droits appropriés)

2. **Allez dans le tableau de bord DRH** ou la page "Notes de Service"

3. **Recherchez l'agent** concerné :
   - Utilisez la barre de recherche pour trouver l'agent par nom, prénom ou matricule
   - Sélectionnez l'agent dans les résultats

4. **Générez la note de service** :
   - Si aucune note de service n'existe pour cet agent, un message s'affichera avec un bouton **"Générer la note de service"**
   - Cliquez sur ce bouton
   - La note de service sera générée automatiquement avec la numérotation séquentielle (0001, 0002, etc.)

5. **Téléchargez ou consultez** la note de service générée

---

## Solution 2 : Via l'API Directement

Si vous préférez utiliser l'API directement (via Postman, curl, ou un script), voici comment faire :

### Endpoint :
```
POST /api/documents/generer-note-de-service
```

### Headers :
```
Authorization: Bearer <votre_token>
Content-Type: application/json
```

### Body (JSON) :
```json
{
  "id_agent": 123
}
```

### Paramètres optionnels :
```json
{
  "id_agent": 123,
  "date_effet": "2025-12-30",
  "numero_document": "0001/MINTOUR/DRH/SDGP",
  "cert_reference": "REF123"
}
```

### Exemple avec curl :
```bash
curl -X POST https://votre-domaine.com/api/documents/generer-note-de-service \
  -H "Authorization: Bearer VOTRE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"id_agent": 123}'
```

### Réponse en cas de succès :
```json
{
  "success": true,
  "message": "Note de service générée avec succès",
  "document_id": 456,
  "pdf_url": "https://votre-domaine.com/api/documents/456/pdf"
}
```

---

## Solution 3 : Via un Script Node.js

Si vous avez besoin de générer plusieurs notes de service, vous pouvez créer un script :

### Fichier : `backend/scripts/generate_note_service.js`

```javascript
const db = require('../config/database');
const DocumentGenerationService = require('../services/DocumentGenerationService');
const PDFKitGenerationService = require('../services/PDFKitGenerationService');

async function generateNoteDeServiceForAgent(agentId, validateurId) {
    try {
        // Récupérer l'agent
        const agentResult = await db.query(`
            SELECT a.*, 
                   c.libele as civilite,
                   m.nom as ministere_nom,
                   m.sigle as ministere_sigle
            FROM agents a
            LEFT JOIN civilites c ON a.id_civilite = c.id
            LEFT JOIN ministeres m ON a.id_ministere = m.id
            WHERE a.id = $1
        `, [agentId]);

        if (agentResult.rows.length === 0) {
            throw new Error(`Agent avec l'ID ${agentId} non trouvé`);
        }

        const agent = agentResult.rows[0];

        // Récupérer le validateur
        const validateurResult = await db.query(`
            SELECT a.*, 
                   c.libele as civilite,
                   m.nom as ministere_nom,
                   m.sigle as ministere_sigle
            FROM agents a
            LEFT JOIN civilites c ON a.id_civilite = c.id
            LEFT JOIN ministeres m ON a.id_ministere = m.id
            WHERE a.id = $1
        `, [validateurId]);

        if (validateurResult.rows.length === 0) {
            throw new Error(`Validateur avec l'ID ${validateurId} non trouvé`);
        }

        const validateur = validateurResult.rows[0];

        // Générer la note de service
        const generatedNote = await DocumentGenerationService.generateNoteService(
            agent,
            validateur,
            {
                date_generation: new Date()
            }
        );

        console.log(`✅ Note de service générée avec succès pour l'agent ${agentId}`);
        console.log(`   Document ID: ${generatedNote.id}`);
        console.log(`   Numéro: ${generatedNote.numero_document}`);

        return generatedNote;
    } catch (error) {
        console.error(`❌ Erreur lors de la génération de la note de service:`, error);
        throw error;
    }
}

// Utilisation
const agentId = process.argv[2];
const validateurId = process.argv[3];

if (!agentId || !validateurId) {
    console.log('Usage: node generate_note_service.js <agent_id> <validateur_id>');
    process.exit(1);
}

generateNoteDeServiceForAgent(parseInt(agentId), parseInt(validateurId))
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
```

### Exécution :
```bash
cd backend
node scripts/generate_note_service.js 123 1
```

---

## Important

- La note de service utilisera maintenant la **numérotation séquentielle** (0001, 0002, etc.) grâce aux modifications récentes
- Si le ministère est "MINISTERE DU TOURISME ET DES LOISIRS", le numéro inclura automatiquement le suffixe `/DRH/SDGP`
- Le document sera créé dans la table `documents_autorisation` avec le type `note_de_service`
- Le PDF sera généré et sauvegardé dans `backend/uploads/documents/`

---

## Vérification

Après génération, vous pouvez vérifier que le document a été créé :

```sql
SELECT 
    id,
    type_document,
    titre,
    date_generation,
    chemin_fichier,
    id_agent_destinataire
FROM documents_autorisation 
WHERE type_document = 'note_de_service'
  AND id_agent_destinataire = <agent_id>
ORDER BY date_generation DESC
LIMIT 1;
```
