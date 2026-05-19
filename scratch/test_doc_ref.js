const db = require('../backend/config/database');
const { getSequentialDocumentNumber } = require('../backend/services/utils/documentReference');

async function test() {
    try {
        console.log("Testing sequence...");
        // On teste avec un document_id qui pourrait être attestation de travail, e.g. 275
        const res = await db.query(`SELECT id, type_document, id_agent_destinataire FROM documents_autorisation WHERE id = 275 OR type_document LIKE '%attestation%' LIMIT 5`);
        console.log("Documents trouvés:", res.rows);
        
        for (const doc of res.rows) {
            const seq1 = await getSequentialDocumentNumber(doc.type_document, null, doc.id);
            console.log(`id = ${doc.id}, type = ${doc.type_document}, seq_number = ${seq1}`);
        }
    } catch(e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}
test();
