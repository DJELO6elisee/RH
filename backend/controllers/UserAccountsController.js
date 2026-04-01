const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const pool = require('../config/database');

class UserAccountsController {
    constructor() {
        this.defaultPasswordLength = 10;
    }

    generatePassword(length = this.defaultPasswordLength) {
        return crypto.randomBytes(length)
            .toString('base64')
            .replace(/[^a-zA-Z0-9]/g, '')
            .slice(0, length);
    }

    canManageAll(req) {
        if (!req.user || !req.user.role) return false;
        const role = req.user.role.toLowerCase();
        return role === 'super_admin';
    }

    getMinistereFilter(req) {
        if (this.canManageAll(req)) return null;
        if (req.user && req.user.role && req.user.role.toLowerCase() === 'drh' && req.user.id_ministere) {
            return req.user.id_ministere;
        }
        // Pour les agents avec route assignée, filtrer par leur ministère aussi
        if (req.user && req.user.role && req.user.role.toLowerCase() === 'agent' && req.user.id_ministere) {
            return req.user.id_ministere;
        }
        return null;
    }

    async list(req, res) {
        try {
            const { search, status } = req.query;
            const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
            const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
            const offset = (page - 1) * limit;
            const conditions = ['u.id_agent IS NOT NULL'];
            const params = [];

            if (search) {
                params.push(`%${search}%`);
                conditions.push(`(
                    u.username ILIKE $${params.length} OR
                    u.email ILIKE $${params.length} OR
                    a.matricule ILIKE $${params.length} OR
                    (a.nom || ' ' || a.prenom) ILIKE $${params.length}
                )`);
            }

            if (status === 'active') {
                conditions.push('u.is_active = TRUE');
            } else if (status === 'inactive') {
                conditions.push('u.is_active = FALSE');
            }

            let ministereFilter = this.getMinistereFilter(req);
            if (!ministereFilter && req.query.id_ministere) {
                const requestedMinistere = parseInt(req.query.id_ministere, 10);
                if (!Number.isNaN(requestedMinistere) && requestedMinistere > 0) {
                    ministereFilter = requestedMinistere;
                }
            }
            if (ministereFilter) {
                params.push(ministereFilter);
                conditions.push(`a.id_ministere = $${params.length}`);
            }

            const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

            const baseSelect = `
                FROM utilisateurs u
                LEFT JOIN roles r ON u.id_role = r.id
                LEFT JOIN agents a ON u.id_agent = a.id
                LEFT JOIN ministeres m ON a.id_ministere = m.id
                ${whereClause}
            `;

            const dataQuery = `
                SELECT 
                    u.id,
                    u.username,
                    u.email,
                    u.is_active,
                    u.created_at,
                    u.last_login,
                    u.id_role,
                    u.id_agent,
                    r.nom AS role_nom,
                    a.matricule,
                    a.nom AS agent_nom,
                    a.prenom AS agent_prenom,
                    a.telephone1,
                    a.telephone2,
                    a.id_ministere,
                    m.nom AS ministere_nom
                ${baseSelect}
                ORDER BY a.nom ASC NULLS LAST, a.prenom ASC NULLS LAST
                LIMIT $${params.length + 1}
                OFFSET $${params.length + 2}
            `;

            const countQuery = `
                SELECT COUNT(*) AS total
                ${baseSelect}
            `;

            const [dataResult, countResult] = await Promise.all([
                pool.query(dataQuery, [...params, limit, offset]),
                pool.query(countQuery, params)
            ]);

            const total = parseInt(countResult.rows[0]?.total || '0', 10);
            const totalPages = Math.max(Math.ceil(total / limit), 1);

            res.json({
                success: true,
                data: dataResult.rows,
                meta: {
                    page,
                    limit,
                    total,
                    totalPages
                }
            });
        } catch (error) {
            console.error('Erreur lors de la récupération des comptes utilisateurs:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération des comptes utilisateurs',
                error: error.message
            });
        }
    }

    async getRoles(req, res) {
        try {
            const rolesResult = await pool.query(`
                SELECT id, nom
                FROM roles
                WHERE nom NOT IN ('super_admin')
                ORDER BY nom ASC
            `);

            res.json({
                success: true,
                data: rolesResult.rows
            });
        } catch (error) {
            console.error('Erreur lors de la récupération des rôles:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération des rôles',
                error: error.message
            });
        }
    }

    async getAvailableAgents(req, res) {
        try {
            const ministereFilter = this.getMinistereFilter(req);
            const params = [];
            const conditions = ['u.id IS NULL'];

            if (ministereFilter) {
                params.push(ministereFilter);
                conditions.push(`a.id_ministere = $${params.length}`);
            }

            const query = `
                SELECT 
                    a.id,
                    a.matricule,
                    a.nom,
                    a.prenom,
                    a.telephone1,
                    a.telephone2,
                    m.nom AS ministere_nom
                FROM agents a
                LEFT JOIN utilisateurs u ON u.id_agent = a.id
                LEFT JOIN ministeres m ON a.id_ministere = m.id
                ${conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''}
                ORDER BY a.nom ASC, a.prenom ASC
                LIMIT 500
            `;

            const result = await pool.query(query, params);

            res.json({
                success: true,
                data: result.rows
            });
        } catch (error) {
            console.error('Erreur lors de la récupération des agents disponibles:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la récupération des agents disponibles',
                error: error.message
            });
        }
    }

    async create(req, res) {
        try {
            const { username, email, password, id_role, id_agent } = req.body;

            if (!username || !email || !id_role || !id_agent) {
                return res.status(400).json({
                    success: false,
                    message: 'Les champs username, email, rôle et agent sont obligatoires.'
                });
            }

            // Vérifier si l'agent dispose déjà d'un compte
            const existingAgentAccount = await pool.query(
                'SELECT id FROM utilisateurs WHERE id_agent = $1',
                [id_agent]
            );

            if (existingAgentAccount.rows.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Cet agent dispose déjà d\'un compte utilisateur.'
                });
            }

            // Vérifier l'unicité username/email
            const existingUser = await pool.query(
                'SELECT id FROM utilisateurs WHERE username = $1 OR email = $2',
                [username, email]
            );

            if (existingUser.rows.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Nom d\'utilisateur ou email déjà utilisé.'
                });
            }

            const plainPassword = password?.trim() ? password : this.generatePassword();
            const passwordHash = await bcrypt.hash(plainPassword, 12);

            const insertQuery = `
                INSERT INTO utilisateurs (username, email, password_hash, id_role, id_agent, is_active)
                VALUES ($1, $2, $3, $4, $5, TRUE)
                RETURNING id, username, email, id_role, id_agent, is_active, created_at
            `;

            const newUser = await pool.query(insertQuery, [
                username.trim(),
                email.trim(),
                passwordHash,
                id_role,
                id_agent
            ]);

            res.status(201).json({
                success: true,
                message: 'Compte utilisateur créé avec succès.',
                data: {
                    ...newUser.rows[0],
                    plainPassword
                }
            });
        } catch (error) {
            console.error('Erreur lors de la création du compte utilisateur:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la création du compte utilisateur',
                error: error.message
            });
        }
    }

    async update(req, res) {
        try {
            const { id } = req.params;
            const { username, email, id_role } = req.body;

            if (!username && !email && !id_role) {
                return res.status(400).json({
                    success: false,
                    message: 'Aucune donnée à mettre à jour.'
                });
            }

            const updates = [];
            const params = [];

            if (username) {
                params.push(username.trim());
                updates.push(`username = $${params.length}`);
            }
            if (email) {
                params.push(email.trim());
                updates.push(`email = $${params.length}`);
            }
            if (id_role) {
                params.push(id_role);
                updates.push(`id_role = $${params.length}`);
            }

            if (!updates.length) {
                return res.status(400).json({
                    success: false,
                    message: 'Aucune mise à jour appliquée.'
                });
            }

            params.push(id);

            const updateQuery = `
                UPDATE utilisateurs
                SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
                WHERE id = $${params.length}
                RETURNING id, username, email, id_role, id_agent, is_active, updated_at
            `;

            const result = await pool.query(updateQuery, params);

            res.json({
                success: true,
                message: 'Compte utilisateur mis à jour.',
                data: result.rows[0]
            });
        } catch (error) {
            console.error('Erreur lors de la mise à jour du compte utilisateur:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la mise à jour du compte utilisateur',
                error: error.message
            });
        }
    }

    async toggleActive(req, res) {
        try {
            const { id } = req.params;

            const result = await pool.query(
                `
                UPDATE utilisateurs
                SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
                RETURNING id, username, email, is_active
                `,
                [id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Compte utilisateur introuvable.'
                });
            }

            res.json({
                success: true,
                message: `Compte ${result.rows[0].is_active ? 'activé' : 'désactivé'} avec succès.`,
                data: result.rows[0]
            });
        } catch (error) {
            console.error('Erreur lors du changement d\'état du compte utilisateur:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors du changement d\'état du compte utilisateur',
                error: error.message
            });
        }
    }

    async resetPassword(req, res) {
        try {
            const { id } = req.params;
            const newPassword = this.generatePassword();
            const passwordHash = await bcrypt.hash(newPassword, 12);

            const result = await pool.query(
                `
                UPDATE utilisateurs
                SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
                WHERE id = $2
                RETURNING id, username, email
                `,
                [passwordHash, id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Compte utilisateur introuvable.'
                });
            }

            res.json({
                success: true,
                message: 'Mot de passe réinitialisé.',
                data: {
                    ...result.rows[0],
                    plainPassword: newPassword
                }
            });
        } catch (error) {
            console.error('Erreur lors de la réinitialisation du mot de passe:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur lors de la réinitialisation du mot de passe',
                error: error.message
            });
        }
    }
}

module.exports = new UserAccountsController();

