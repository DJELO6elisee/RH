const path = require('path');
const fs = require('fs');
const pool = require('../config/database');

const buildSignaturePublicUrl = (relativePath = '') => {
    if (!relativePath) return null;
    const normalized = relativePath.replace(/\\/g, '/').replace(/^\/+/, '');
    return `/uploads/${normalized}`;
};

const buildSignatureDiskPath = (relativePath = '') => {
    if (!relativePath) return null;
    const sanitized = relativePath.replace(/^\/?uploads[\\/]/, '').replace(/\\/g, '/');
    return path.join(__dirname, '..', 'uploads', sanitized);
};

class SignaturesController {
    static async list(req, res) {
        try {
            const query = `
                SELECT 
                    a.id,
                    a.matricule,
                    a.prenom,
                    a.nom,
                    COALESCE(a.fonction_actuelle, '') AS fonction_actuelle,
                    COALESCE(r.nom, '') AS role,
                    COALESCE(json_agg(
                        json_build_object(
                            'id', sig.id,
                            'url', sig.signature_url,
                            'path', sig.signature_path,
                            'name', sig.signature_name,
                            'size', sig.signature_size,
                            'type', sig.signature_type,
                            'is_active', sig.is_active,
                            'public_url', CONCAT('/api/emargement/public/', sig.id),
                            'created_at', sig.created_at,
                            'updated_at', sig.updated_at
                        )
                    ) FILTER (WHERE sig.id IS NOT NULL), '[]'::json) AS signatures
                FROM agents a
                LEFT JOIN utilisateurs u ON u.id_agent = a.id
                LEFT JOIN roles r ON r.id = u.id_role
                LEFT JOIN agent_signatures sig ON sig.id_agent = a.id
                WHERE sig.id IS NOT NULL
                GROUP BY 
                    a.id,
                    a.matricule,
                    a.prenom,
                    a.nom,
                    a.fonction_actuelle,
                    r.nom
                ORDER BY LOWER(a.nom), LOWER(a.prenom)
            `;

            const result = await pool.query(query);
            return res.json({
                success: true,
                data: result.rows
            });
        } catch (error) {
            console.error('❌ Erreur lors de la récupération des signatures:', error);
            return res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération des signatures',
                error: error.message
            });
        }
    }

    static async downloadPublic(req, res) {
        const { id } = req.params;

        try {
            const signatureQuery = `
                SELECT 
                    signature_path,
                    signature_type,
                    signature_name,
                    updated_at,
                    created_at
                FROM agent_signatures
                WHERE id = $1
            `;

            const result = await pool.query(signatureQuery, [id]);

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Signature introuvable'
                });
            }

            const signature = result.rows[0];
            const diskPath = buildSignatureDiskPath(signature.signature_path);

            if (!diskPath || !fs.existsSync(diskPath)) {
                return res.status(404).json({
                    success: false,
                    message: 'Fichier de signature indisponible'
                });
            }

            const mimeType = signature.signature_type || 'image/png';
            res.header('Content-Type', mimeType);
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
            res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
            res.header('Cache-Control', 'public, max-age=31536000');

            return res.sendFile(diskPath);
        } catch (error) {
            console.error('❌ Erreur lors de la récupération publique de la signature:', error);
            return res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération de la signature',
                error: error.message
            });
        }
    }

    static async listAgents(req, res) {
        try {
            const query = `
                SELECT 
                    a.id,
                    a.matricule,
                    a.prenom,
                    a.nom,
                    COALESCE(a.fonction_actuelle, '') AS fonction_actuelle,
                    COALESCE(r.nom, '') AS role,
                    sig.id AS signature_id,
                    sig.signature_url,
                    sig.signature_path,
                    sig.signature_type,
                    sig.is_active
                    , CONCAT('/api/emargement/public/', sig.id) AS signature_public_url
                FROM agents a
                LEFT JOIN utilisateurs u ON u.id_agent = a.id
                LEFT JOIN roles r ON r.id = u.id_role
                LEFT JOIN agent_signatures sig 
                    ON sig.id_agent = a.id 
                    AND sig.is_active = true
                ORDER BY LOWER(a.nom), LOWER(a.prenom)
            `;

            const result = await pool.query(query);
            return res.json({
                success: true,
                data: result.rows
            });
        } catch (error) {
            console.error('❌ Erreur lors de la récupération des agents pour l\'émargement:', error);
            return res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération des agents',
                error: error.message
            });
        }
    }

    static async upload(req, res) {
        try {
            // Permettre aux directeurs d'uploader leur propre signature
            // Si agentId n'est pas fourni, utiliser l'ID de l'agent connecté
            let { agentId } = req.body;
            const file = req.file;

            // Si aucun agentId n'est fourni, utiliser l'agent connecté
            if (!agentId && req.user && req.user.id_agent) {
                agentId = req.user.id_agent;
            }

            if (!agentId) {
                return res.status(400).json({
                    success: false,
                    message: 'ID de l\'agent requis'
                });
            }

            // Vérifier que l'utilisateur peut uploader pour cet agent
            // Un directeur peut seulement uploader sa propre signature
            const userRole = req.user?.role?.toLowerCase();
            if (userRole === 'directeur' && req.user.id_agent && parseInt(agentId) !== req.user.id_agent) {
                return res.status(403).json({
                    success: false,
                    message: 'Vous ne pouvez uploader que votre propre signature'
                });
            }

            if (!file) {
                return res.status(400).json({
                    success: false,
                    message: 'Fichier de signature requis'
                });
            }

            const relativePath = path.join('signatures', file.filename).replace(/\\/g, '/');
            const signatureUrl = buildSignaturePublicUrl(relativePath);

            const insertQuery = `
                INSERT INTO agent_signatures (
                    id_agent,
                    signature_url,
                    signature_path,
                    signature_name,
                    signature_size,
                    signature_type,
                    is_active
                ) VALUES ($1, $2, $3, $4, $5, $6, false)
                RETURNING *
            `;

            const insertResult = await pool.query(insertQuery, [
                agentId,
                signatureUrl,
                relativePath,
                file.originalname,
                file.size,
                file.mimetype
            ]);

            return res.status(201).json({
                success: true,
                data: insertResult.rows[0],
                message: 'Signature enregistrée avec succès'
            });
        } catch (error) {
            console.error('❌ Erreur lors de l\'upload de la signature:', error);
            return res.status(500).json({
                success: false,
                message: 'Erreur lors de l\'enregistrement de la signature',
                error: error.message
            });
        }
    }

    static async activate(req, res) {
        const { id } = req.params;

        try {
            const signatureQuery = 'SELECT id, id_agent FROM agent_signatures WHERE id = $1';
            const signatureResult = await pool.query(signatureQuery, [id]);

            if (signatureResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Signature introuvable'
                });
            }

            const { id_agent } = signatureResult.rows[0];

            // Vérifier que l'utilisateur peut activer cette signature
            // Un directeur peut seulement activer sa propre signature
            const userRole = req.user?.role?.toLowerCase();
            if (userRole === 'directeur' && req.user.id_agent && id_agent !== req.user.id_agent) {
                return res.status(403).json({
                    success: false,
                    message: 'Vous ne pouvez activer que votre propre signature'
                });
            }

            await pool.query('BEGIN');
            await pool.query('UPDATE agent_signatures SET is_active = false WHERE id_agent = $1', [id_agent]);
            const activateResult = await pool.query(
                'UPDATE agent_signatures SET is_active = true, updated_at = NOW() WHERE id = $1 RETURNING *',
                [id]
            );
            await pool.query('COMMIT');

            return res.json({
                success: true,
                data: activateResult.rows[0],
                message: 'Signature activée avec succès'
            });
        } catch (error) {
            await pool.query('ROLLBACK').catch(() => {});
            console.error('❌ Erreur lors de l\'activation de la signature:', error);
            return res.status(500).json({
                success: false,
                message: 'Erreur lors de l\'activation de la signature',
                error: error.message
            });
        }
    }

    static async deactivate(req, res) {
        const { id } = req.params;

        try {
            const signatureQuery = 'SELECT id, id_agent FROM agent_signatures WHERE id = $1';
            const signatureResult = await pool.query(signatureQuery, [id]);

            if (signatureResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Signature introuvable'
                });
            }

            const { id_agent } = signatureResult.rows[0];

            // Vérifier que l'utilisateur peut désactiver cette signature
            // Un directeur peut seulement désactiver sa propre signature
            const userRole = req.user?.role?.toLowerCase();
            if (userRole === 'directeur' && req.user.id_agent && id_agent !== req.user.id_agent) {
                return res.status(403).json({
                    success: false,
                    message: 'Vous ne pouvez désactiver que votre propre signature'
                });
            }

            const deactivateResult = await pool.query(
                'UPDATE agent_signatures SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING *',
                [id]
            );

            return res.json({
                success: true,
                data: deactivateResult.rows[0],
                message: 'Signature désactivée avec succès'
            });
        } catch (error) {
            console.error('❌ Erreur lors de la désactivation de la signature:', error);
            return res.status(500).json({
                success: false,
                message: 'Erreur lors de la désactivation de la signature',
                error: error.message
            });
        }
    }

    static async remove(req, res) {
        const { id } = req.params;

        try {
            const signatureQuery = 'SELECT * FROM agent_signatures WHERE id = $1';
            const signatureResult = await pool.query(signatureQuery, [id]);

            if (signatureResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Signature introuvable'
                });
            }

            const signature = signatureResult.rows[0];
            
            // Vérifier que l'utilisateur peut supprimer cette signature
            // Un directeur peut seulement supprimer sa propre signature
            const userRole = req.user?.role?.toLowerCase();
            if (userRole === 'directeur' && req.user.id_agent && signature.id_agent !== req.user.id_agent) {
                return res.status(403).json({
                    success: false,
                    message: 'Vous ne pouvez supprimer que votre propre signature'
                });
            }

            const diskPath = buildSignatureDiskPath(signature.signature_path);

            await pool.query('DELETE FROM agent_signatures WHERE id = $1', [id]);

            if (diskPath && fs.existsSync(diskPath)) {
                fs.unlink(diskPath, (err) => {
                    if (err) {
                        console.error('⚠️ Impossible de supprimer le fichier de signature:', err);
                    }
                });
            }

            return res.json({
                success: true,
                message: 'Signature supprimée avec succès'
            });
        } catch (error) {
            console.error('❌ Erreur lors de la suppression de la signature:', error);
            return res.status(500).json({
                success: false,
                message: 'Erreur lors de la suppression de la signature',
                error: error.message
            });
        }
    }

    /**
     * Récupère les signatures de l'agent connecté
     * @param {Object} req - Requête Express
     * @param {Object} res - Réponse Express
     */
    static async getMySignatures(req, res) {
        try {
            if (!req.user || !req.user.id_agent) {
                return res.status(401).json({
                    success: false,
                    message: 'Utilisateur non authentifié ou agent non associé'
                });
            }

            const query = `
                SELECT 
                    id,
                    signature_url,
                    signature_path,
                    signature_name,
                    signature_size,
                    signature_type,
                    is_active,
                    created_at,
                    updated_at
                FROM agent_signatures
                WHERE id_agent = $1
                ORDER BY is_active DESC, created_at DESC
            `;

            const result = await pool.query(query, [req.user.id_agent]);

            return res.json({
                success: true,
                data: result.rows
            });
        } catch (error) {
            console.error('❌ Erreur lors de la récupération des signatures:', error);
            return res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération des signatures',
                error: error.message
            });
        }
    }
}

module.exports = SignaturesController;

