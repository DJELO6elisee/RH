const fs = require('fs');
const path = require('path');

const targetFile = path.join(__dirname, 'backend/controllers/DocumentsController.js');
let code = fs.readFileSync(targetFile, 'utf8');

// Function 1: getAgentDocuments
const getAgentRegex = /static async getAgentDocuments\(req, res\) \{[\s\S]*?res\.json\(\{\s*success: true,\s*data: result\.rows\s*\}\);\s*\} catch \(error\) \{/m;
const getAgentReplacement = `static async getAgentDocuments(req, res) {
        try {
            const agentId = req.user.id_agent;
            
            // Pagination and search parameters
            const page = parseInt(req.query.page) || 1;
            const limit = req.query.limit ? parseInt(req.query.limit) : null;
            const searchAgent = req.query.search_agent || '';
            const type_demande = req.query.type_demande || '';
            const type_document = req.query.type_document || '';

            const dateOutputTimeZone = process.env.APP_TIMEZONE || 'Africa/Libreville';
            const toLocalDateOnlyStr = (value) => {
                if (!value) return null;
                if (typeof value === 'string') {
                    const raw = value.trim();
                    if (!raw) return null;
                    const dateOnly = raw.match(/^(\\d{4}-\\d{2}-\\d{2})$/);
                    if (dateOnly) return dateOnly[1];
                    const parsed = new Date(raw);
                    if (Number.isNaN(parsed.getTime())) return null;
                    return new Intl.DateTimeFormat('en-CA', {
                        timeZone: dateOutputTimeZone, year: 'numeric', month: '2-digit', day: '2-digit'
                    }).format(parsed);
                }
                const d = value instanceof Date ? value : new Date(value);
                if (Number.isNaN(d.getTime())) return null;
                return new Intl.DateTimeFormat('en-CA', {
                    timeZone: dateOutputTimeZone, year: 'numeric', month: '2-digit', day: '2-digit'
                }).format(d);
            };

            const params = [];
            let whereClause = \` WHERE da.id_agent_destinataire = $\${params.length + 1} 
                AND (
                    (da.type_document = 'autorisation_absence' AND da.statut IN ('generé', 'transmis', 'finalise'))
                    OR
                    (da.type_document != 'autorisation_absence' AND da.statut IN ('generé', 'transmis', 'finalise'))
                )\`;
            params.push(agentId);

            if (searchAgent) {
                whereClause += \` AND (a.prenom ILIKE $\${params.length + 1} OR a.nom ILIKE $\${params.length + 1} OR a.matricule ILIKE $\${params.length + 1})\`;
                const searchStr = \`%\${searchAgent}%\`;
                params.push(searchStr, searchStr, searchStr);
            }

            if (type_document) {
                whereClause += \` AND da.type_document = $\${params.length + 1}\`;
                params.push(type_document);
            } else if (type_demande) {
                if (type_demande === 'attestation_presence') {
                    whereClause += \` AND da.type_document = $\${params.length + 1}\`;
                    params.push('attestation_presence');
                } else {
                    let typeDocument = '';
                    if (type_demande === 'absence') typeDocument = 'autorisation_absence';
                    else if (type_demande === 'sortie_territoire') typeDocument = 'autorisation_sortie_territoire';
                    else if (type_demande === 'attestation_travail') typeDocument = 'attestation_travail';
                    else if (type_demande === 'certificat_cessation') typeDocument = 'certificat_cessation';
                    else if (type_demande === 'certificat_non_jouissance_conge') typeDocument = 'certificat_non_jouissance_conge';
                    else typeDocument = type_demande;

                    whereClause += \` AND (
                        (da.id_demande IS NOT NULL AND d.type_demande = $\${params.length + 1} AND da.type_document = $\${params.length + 2})
                        OR 
                        (da.id_demande IS NULL AND da.type_document = $\${params.length + 2})
                    )\`;
                    params.push(type_demande, typeDocument);
                }
            }

            const fromAndJoins = \`
                FROM documents_autorisation da
                LEFT JOIN demandes d ON da.id_demande = d.id
                LEFT JOIN agents a ON da.id_agent_destinataire = a.id
                LEFT JOIN directions s ON a.id_direction = s.id
                LEFT JOIN ministeres m ON a.id_ministere = m.id
                LEFT JOIN agents transmetteur ON da.id_agent_transmetteur = transmetteur.id
            \`;

            // Count Query
            const countQuery = \`SELECT COUNT(*) as total \${fromAndJoins} \${whereClause}\`;
            const countResult = await db.query(countQuery, params);
            const totalItems = parseInt(countResult.rows[0].total);
            
            // Pagination calculations
            let totalPages = 1;
            let offset = 0;
            if (limit) {
                totalPages = Math.ceil(totalItems / limit) || 1;
                offset = (page - 1) * limit;
            }

            // Main Query
            let query = \`
                SELECT da.*, d.type_demande, d.date_debut, d.date_fin, d.description, d.annee_non_jouissance_conge,
                       d.date_reprise_service, d.date_fin_conges,
                       a.prenom as agent_prenom, a.nom as agent_nom, a.matricule,
                       s.libelle as service_nom, m.nom as ministere_nom,
                       transmetteur.prenom as transmetteur_prenom, 
                       transmetteur.nom as transmetteur_nom
                \${fromAndJoins}
                \${whereClause}
                ORDER BY da.date_generation DESC
            \`;

            if (limit) {
                query += \` LIMIT $\${params.length + 1} OFFSET $\${params.length + 2}\`;
                params.push(limit, offset);
            }

            const result = await db.query(query, params);
            
            const data = (result.rows || []).map((row) => ({
                ...row,
                date_debut: toLocalDateOnlyStr(row.date_debut),
                date_fin: toLocalDateOnlyStr(row.date_fin),
                date_reprise_service: toLocalDateOnlyStr(row.date_reprise_service),
                date_fin_conges: toLocalDateOnlyStr(row.date_fin_conges)
            }));

            res.json({
                success: true,
                data: data,
                pagination: {
                    totalItems,
                    totalPages,
                    currentPage: page,
                    itemsPerPage: limit || totalItems
                }
            });
        } catch (error) {`;

code = code.replace(getAgentRegex, getAgentReplacement);

// Now for getValidatorDocuments
const getValidatorRegex = /static async getValidatorDocuments\(req, res\) \{[\s\S]*?res\.json\(\{\s*success: true,\s*data\s*\}\);\s*\} catch \(error\) \{/m;
const getValidatorReplacement = `static async getValidatorDocuments(req, res) {
        try {
            const { validateurId } = req.params;
            const { type_demande, type_document, search_agent } = req.query;
            const page = parseInt(req.query.page) || 1;
            const limit = req.query.limit ? parseInt(req.query.limit) : null;

            const dateOutputTimeZone = process.env.APP_TIMEZONE || 'Africa/Libreville';
            const toLocalDateOnlyStr = (value) => {
                if (!value) return null;
                if (typeof value === 'string') {
                    const raw = value.trim();
                    if (!raw) return null;
                    const dateOnly = raw.match(/^(\\d{4}-\\d{2}-\\d{2})$/);
                    if (dateOnly) return dateOnly[1];
                    const parsed = new Date(raw);
                    if (Number.isNaN(parsed.getTime())) return null;
                    return new Intl.DateTimeFormat('en-CA', {
                        timeZone: dateOutputTimeZone, year: 'numeric', month: '2-digit', day: '2-digit'
                    }).format(parsed);
                }
                const d = value instanceof Date ? value : new Date(value);
                if (Number.isNaN(d.getTime())) return null;
                return new Intl.DateTimeFormat('en-CA', {
                    timeZone: dateOutputTimeZone, year: 'numeric', month: '2-digit', day: '2-digit'
                }).format(d);
            };

            const params = [];
            let whereClause = \` WHERE 1=1\`;

            // Rôle du validateur
            let roleNom = '';
            if (req.user && req.user.role) {
                roleNom = req.user.role.toLowerCase();
            } else {
                const roleQuery = \`SELECT r.nom as role_nom FROM utilisateurs u LEFT JOIN roles r ON u.id_role = r.id WHERE u.id_agent = $1\`;
                const roleResult = await db.query(roleQuery, [validateurId]);
                roleNom = (roleResult.rows[0] && roleResult.rows[0].role_nom && roleResult.rows[0].role_nom.toLowerCase()) || '';
            }

            if (roleNom === 'drh') {
                const validateurQuery = \`SELECT a.id_ministere FROM agents a WHERE a.id = $1\`;
                const validateurResult = await db.query(validateurQuery, [validateurId]);
                if (validateurResult.rows.length > 0) {
                    whereClause += \` AND a.id_ministere = $\${params.length + 1}\`;
                    params.push(validateurResult.rows[0].id_ministere);
                }
            } else if (roleNom === 'chef_service') {
                const validateurQuery = \`SELECT a.id_direction FROM agents a WHERE a.id = $1\`;
                const validateurResult = await db.query(validateurQuery, [validateurId]);
                if (validateurResult.rows.length > 0) {
                    whereClause += \` AND a.id_direction = $\${params.length + 1}\`;
                    params.push(validateurResult.rows[0].id_direction);
                }
            } else if (roleNom === 'directeur' || roleNom === 'directeur_central' || roleNom === 'directeur_general' || roleNom === 'chef_cabinet' || roleNom === 'dir_cabinet') {
                const validateurQuery = \`SELECT a.id_direction FROM agents a WHERE a.id = $1\`;
                const validateurResult = await db.query(validateurQuery, [validateurId]);
                if (validateurResult.rows.length > 0) {
                    whereClause += \` AND a.id_direction = $\${params.length + 1}\`;
                    params.push(validateurResult.rows[0].id_direction);
                } else {
                    whereClause += \` AND da.id_agent_generateur = $\${params.length + 1}\`;
                    params.push(validateurId);
                }
            } else if (roleNom !== 'super_admin') {
                whereClause += \` AND (da.id_agent_destinataire = $\${params.length + 1} OR da.id_agent_generateur = $\${params.length + 1})\`;
                params.push(validateurId);
            }

            if (type_document) {
                whereClause += \` AND da.type_document = $\${params.length + 1}\`;
                params.push(type_document);
            } else if (type_demande) {
                if (type_demande === 'attestation_presence') {
                    whereClause += \` AND da.type_document = $\${params.length + 1}\`;
                    params.push('attestation_presence');
                } else {
                    let typeDocument = '';
                    if (type_demande === 'absence') typeDocument = 'autorisation_absence';
                    else if (type_demande === 'sortie_territoire') typeDocument = 'autorisation_sortie_territoire';
                    else if (type_demande === 'attestation_travail') typeDocument = 'attestation_travail';
                    else if (type_demande === 'certificat_cessation') typeDocument = 'certificat_cessation';
                    else if (type_demande === 'certificat_non_jouissance_conge') typeDocument = 'certificat_non_jouissance_conge';
                    else typeDocument = type_demande;

                    whereClause += \` AND (
                        (da.id_demande IS NOT NULL AND d.type_demande = $\${params.length + 1} AND da.type_document = $\${params.length + 2})
                        OR 
                        (da.id_demande IS NULL AND da.type_document = $\${params.length + 2})
                    )\`;
                    params.push(type_demande, typeDocument);
                }
            }

            if (search_agent) {
                whereClause += \` AND (a.prenom ILIKE $\${params.length + 1} OR a.nom ILIKE $\${params.length + 1} OR a.matricule ILIKE $\${params.length + 1})\`;
                const searchStr = \`%\${search_agent}%\`;
                params.push(searchStr, searchStr, searchStr);
            }

            const fromAndJoins = \`
                FROM documents_autorisation da
                LEFT JOIN demandes d ON da.id_demande = d.id
                LEFT JOIN agents a ON da.id_agent_destinataire = a.id
                LEFT JOIN directions s ON a.id_direction = s.id
                LEFT JOIN ministeres m ON a.id_ministere = m.id
                LEFT JOIN agents transmetteur ON da.id_agent_transmetteur = transmetteur.id
            \`;

            // Total count
            const countQuery = \`SELECT COUNT(*) as total \${fromAndJoins} \${whereClause}\`;
            const countResult = await db.query(countQuery, params);
            const totalItems = parseInt(countResult.rows[0].total);

            let totalPages = 1;
            let offset = 0;
            if (limit) {
                totalPages = Math.ceil(totalItems / limit) || 1;
                offset = (page - 1) * limit;
            }

            let query = \`
                SELECT da.*, d.type_demande, d.date_debut, d.date_fin, d.description,
                       d.agree_motif, d.agree_date_cessation, d.annee_non_jouissance_conge,
                       d.date_reprise_service, d.date_fin_conges,
                       a.prenom as agent_prenom, a.nom as agent_nom, a.matricule,
                       s.libelle as service_nom, m.nom as ministere_nom,
                       transmetteur.prenom as transmetteur_prenom, 
                       transmetteur.nom as transmetteur_nom
                \${fromAndJoins}
                \${whereClause}
                ORDER BY da.date_generation DESC
            \`;

            if (limit) {
                query += \` LIMIT $\${params.length + 1} OFFSET $\${params.length + 2}\`;
                params.push(limit, offset);
            }

            const result = await db.query(query, params);
            const data = (result.rows || []).map((row) => ({
                ...row,
                date_debut: toLocalDateOnlyStr(row.date_debut),
                date_fin: toLocalDateOnlyStr(row.date_fin),
                agree_date_cessation: toLocalDateOnlyStr(row.agree_date_cessation),
                date_reprise_service: toLocalDateOnlyStr(row.date_reprise_service),
                date_fin_conges: toLocalDateOnlyStr(row.date_fin_conges)
            }));

            res.json({
                success: true,
                data,
                pagination: {
                    totalItems,
                    totalPages,
                    currentPage: page,
                    itemsPerPage: limit || totalItems
                }
            });

        } catch (error) {`;

code = code.replace(getValidatorRegex, getValidatorReplacement);

fs.writeFileSync(targetFile, code, 'utf8');
console.log('DocumentsController.js updated successfully.');
