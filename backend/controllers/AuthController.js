const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

/**
 * Normalise le nom de rôle (libellé ou code) en code canonique pour le frontend.
 * Ex: "CABINET CHEF", "Chef de cabinet" -> "chef_cabinet"
 */
function normalizeRoleCode(roleNom) {
    if (!roleNom || typeof roleNom !== 'string') return roleNom || '';
    const r = roleNom.trim().toLowerCase();
    if (!r) return '';
    const withUnderscore = r.replace(/\s+/g, '_');
    if (withUnderscore === 'cabinet_chef' || (r.includes('chef') && r.includes('cabinet'))) return 'chef_cabinet';
    if (withUnderscore === 'dir_cabinet' || (r.includes('cabinet') && (r.includes('directeur') || r.includes('dir')))) return 'dir_cabinet';
    if (withUnderscore === 'chef_de_service' || (r.includes('chef') && r.includes('service') && !r.includes('cabinet'))) return 'chef_service';
    if (['directeur', 'sous_directeur', 'sous-directeur', 'directeur_central', 'directeur_general', 'drh', 'super_admin', 'inspecteur_general', 'directeur_service_exterieur', 'chef_service', 'ministre', 'agent', 'admin_entite'].includes(r)) return r === 'sous-directeur' ? 'sous_directeur' : r;
    if (r.includes('inspecteur') && (r.includes('général') || r.includes('general'))) return 'inspecteur_general';
    if (r.includes('service') && r.includes('exterieur')) return 'directeur_service_exterieur';
    if (r.includes('directeur') && r.includes('central')) return 'directeur_central';
    if (r.includes('directeur') && r.includes('general')) return 'directeur_general';
    if (r.includes('sous') && r.includes('directeur')) return 'sous_directeur';
    if (r === 'directeur') return 'directeur';
    return r;
}

class AuthController {
    constructor() {
        this.secretKey = process.env.JWT_SECRET || 'your-secret-key';
        this.expiresIn = '24h';
    }

    // Inscription d'un nouvel utilisateur
    async register(req, res) {
        try {
            const { username, email, password, id_role, id_agent } = req.body;

            // Validation des données
            if (!username || !email || !password || !id_role) {
                return res.status(400).json({
                    success: false,
                    message: 'Tous les champs obligatoires doivent être remplis'
                });
            }

            // Vérifier si l'utilisateur existe déjà
            const existingUser = await pool.query(
                'SELECT id FROM utilisateurs WHERE username = $1 OR email = $2', [username, email]
            );

            if (existingUser.rows.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Un utilisateur avec ce nom d\'utilisateur ou cet email existe déjà'
                });
            }

            // Hasher le mot de passe
            const saltRounds = 12;
            const passwordHash = await bcrypt.hash(password, saltRounds);

            // Créer l'utilisateur
            const newUser = await pool.query(
                'INSERT INTO utilisateurs (username, email, password_hash, id_role, id_agent) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, email, id_role, id_agent, created_at', [username, email, passwordHash, id_role, id_agent]
            );

            res.status(201).json({
                success: true,
                message: 'Utilisateur créé avec succès',
                data: newUser.rows[0]
            });

        } catch (error) {
            console.error('Erreur lors de l\'inscription:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur interne du serveur',
                error: error.message
            });
        }
    }

    // Connexion utilisateur
    async login(req, res) {
        try {
            const { username, password, organizationId, organizationType } = req.body;

            // Validation des données
            if (!username || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Nom d\'utilisateur et mot de passe requis'
                });
            }

            // Récupérer l'utilisateur avec son rôle et son organisation
            let userQuery = `
                SELECT u.*, r.nom as role_nom, r.permissions
                FROM utilisateurs u
                JOIN roles r ON u.id_role = r.id
                WHERE u.username = $1 AND u.is_active = true
            `;

            let queryParams = [username];

            // Si une organisation est spécifiée, vérifier que l'utilisateur appartient à cette organisation
            // Exception : les super_admin peuvent se connecter à n'importe quelle organisation
            if (organizationId && organizationType) {
                // Convertir organizationId en nombre si c'est une chaîne
                const orgIdNum = typeof organizationId === 'string' ? parseInt(organizationId, 10) : organizationId;
                
                if (isNaN(orgIdNum)) {
                    return res.status(400).json({
                        success: false,
                        message: 'ID d\'organisation invalide'
                    });
                }
                
                userQuery += ` AND (r.nom = 'super_admin' OR `;
                if (organizationType === 'ministere') {
                    // Pour les DRH : ils doivent avoir un agent associé qui appartient au ministère
                    // Pour les autres rôles : vérifier qu'ils ont un agent associé au ministère
                    userQuery += `((
                        (r.nom IN ('DRH', 'drh') AND u.id_agent IS NOT NULL AND EXISTS (
                            SELECT 1 FROM agents a 
                            WHERE a.id = u.id_agent 
                            AND a.id_ministere = $2
                        ))
                        OR
                        (r.nom IN ('agent', 'admin_entite', 'chef_service', 'directeur', 'sous_directeur', 'dir_cabinet', 'ministre', 'chef_cabinet', 'directeur_general', 'directeur_central', 'inspecteur_general', 'directeur_service_exterieur', 'conseiller_technique', 'charge_d_etude', 'charge_de_mission', 'chef_du_secretariat_particulier') AND (
                            u.id_agent IS NULL OR EXISTS (
                                SELECT 1 FROM agents a 
                                WHERE a.id = u.id_agent 
                                AND a.id_ministere = $2
                            )
                        ))
                    ))`;
                    queryParams.push(orgIdNum);
                } else if (organizationType === 'institution') {
                    // Pour les DRH : ils doivent avoir un agent associé qui appartient à l'institution
                    // Pour les autres rôles : vérifier qu'ils ont un agent associé à l'institution
                    userQuery += `((
                        (r.nom IN ('DRH', 'drh') AND u.id_agent IS NOT NULL AND EXISTS (
                            SELECT 1 FROM agents_institutions_main a 
                            WHERE a.id = u.id_agent 
                            AND a.id_institution = $2
                        ))
                        OR
                        (r.nom IN ('agent', 'admin_entite', 'chef_service', 'directeur', 'sous_directeur', 'dir_cabinet', 'ministre', 'chef_cabinet', 'directeur_general', 'directeur_central', 'inspecteur_general', 'directeur_service_exterieur', 'conseiller_technique', 'charge_d_etude', 'charge_de_mission', 'chef_du_secretariat_particulier') AND (
                            u.id_agent IS NULL OR EXISTS (
                                SELECT 1 FROM agents_institutions_main a 
                                WHERE a.id = u.id_agent 
                                AND a.id_institution = $2
                            )
                        ))
                    ))`;
                    queryParams.push(orgIdNum);
                } else if (organizationType === 'entite') {
                    // Pour les DRH : ils doivent avoir un agent associé qui appartient à l'entité
                    // Pour les autres rôles : vérifier qu'ils ont un agent associé à l'entité
                    userQuery += `((
                        (r.nom IN ('DRH', 'drh') AND u.id_agent IS NOT NULL AND EXISTS (
                            SELECT 1 FROM agents a 
                            JOIN entites_administratives e ON a.id_entite_principale = e.id
                            WHERE a.id = u.id_agent 
                            AND e.id = $2
                        ))
                        OR
                        (r.nom IN ('agent', 'admin_entite', 'chef_service', 'directeur', 'sous_directeur', 'dir_cabinet', 'ministre', 'chef_cabinet', 'directeur_general', 'directeur_central', 'inspecteur_general', 'directeur_service_exterieur', 'conseiller_technique', 'charge_d_etude', 'charge_de_mission', 'chef_du_secretariat_particulier') AND (
                            u.id_agent IS NULL OR EXISTS (
                                SELECT 1 FROM agents a 
                                WHERE a.id = u.id_agent 
                                AND a.id_entite_principale = $2
                            )
                        ))
                    ))`;
                    queryParams.push(orgIdNum);
                }
                userQuery += `)`;
            }

            const user = await pool.query(userQuery, queryParams);

            if (user.rows.length === 0) {
                return res.status(401).json({
                    success: false,
                    message: organizationId && organizationType ?
                        'Accès non autorisé à cette organisation ou identifiants incorrects' : 'Nom d\'utilisateur ou mot de passe incorrect'
                });
            }

            const userData = user.rows[0];

            // Vérifier le mot de passe
            const isPasswordValid = await bcrypt.compare(password, userData.password_hash);
            if (!isPasswordValid) {
                // Enregistrer la tentative de connexion échouée
                await this.recordLoginAttempt(username, req.ip, false);

                return res.status(401).json({
                    success: false,
                    message: 'Nom d\'utilisateur ou mot de passe incorrect'
                });
            }

            // Enregistrer la tentative de connexion réussie
            await this.recordLoginAttempt(username, req.ip, true);

            // Mettre à jour last_login
            await pool.query(
                'UPDATE utilisateurs SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [userData.id]
            );

            // Générer le token JWT
            const token = jwt.sign({
                    id: userData.id,
                    username: userData.username,
                    role: userData.role_nom,
                    permissions: userData.permissions
                },
                this.secretKey, { expiresIn: this.expiresIn }
            );

            // Enregistrer la session
            await pool.query(
                'INSERT INTO sessions (id_utilisateur, token, expires_at) VALUES ($1, $2, $3)', [userData.id, token, new Date(Date.now() + 24 * 60 * 60 * 1000)]
            );

            // Nettoyer les sessions expirées
            await this.cleanExpiredSessions();

            // Préparer les données utilisateur (role normalisé pour que le frontend reconnaisse chef_cabinet, etc.)
            const roleCode = normalizeRoleCode(userData.role_nom);
            const userResponse = {
                id: userData.id,
                username: userData.username,
                email: userData.email,
                role: roleCode || userData.role_nom,
                role_nom: userData.role_nom,
                role_code: roleCode,
                permissions: userData.permissions,
                id_agent: userData.id_agent
            };

            // Ajouter les informations d'organisation si fournies
            if (organizationId && organizationType) {
                userResponse.organization = {
                    id: organizationId,
                    type: organizationType
                };
            }

            res.json({
                success: true,
                message: 'Connexion réussie',
                data: {
                    token,
                    user: userResponse
                }
            });

        } catch (error) {
            console.error('Erreur lors de la connexion:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur interne du serveur',
                error: error.message
            });
        }
    }

    // Connexion Super Admin
    async superAdminLogin(req, res) {
        try {
            const { username, password } = req.body;

            // Validation des données
            if (!username || !password) {
                return res.status(400).json({
                    success: false,
                    message: 'Nom d\'utilisateur et mot de passe requis'
                });
            }

            // Récupérer l'utilisateur avec vérification du rôle super_admin
            const userQuery = `
                SELECT u.*, r.nom as role_nom, r.permissions
                FROM utilisateurs u
                JOIN roles r ON u.id_role = r.id
                WHERE u.username = $1 AND u.is_active = true AND r.nom = 'super_admin'
            `;

            const user = await pool.query(userQuery, [username]);

            if (user.rows.length === 0) {
                return res.status(401).json({
                    success: false,
                    message: 'Accès refusé. Seuls les super administrateurs peuvent accéder à cette interface.'
                });
            }

            const userData = user.rows[0];

            // Vérifier le mot de passe
            const isPasswordValid = await bcrypt.compare(password, userData.password_hash);
            if (!isPasswordValid) {
                // Enregistrer la tentative de connexion échouée
                await this.recordLoginAttempt(username, req.ip, false);

                return res.status(401).json({
                    success: false,
                    message: 'Nom d\'utilisateur ou mot de passe incorrect'
                });
            }

            // Enregistrer la tentative de connexion réussie
            await this.recordLoginAttempt(username, req.ip, true);

            // Mettre à jour last_login
            await pool.query(
                'UPDATE utilisateurs SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [userData.id]
            );

            // Générer le token JWT
            const token = jwt.sign({
                    id: userData.id,
                    username: userData.username,
                    role: userData.role_nom,
                    permissions: userData.permissions
                },
                this.secretKey, { expiresIn: this.expiresIn }
            );

            // Enregistrer la session
            await pool.query(
                'INSERT INTO sessions (id_utilisateur, token, expires_at) VALUES ($1, $2, $3)', [userData.id, token, new Date(Date.now() + 24 * 60 * 60 * 1000)]
            );

            // Préparer la réponse utilisateur
            const userResponse = {
                id: userData.id,
                username: userData.username,
                email: userData.email,
                role: userData.role_nom,
                permissions: userData.permissions,
                id_agent: userData.id_agent,
                last_login: userData.last_login
            };

            res.json({
                success: true,
                message: 'Connexion super administrateur réussie',
                data: {
                    token,
                    user: userResponse
                }
            });

        } catch (error) {
            console.error('Erreur lors de la connexion super admin:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur interne du serveur',
                error: error.message
            });
        }
    }

    // Déconnexion utilisateur
    async logout(req, res) {
        try {
            const token = req.headers.authorization && req.headers.authorization.replace('Bearer ', '');

            if (token) {
                // Supprimer la session
                await pool.query('DELETE FROM sessions WHERE token = $1', [token]);
            }

            res.json({
                success: true,
                message: 'Déconnexion réussie'
            });

        } catch (error) {
            console.error('Erreur lors de la déconnexion:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur interne du serveur',
                error: error.message
            });
        }
    }

    // Vérifier le token et récupérer les informations utilisateur
    async verifyToken(req, res) {
        try {
            const token = req.headers.authorization && req.headers.authorization.replace('Bearer ', '');

            if (!token) {
                return res.status(401).json({
                    success: false,
                    message: 'Token d\'authentification requis'
                });
            }

            // Vérifier le token
            const decoded = jwt.verify(token, this.secretKey);

            // Vérifier si la session existe encore
            const session = await pool.query(
                'SELECT * FROM sessions WHERE token = $1 AND expires_at > CURRENT_TIMESTAMP', [token]
            );

            if (session.rows.length === 0) {
                return res.status(401).json({
                    success: false,
                    message: 'Session expirée ou invalide'
                });
            }

            // Récupérer les informations utilisateur mises à jour avec ministère, direction et direction générale
            const user = await pool.query(`
                SELECT u.*, r.nom as role_nom, r.permissions, a.id_ministere, a.id_direction, a.id_direction_generale
                FROM utilisateurs u
                JOIN roles r ON u.id_role = r.id
                LEFT JOIN agents a ON u.id_agent = a.id
                WHERE u.id = $1 AND u.is_active = true
            `, [decoded.id]);

            if (user.rows.length === 0) {
                return res.status(401).json({
                    success: false,
                    message: 'Utilisateur non trouvé ou inactif'
                });
            }

            const roleNom = user.rows[0].role_nom;
            const roleCode = normalizeRoleCode(roleNom);
            res.json({
                success: true,
                data: {
                    id: user.rows[0].id,
                    username: user.rows[0].username,
                    email: user.rows[0].email,
                    role: roleCode || roleNom,
                    role_nom: roleNom,
                    role_code: roleCode,
                    permissions: user.rows[0].permissions,
                    id_agent: user.rows[0].id_agent,
                    id_ministere: user.rows[0].id_ministere,
                    id_direction: user.rows[0].id_direction,
                    id_direction_generale: user.rows[0].id_direction_generale
                }
            });

        } catch (error) {
            if (error.name === 'JsonWebTokenError') {
                return res.status(401).json({
                    success: false,
                    message: 'Token invalide'
                });
            }
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    message: 'Token expiré'
                });
            }

            console.error('Erreur lors de la vérification du token:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur interne du serveur',
                error: error.message
            });
        }
    }

    // Réinitialisation du mot de passe
    async requestPasswordReset(req, res) {
        try {
            const { email } = req.body;

            if (!email) {
                return res.status(400).json({
                    success: false,
                    message: 'Email requis'
                });
            }

            // Vérifier si l'utilisateur existe
            const user = await pool.query(
                'SELECT id FROM utilisateurs WHERE email = $1 AND is_active = true', [email]
            );

            if (user.rows.length === 0) {
                // Pour des raisons de sécurité, on ne révèle pas si l'email existe
                return res.json({
                    success: true,
                    message: 'Si l\'email existe, un lien de réinitialisation a été envoyé'
                });
            }

            // Générer un token de réinitialisation
            const resetToken = jwt.sign({ id: user.rows[0].id, type: 'password_reset' },
                this.secretKey, { expiresIn: '1h' }
            );

            // Enregistrer le token
            await pool.query(
                'UPDATE utilisateurs SET password_reset_token = $1, password_reset_expires = $2 WHERE id = $3', [resetToken, new Date(Date.now() + 60 * 60 * 1000), user.rows[0].id]
            );

            // TODO: Envoyer l'email avec le lien de réinitialisation
            // Pour l'instant, on retourne le token (en production, il faut l'envoyer par email)

            res.json({
                success: true,
                message: 'Lien de réinitialisation généré',
                data: { resetToken } // À supprimer en production
            });

        } catch (error) {
            console.error('Erreur lors de la demande de réinitialisation:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur interne du serveur',
                error: error.message
            });
        }
    }

    // Réinitialiser le mot de passe
    async resetPassword(req, res) {
        try {
            const { token, newPassword } = req.body;

            if (!token || !newPassword) {
                return res.status(400).json({
                    success: false,
                    message: 'Token et nouveau mot de passe requis'
                });
            }

            // Vérifier le token
            const decoded = jwt.verify(token, this.secretKey);

            if (decoded.type !== 'password_reset') {
                return res.status(400).json({
                    success: false,
                    message: 'Token invalide'
                });
            }

            // Vérifier si le token existe et n'est pas expiré
            const user = await pool.query(
                'SELECT id FROM utilisateurs WHERE password_reset_token = $1 AND password_reset_expires > CURRENT_TIMESTAMP', [token]
            );

            if (user.rows.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Token invalide ou expiré'
                });
            }

            // Hasher le nouveau mot de passe
            const saltRounds = 12;
            const passwordHash = await bcrypt.hash(newPassword, saltRounds);

            // Mettre à jour le mot de passe et nettoyer le token
            await pool.query(
                'UPDATE utilisateurs SET password_hash = $1, password_reset_token = NULL, password_reset_expires = NULL WHERE id = $2', [passwordHash, user.rows[0].id]
            );

            res.json({
                success: true,
                message: 'Mot de passe mis à jour avec succès'
            });

        } catch (error) {
            if (error.name === 'JsonWebTokenError') {
                return res.status(400).json({
                    success: false,
                    message: 'Token invalide'
                });
            }
            if (error.name === 'TokenExpiredError') {
                return res.status(400).json({
                    success: false,
                    message: 'Token expiré'
                });
            }

            console.error('Erreur lors de la réinitialisation du mot de passe:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur interne du serveur',
                error: error.message
            });
        }
    }

    // Mettre à jour le mot de passe pour un utilisateur authentifié
    async changePassword(req, res) {
        try {
            const userId = req.user ? req.user.id : null;
            const { currentPassword, newPassword, confirmPassword } = req.body;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Utilisateur non authentifié'
                });
            }

            if (!currentPassword || !newPassword || !confirmPassword) {
                return res.status(400).json({
                    success: false,
                    message: 'Tous les champs sont requis'
                });
            }

            if (newPassword !== confirmPassword) {
                return res.status(400).json({
                    success: false,
                    message: 'Les nouveaux mots de passe ne correspondent pas'
                });
            }

            if (newPassword.length < 8) {
                return res.status(400).json({
                    success: false,
                    message: 'Le nouveau mot de passe doit contenir au moins 8 caractères'
                });
            }

            if (currentPassword === newPassword) {
                return res.status(400).json({
                    success: false,
                    message: 'Le nouveau mot de passe doit être différent de l\'ancien'
                });
            }

            // Récupérer l'utilisateur
            const userResult = await pool.query(
                'SELECT password_hash FROM utilisateurs WHERE id = $1 AND is_active = true', [userId]
            );

            if (userResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Utilisateur introuvable ou inactif'
                });
            }

            const userData = userResult.rows[0];

            // Vérifier le mot de passe actuel
            const isCurrentPasswordValid = await bcrypt.compare(currentPassword, userData.password_hash);

            if (!isCurrentPasswordValid) {
                return res.status(400).json({
                    success: false,
                    message: 'Le mot de passe actuel est incorrect'
                });
            }

            // Hasher le nouveau mot de passe
            const saltRounds = 12;
            const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

            // Mettre à jour le mot de passe
            await pool.query(
                'UPDATE utilisateurs SET password_hash = $1, password_reset_token = NULL, password_reset_expires = NULL WHERE id = $2', [newPasswordHash, userId]
            );

            // Invalider les autres sessions de l'utilisateur
            const currentToken = req.headers.authorization ? req.headers.authorization.replace('Bearer ', '') : null;
            if (currentToken) {
                await pool.query(
                    'DELETE FROM sessions WHERE id_utilisateur = $1 AND token != $2', [userId, currentToken]
                );
            } else {
                await pool.query(
                    'DELETE FROM sessions WHERE id_utilisateur = $1', [userId]
                );
            }

            res.json({
                success: true,
                message: 'Mot de passe mis à jour avec succès'
            });

        } catch (error) {
            console.error('Erreur lors du changement de mot de passe:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur interne du serveur',
                error: error.message
            });
        }
    }

    // Enregistrer une tentative de connexion
    async recordLoginAttempt(username, ipAddress, success) {
        try {
            await pool.query(
                'INSERT INTO login_attempts (username, ip_address, success) VALUES ($1, $2, $3)', [username, ipAddress, success]
            );
        } catch (error) {
            console.error('Erreur lors de l\'enregistrement de la tentative de connexion:', error);
        }
    }

    // Nettoyer les sessions expirées
    async cleanExpiredSessions() {
        try {
            await pool.query('DELETE FROM sessions WHERE expires_at < CURRENT_TIMESTAMP');
        } catch (error) {
            console.error('Erreur lors du nettoyage des sessions:', error);
        }
    }

    // Obtenir les statistiques de connexion
    async getLoginStats(req, res) {
        try {
            const stats = await pool.query(`
                SELECT 
                    COUNT(*) as total_attempts,
                    COUNT(CASE WHEN success = true THEN 1 END) as successful_logins,
                    COUNT(CASE WHEN success = false THEN 1 END) as failed_logins,
                    COUNT(CASE WHEN created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours' THEN 1 END) as last_24h
                FROM login_attempts
            `);

            res.json({
                success: true,
                data: stats.rows[0]
            });

        } catch (error) {
            console.error('Erreur lors de la récupération des statistiques:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur interne du serveur',
                error: error.message
            });
        }
    }

    // Vérifier si l'utilisateur a accès au ministère (pour la connexion)
    async checkLoginMinistere(req, res) {
        try {
            console.log('=== checkLoginMinistere appelé ===');
            console.log('Body reçu:', JSON.stringify(req.body));
            console.log('Headers:', JSON.stringify(req.headers));
            
            const { username, ministereId } = req.body;

            if (!username || !ministereId) {
                console.log('Paramètres manquants - username:', username, 'ministereId:', ministereId);
                return res.status(400).json({
                    authorized: false,
                    message: 'Username et ministereId sont requis'
                });
            }

            // Convertir ministereId en nombre si c'est une chaîne
            let ministereIdNum = typeof ministereId === 'string' ? parseInt(ministereId, 10) : ministereId;
            
            // Si c'est null ou undefined, essayer de le convertir
            if (ministereIdNum === null || ministereIdNum === undefined) {
                ministereIdNum = ministereId ? parseInt(ministereId, 10) : null;
            }
            
            if (ministereIdNum === null || isNaN(ministereIdNum)) {
                console.log('❌ ministereId invalide:', {
                    ministereId,
                    type: typeof ministereId,
                    ministereIdNum,
                    typeNum: typeof ministereIdNum
                });
                return res.status(400).json({
                    authorized: false,
                    message: 'ministereId doit être un nombre valide'
                });
            }
            
            console.log('✅ ministereId converti:', {
                original: ministereId,
                converted: ministereIdNum,
                type: typeof ministereIdNum
            });

            console.log('Recherche utilisateur:', username);

            // D'abord, récupérer les informations de l'utilisateur
            const userQuery = `
                SELECT 
                    u.id as user_id,
                    u.username,
                    u.email,
                    u.id_role,
                    u.id_agent,
                    r.nom as role_nom
                FROM utilisateurs u
                LEFT JOIN roles r ON u.id_role = r.id
                WHERE u.username = $1
            `;

            const userResult = await pool.query(userQuery, [username]);
            console.log('Utilisateur trouvé:', userResult.rows.length > 0 ? 'Oui' : 'Non');

            if (userResult.rows.length === 0) {
                return res.json({
                    authorized: false,
                    message: 'Utilisateur non trouvé'
                });
            }

            const userData = userResult.rows[0];
            console.log('Données utilisateur:', {
                id: userData.user_id,
                username: userData.username,
                role: userData.role_nom,
                id_agent: userData.id_agent
            });

            // Si c'est un super_admin, il a accès à tous les ministères
            if (userData.role_nom === 'super_admin') {
                // Récupérer les informations du ministère
                const ministereQuery = `
                    SELECT 
                        m.id as ministere_id,
                        m.nom as ministere_nom,
                        m.code as ministere_code
                    FROM ministeres m
                    WHERE m.id = $1
                `;

                const ministereResult = await pool.query(ministereQuery, [ministereIdNum]);

                if (ministereResult.rows.length === 0) {
                    return res.json({
                        authorized: false,
                        message: 'Ministère non trouvé'
                    });
                }

                const ministereData = ministereResult.rows[0];

                return res.json({
                    authorized: true,
                    user: {
                        id: userData.user_id,
                        username: userData.username,
                        email: userData.email,
                        role: userData.role_nom,
                        agent: null, // Les super_admin ne sont pas des agents
                        ministere: {
                            id: ministereData.ministere_id,
                            nom: ministereData.ministere_nom,
                            code: ministereData.ministere_code
                        }
                    }
                });

                // Si c'est un DRH, vérifier qu'il appartient au ministère demandé
            } else if (userData.role_nom && userData.role_nom.toLowerCase() === 'drh') {
                console.log('🔍 Vérification DRH:', {
                    username: userData.username,
                    id_agent: userData.id_agent,
                    ministereIdNum,
                    type_ministereIdNum: typeof ministereIdNum
                });
                
                // Vérifier que le DRH a un agent associé
                if (!userData.id_agent) {
                    console.log('❌ DRH sans agent associé');
                    return res.json({
                        authorized: false,
                        message: 'DRH n\'a pas d\'agent associé'
                    });
                }

                // Vérifier que l'agent du DRH appartient au ministère demandé
                const drhQuery = `
                    SELECT 
                        a.id as agent_id,
                        a.nom as agent_nom,
                        a.prenom as agent_prenom,
                        a.matricule,
                        a.id_ministere,
                        m.id as ministere_id,
                        m.nom as ministere_nom,
                        m.code as ministere_code
                    FROM agents a
                    LEFT JOIN ministeres m ON a.id_ministere = m.id
                    WHERE a.id = $1 AND a.id_ministere = $2
                `;

                console.log('🔍 Exécution requête DRH:', {
                    query: drhQuery,
                    params: [userData.id_agent, ministereIdNum]
                });

                const drhResult = await pool.query(drhQuery, [userData.id_agent, ministereIdNum]);

                console.log('🔍 Résultat requête DRH:', {
                    rowsCount: drhResult.rows.length,
                    rows: drhResult.rows
                });

                if (drhResult.rows.length === 0) {
                    // Vérifier si l'agent existe mais avec un autre ministère
                    const agentCheckQuery = `SELECT id, id_ministere FROM agents WHERE id = $1`;
                    const agentCheck = await pool.query(agentCheckQuery, [userData.id_agent]);
                    
                    console.log('🔍 Vérification agent:', {
                        agentExists: agentCheck.rows.length > 0,
                        agentMinistere: agentCheck.rows[0]?.id_ministere,
                        requestedMinistere: ministereIdNum
                    });
                    
                    return res.json({
                        authorized: false,
                        message: `DRH n'appartient pas à ce ministère. Agent ID: ${userData.id_agent}, Ministère demandé: ${ministereIdNum}, Ministère agent: ${agentCheck.rows[0]?.id_ministere || 'NULL'}`
                    });
                }

                const drhData = drhResult.rows[0];

                return res.json({
                    authorized: true,
                    user: {
                        id: userData.user_id,
                        username: userData.username,
                        email: userData.email,
                        role: userData.role_nom,
                        agent: {
                            id: drhData.agent_id,
                            nom: drhData.agent_nom,
                            prenom: drhData.agent_prenom,
                            matricule: drhData.matricule
                        },
                        ministere: {
                            id: drhData.ministere_id,
                            nom: drhData.ministere_nom,
                            code: drhData.ministere_code
                        }
                    }
                });

            } else if (['chef_service', 'directeur', 'sous_directeur', 'dir_cabinet', 'ministre', 'chef_cabinet', 'directeur_general', 'directeur_central', 'inspecteur_general', 'directeur_service_exterieur', 'conseiller_technique', 'charge_d_etude', 'charge_de_mission', 'chef_du_secretariat_particulier', 'admin_entite'].includes(normalizeRoleCode(userData.role_nom) || userData.role_nom)) {
                // Pour les cadres et rôles assimilés, vérifier qu'ils appartiennent au ministère demandé.
                // Règle métier Cabinet : pour dir_cabinet/chef_cabinet, a.id_direction = ID de la direction générale
                // qui représente le CABINET (pas une direction nommée "Cabinet").
                // Vérifier que l'utilisateur a un agent associé
                if (!userData.id_agent) {
                    return res.json({
                        authorized: false,
                        message: `${userData.role_nom} n'a pas d'agent associé`
                    });
                }

                const cadreQuery = `
                    SELECT 
                        a.id as agent_id,
                        a.nom as agent_nom,
                        a.prenom as agent_prenom,
                        a.matricule,
                        a.id_ministere,
                        a.id_direction,
                        a.id_direction_generale,
                        m.nom as ministere_nom,
                        m.code as ministere_code,
                        d.libelle as direction_nom,
                        dg.libelle as direction_generale_nom
                    FROM agents a
                    LEFT JOIN ministeres m ON a.id_ministere = m.id
                    LEFT JOIN directions d ON a.id_direction = d.id
                    LEFT JOIN direction_generale dg ON a.id_direction_generale = dg.id
                    WHERE a.id = $1 AND a.id_ministere = $2
                `;

                const cadreResult = await pool.query(cadreQuery, [userData.id_agent, ministereIdNum]);

                if (cadreResult.rows.length === 0) {
                    return res.json({
                        authorized: false,
                        message: `${userData.role_nom} n'appartient pas à ce ministère`
                    });
                }

                const cadreData = cadreResult.rows[0];
                // Pour dir_cabinet/chef_cabinet : utiliser id_direction_generale (colonne dédiée DG) pour la direction du cabinet
                const isCabinetRole = ['dir_cabinet', 'chef_cabinet'].includes(normalizeRoleCode(userData.role_nom));
                const directionId = (isCabinetRole && cadreData.id_direction_generale) ? cadreData.id_direction_generale : cadreData.id_direction;
                const directionNom = (isCabinetRole && cadreData.id_direction_generale && cadreData.direction_generale_nom) ? cadreData.direction_generale_nom : cadreData.direction_nom;

                return res.json({
                    authorized: true,
                    user: {
                        id: userData.user_id,
                        username: userData.username,
                        email: userData.email,
                        role: userData.role_nom,
                        agent: {
                            id: cadreData.agent_id,
                            nom: cadreData.agent_nom,
                            prenom: cadreData.agent_prenom,
                            matricule: cadreData.matricule,
                            id_direction: cadreData.id_direction,
                            id_direction_generale: cadreData.id_direction_generale,
                            direction: {
                                id: directionId,
                                nom: directionNom
                            }
                        },
                        ministere: {
                            id: cadreData.id_ministere,
                            nom: cadreData.ministere_nom,
                            code: cadreData.ministere_code
                        }
                    }
                });

            } else {
                // Pour les autres utilisateurs (agents), vérifier la hiérarchie : utilisateur → agent → ministère
                
                // Vérifier que l'utilisateur a un agent associé
                if (!userData.id_agent) {
                    return res.json({
                        authorized: false,
                        message: 'Utilisateur n\'a pas d\'agent associé'
                    });
                }

                const agentQuery = `
                    SELECT 
                        a.id as agent_id,
                        a.nom as agent_nom,
                        a.prenom as agent_prenom,
                        a.matricule,
                        a.id_ministere,
                        a.id_entite_principale,
                        m.nom as ministere_nom,
                        m.code as ministere_code,
                        e.nom as entite_nom
                    FROM agents a
                    LEFT JOIN ministeres m ON a.id_ministere = m.id
                    LEFT JOIN entites_administratives e ON a.id_entite_principale = e.id
                    WHERE a.id = $1 AND a.id_ministere = $2
                `;

                const agentResult = await pool.query(agentQuery, [userData.id_agent, ministereIdNum]);

                if (agentResult.rows.length === 0) {
                    return res.json({
                        authorized: false,
                        message: 'Agent n\'appartient pas à ce ministère'
                    });
                }

                const agentData = agentResult.rows[0];

                return res.json({
                    authorized: true,
                    user: {
                        id: userData.user_id,
                        username: userData.username,
                        email: userData.email,
                        role: userData.role_nom,
                        agent: {
                            id: agentData.agent_id,
                            nom: agentData.agent_nom,
                            prenom: agentData.agent_prenom,
                            matricule: agentData.matricule,
                            entite: {
                                id: agentData.id_entite_principale,
                                nom: agentData.entite_nom
                            }
                        },
                        ministere: {
                            id: agentData.id_ministere,
                            nom: agentData.ministere_nom,
                            code: agentData.ministere_code
                        }
                    }
                });
            }

        } catch (error) {
            console.error('=== ERREUR dans checkLoginMinistere ===');
            console.error('Type d\'erreur:', error.constructor.name);
            console.error('Message:', error.message);
            console.error('Stack trace:', error.stack);
            console.error('Code d\'erreur:', error.code);
            console.error('Détails:', error);
            
            // Vérifier si c'est une erreur de connexion à la base de données
            if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.message.includes('connect')) {
                console.error('❌ Erreur de connexion à la base de données');
                return res.status(500).json({
                    authorized: false,
                    message: 'Erreur de connexion à la base de données',
                    error: process.env.NODE_ENV === 'development' ? error.message : undefined
                });
            }
            
            // Vérifier si c'est une erreur SQL
            if (error.code && error.code.startsWith('2') || error.code && error.code.startsWith('3') || error.code && error.code.startsWith('4')) {
                console.error('❌ Erreur SQL:', error.message);
                return res.status(500).json({
                    authorized: false,
                    message: 'Erreur lors de la requête à la base de données',
                    error: process.env.NODE_ENV === 'development' ? error.message : undefined
                });
            }
            
            res.status(500).json({
                authorized: false,
                message: 'Erreur serveur lors de la vérification',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Vérifier si l'utilisateur a accès à l'institution (pour la connexion)
    async checkLoginInstitution(req, res) {
        try {
            console.log('=== checkLoginInstitution appelé ===');
            console.log('Body reçu:', JSON.stringify(req.body));
            console.log('Headers:', JSON.stringify(req.headers));
            
            const { username, institutionId } = req.body;

            if (!username || !institutionId) {
                console.log('Paramètres manquants - username:', username, 'institutionId:', institutionId);
                return res.status(400).json({
                    authorized: false,
                    message: 'Username et institutionId sont requis'
                });
            }

            // Convertir institutionId en nombre si c'est une chaîne
            const institutionIdNum = typeof institutionId === 'string' ? parseInt(institutionId, 10) : institutionId;
            
            if (isNaN(institutionIdNum)) {
                console.log('institutionId invalide:', institutionId);
                return res.status(400).json({
                    authorized: false,
                    message: 'institutionId doit être un nombre valide'
                });
            }

            console.log('Recherche utilisateur:', username);

            // D'abord, récupérer les informations de l'utilisateur
            const userQuery = `
                SELECT 
                    u.id as user_id,
                    u.username,
                    u.email,
                    u.id_role,
                    u.id_agent,
                    r.nom as role_nom
                FROM utilisateurs u
                LEFT JOIN roles r ON u.id_role = r.id
                WHERE u.username = $1
            `;

            const userResult = await pool.query(userQuery, [username]);
            console.log('Utilisateur trouvé:', userResult.rows.length > 0 ? 'Oui' : 'Non');

            if (userResult.rows.length === 0) {
                return res.json({
                    authorized: false,
                    message: 'Utilisateur non trouvé'
                });
            }

            const userData = userResult.rows[0];
            console.log('Données utilisateur:', {
                id: userData.user_id,
                username: userData.username,
                role: userData.role_nom,
                id_agent: userData.id_agent
            });

            // Si c'est un super_admin, il a accès à toutes les institutions
            if (userData.role_nom === 'super_admin') {
                // Récupérer les informations de l'institution
                const institutionQuery = `
                    SELECT 
                        i.id as institution_id,
                        i.nom as institution_nom,
                        i.code as institution_code
                    FROM institutions i
                    WHERE i.id = $1
                `;

                const institutionResult = await pool.query(institutionQuery, [institutionIdNum]);

                if (institutionResult.rows.length === 0) {
                    return res.json({
                        authorized: false,
                        message: 'Institution non trouvée'
                    });
                }

                const institutionData = institutionResult.rows[0];

                return res.json({
                    authorized: true,
                    user: {
                        id: userData.user_id,
                        username: userData.username,
                        email: userData.email,
                        role: userData.role_nom,
                        agent: null, // Les super_admin ne sont pas des agents
                        institution: {
                            id: institutionData.institution_id,
                            nom: institutionData.institution_nom,
                            code: institutionData.institution_code
                        }
                    }
                });

                // Si c'est un DRH, vérifier qu'il appartient à l'institution demandée
            } else if (userData.role_nom && userData.role_nom.toLowerCase() === 'drh') {
                // Vérifier que le DRH a un agent associé
                if (!userData.id_agent) {
                    return res.json({
                        authorized: false,
                        message: 'DRH n\'a pas d\'agent associé'
                    });
                }

                // Vérifier que l'agent du DRH appartient à l'institution demandée
                const drhQuery = `
                    SELECT 
                        a.id as agent_id,
                        a.nom as agent_nom,
                        a.prenom as agent_prenom,
                        a.matricule,
                        a.id_institution,
                        i.id as institution_id,
                        i.nom as institution_nom,
                        i.code as institution_code
                    FROM agents_institutions_main a
                    LEFT JOIN institutions i ON a.id_institution = i.id
                    WHERE a.id = $1 AND a.id_institution = $2
                `;

                const drhResult = await pool.query(drhQuery, [userData.id_agent, institutionIdNum]);

                if (drhResult.rows.length === 0) {
                    return res.json({
                        authorized: false,
                        message: 'DRH n\'appartient pas à cette institution'
                    });
                }

                const drhData = drhResult.rows[0];

                return res.json({
                    authorized: true,
                    user: {
                        id: userData.user_id,
                        username: userData.username,
                        email: userData.email,
                        role: userData.role_nom,
                        agent: {
                            id: drhData.agent_id,
                            nom: drhData.agent_nom,
                            prenom: drhData.agent_prenom,
                            matricule: drhData.matricule
                        },
                        institution: {
                            id: drhData.institution_id,
                            nom: drhData.institution_nom,
                            code: drhData.institution_code
                        }
                    }
                });

            } else if (['chef_service', 'directeur', 'sous_directeur', 'dir_cabinet', 'ministre', 'chef_cabinet', 'directeur_general', 'directeur_central', 'inspecteur_general', 'directeur_service_exterieur', 'conseiller_technique', 'charge_d_etude', 'charge_de_mission', 'chef_du_secretariat_particulier', 'admin_entite'].includes(normalizeRoleCode(userData.role_nom) || userData.role_nom)) {
                // Pour les cadres et rôles assimilés, vérifier qu'ils appartiennent à l'institution demandée.
                // Cabinet : id_direction = direction générale qui est le Cabinet (pas une direction nommée "Cabinet").
                // Vérifier que l'utilisateur a un agent associé
                if (!userData.id_agent) {
                    return res.json({
                        authorized: false,
                        message: `${userData.role_nom} n'a pas d'agent associé`
                    });
                }

                const cadreQuery = `
                    SELECT 
                        a.id as agent_id,
                        a.nom as agent_nom,
                        a.prenom as agent_prenom,
                        a.matricule,
                        a.id_institution,
                        a.id_direction,
                        i.nom as institution_nom,
                        i.code as institution_code,
                        d.libelle as direction_nom
                    FROM agents_institutions_main a
                    LEFT JOIN institutions i ON a.id_institution = i.id
                    LEFT JOIN directions d ON a.id_direction = d.id
                    WHERE a.id = $1 AND a.id_institution = $2
                `;

                const cadreResult = await pool.query(cadreQuery, [userData.id_agent, institutionIdNum]);

                if (cadreResult.rows.length === 0) {
                    return res.json({
                        authorized: false,
                        message: `${userData.role_nom} n'appartient pas à cette institution`
                    });
                }

                const cadreData = cadreResult.rows[0];

                return res.json({
                    authorized: true,
                    user: {
                        id: userData.user_id,
                        username: userData.username,
                        email: userData.email,
                        role: userData.role_nom,
                        agent: {
                            id: cadreData.agent_id,
                            nom: cadreData.agent_nom,
                            prenom: cadreData.agent_prenom,
                            matricule: cadreData.matricule,
                            direction: {
                                id: cadreData.id_direction,
                                nom: cadreData.direction_nom
                            }
                        },
                        institution: {
                            id: cadreData.id_institution,
                            nom: cadreData.institution_nom,
                            code: cadreData.institution_code
                        }
                    }
                });

            } else {
                // Pour les autres utilisateurs (agents), vérifier la hiérarchie : utilisateur → agent → institution
                
                // Vérifier que l'utilisateur a un agent associé
                if (!userData.id_agent) {
                    return res.json({
                        authorized: false,
                        message: 'Utilisateur n\'a pas d\'agent associé'
                    });
                }

                const agentQuery = `
                    SELECT 
                        a.id as agent_id,
                        a.nom as agent_nom,
                        a.prenom as agent_prenom,
                        a.matricule,
                        a.id_institution,
                        a.id_entite_principale,
                        i.nom as institution_nom,
                        i.code as institution_code,
                        e.nom as entite_nom
                    FROM agents_institutions_main a
                    LEFT JOIN institutions i ON a.id_institution = i.id
                    LEFT JOIN entites_institutions e ON a.id_entite_principale = e.id
                    WHERE a.id = $1 AND a.id_institution = $2
                `;

                const agentResult = await pool.query(agentQuery, [userData.id_agent, institutionIdNum]);

                if (agentResult.rows.length === 0) {
                    return res.json({
                        authorized: false,
                        message: 'Agent n\'appartient pas à cette institution'
                    });
                }

                const agentData = agentResult.rows[0];

                return res.json({
                    authorized: true,
                    user: {
                        id: userData.user_id,
                        username: userData.username,
                        email: userData.email,
                        role: userData.role_nom,
                        agent: {
                            id: agentData.agent_id,
                            nom: agentData.agent_nom,
                            prenom: agentData.agent_prenom,
                            matricule: agentData.matricule,
                            entite: {
                                id: agentData.id_entite_principale,
                                nom: agentData.entite_nom
                            }
                        },
                        institution: {
                            id: agentData.id_institution,
                            nom: agentData.institution_nom,
                            code: agentData.institution_code
                        }
                    }
                });
            }

        } catch (error) {
            console.error('=== ERREUR dans checkLoginInstitution ===');
            console.error('Type d\'erreur:', error.constructor.name);
            console.error('Message:', error.message);
            console.error('Stack trace:', error.stack);
            console.error('Code d\'erreur:', error.code);
            console.error('Détails:', error);
            
            // Vérifier si c'est une erreur de connexion à la base de données
            if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.message.includes('connect')) {
                console.error('❌ Erreur de connexion à la base de données');
                return res.status(500).json({
                    authorized: false,
                    message: 'Erreur de connexion à la base de données',
                    error: process.env.NODE_ENV === 'development' ? error.message : undefined
                });
            }
            
            // Vérifier si c'est une erreur SQL
            if (error.code && error.code.startsWith('2') || error.code && error.code.startsWith('3') || error.code && error.code.startsWith('4')) {
                console.error('❌ Erreur SQL:', error.message);
                return res.status(500).json({
                    authorized: false,
                    message: 'Erreur lors de la requête à la base de données',
                    error: process.env.NODE_ENV === 'development' ? error.message : undefined
                });
            }
            
            res.status(500).json({
                authorized: false,
                message: 'Erreur serveur lors de la vérification',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    // Vérifier si l'agent de l'utilisateur connecté appartient au ministère (avec token)
    async checkAgentMinistere(req, res) {
        try {
            const token = req.headers.authorization ? req.headers.authorization.split(' ')[1] : null;
            const { ministereId } = req.body;

            if (!token) {
                return res.json({
                    authorized: false,
                    message: 'Token manquant'
                });
            }

            if (!ministereId) {
                return res.json({
                    authorized: false,
                    message: 'ministereId est requis'
                });
            }

            // Décoder le token JWT
            const decoded = jwt.verify(token, this.secretKey);

            // Vérifier la hiérarchie : utilisateur → agent → ministère
            const query = `
                SELECT 
                    u.id as user_id,
                    u.username,
                    u.email,
                    u.id_role,
                    a.id as agent_id,
                    a.nom as agent_nom,
                    a.prenom as agent_prenom,
                    a.matricule,
                    a.id_ministere,
                    a.id_entite_principale,
                    m.nom as ministere_nom,
                    m.code as ministere_code,
                    e.nom as entite_nom,
                    r.nom as role_nom
                FROM utilisateurs u
                LEFT JOIN roles r ON u.id_role = r.id
                LEFT JOIN agents a ON u.id_agent = a.id
                LEFT JOIN ministeres m ON a.id_ministere = m.id
                LEFT JOIN entites_administratives e ON a.id_entite_principale = e.id
                WHERE u.id = $1 AND a.id_ministere = $2
            `;

            const result = await pool.query(query, [decoded.id, ministereId]);

            if (result.rows.length === 0) {
                return res.json({
                    authorized: false,
                    message: 'Agent non trouvé ou n\'appartient pas à ce ministère'
                });
            }

            const userData = result.rows[0];

            // Vérifier si l'agent est associé
            if (userData.agent_id === null) {
                return res.json({
                    authorized: false,
                    message: 'Aucun agent associé à cet utilisateur'
                });
            }

            res.json({
                authorized: true,
                user: {
                    id: userData.user_id,
                    username: userData.username,
                    email: userData.email,
                    role: userData.role_nom,
                    agent: {
                        id: userData.agent_id,
                        nom: userData.agent_nom,
                        prenom: userData.agent_prenom,
                        matricule: userData.matricule,
                        entite: {
                            id: userData.id_entite_principale,
                            nom: userData.entite_nom
                        }
                    },
                    ministere: {
                        id: userData.id_ministere,
                        nom: userData.ministere_nom,
                        code: userData.ministere_code
                    }
                }
            });

        } catch (error) {
            console.error('Erreur de vérification agent-ministère:', error);
            res.status(500).json({
                authorized: false,
                message: 'Erreur serveur lors de la vérification'
            });
        }
    }
}

module.exports = AuthController;