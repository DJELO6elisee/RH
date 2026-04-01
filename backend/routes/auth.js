const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');
const WebAuthnController = require('../controllers/WebAuthnController');
const { authenticate } = require('../middleware/auth');

const authController = new AuthController();
const webauthnController = new WebAuthnController();

// Routes d'authentification
router.post('/register', authController.register.bind(authController));
router.post('/login', authController.login.bind(authController));
router.post('/super-admin-login', authController.superAdminLogin.bind(authController));
router.post('/logout', authController.logout.bind(authController));
router.get('/verify', authController.verifyToken.bind(authController));
router.post('/change-password', authenticate, authController.changePassword.bind(authController));
router.post('/forgot-password', authController.requestPasswordReset.bind(authController));
router.post('/reset-password', authController.resetPassword.bind(authController));

// Routes de statistiques (protégées)
router.get('/stats', authController.getLoginStats.bind(authController));

// Routes de vérification d'appartenance
router.post('/check-login-ministere', authController.checkLoginMinistere.bind(authController));
router.post('/check-agent-ministere', authController.checkAgentMinistere.bind(authController));
router.post('/check-login-institution', authController.checkLoginInstitution.bind(authController));

// Routes WebAuthn (authentification par empreinte digitale)
router.post('/webauthn/register/challenge', webauthnController.generateRegistrationChallenge.bind(webauthnController));
router.post('/webauthn/register', webauthnController.registerCredential.bind(webauthnController));
router.post('/webauthn/authenticate/challenge', webauthnController.generateAuthenticationChallenge.bind(webauthnController));
router.post('/webauthn/authenticate', webauthnController.authenticate.bind(webauthnController));
router.get('/webauthn/credentials', authenticate, webauthnController.listCredentials.bind(webauthnController));
router.delete('/webauthn/credentials/:credentialId', authenticate, webauthnController.deleteCredential.bind(webauthnController));

// Route pour vérifier l'accès à une entité (redirection vers auth-entite)
const pool = require('../config/database');

router.post('/check-login-entite', async(req, res) => {
    try {
        const { username, entiteId } = req.body;

        if (!username || !entiteId) {
            return res.status(400).json({
                success: false,
                message: 'Nom d\'utilisateur et ID d\'entité requis'
            });
        }

        // Vérifier que l'entité existe et est active
        const entiteQuery = `
            SELECT ea.*, m.nom as ministere_nom, m.code as ministere_code
            FROM entites_administratives ea
            LEFT JOIN ministeres m ON ea.id_ministere = m.id
            WHERE ea.id = $1 AND ea.is_active = true
        `;
        const entiteResult = await pool.query(entiteQuery, [entiteId]);

        if (entiteResult.rows.length === 0) {
            return res.json({
                success: false,
                authorized: false,
                message: 'Entité non trouvée ou inactive'
            });
        }

        const entite = entiteResult.rows[0];

        // Vérifier que l'utilisateur existe et est actif
        const userQuery = `
            SELECT u.*, r.nom as role_nom, a.id as agent_id, a.id_entite_principale
            FROM utilisateurs u
            LEFT JOIN roles r ON u.id_role = r.id
            LEFT JOIN agents a ON u.id_agent = a.id
            WHERE u.username = $1 AND u.is_active = true
        `;
        const userResult = await pool.query(userQuery, [username]);

        if (userResult.rows.length === 0) {
            return res.json({
                success: false,
                authorized: false,
                message: 'Utilisateur non trouvé ou inactif'
            });
        }

        const user = userResult.rows[0];

        // Vérifier les permissions selon le rôle
        let authorized = false;
        let message = '';

        if (user.role_nom === 'super_admin') {
            // Les super_admin ont accès à toutes les entités
            authorized = true;
            message = 'Accès autorisé (Super Admin)';
        } else if (user.role_nom && user.role_nom.toLowerCase() === 'drh') {
            // Les DRH peuvent accéder aux entités de leur ministère
            if (user.agent_id && user.id_entite_principale) {
                // Vérifier que l'agent appartient au même ministère que l'entité
                const agentEntiteQuery = `
                    SELECT ea.id_ministere
                    FROM agents a
                    JOIN entites_administratives ea ON a.id_entite_principale = ea.id
                    WHERE a.id = $1
                `;
                const agentEntiteResult = await pool.query(agentEntiteQuery, [user.agent_id]);

                if (agentEntiteResult.rows.length > 0) {
                    const agentMinistereId = agentEntiteResult.rows[0].id_ministere;
                    if (agentMinistereId === entite.id_ministere) {
                        authorized = true;
                        message = 'Accès autorisé (DRH du ministère)';
                    } else {
                        message = 'Vous n\'êtes pas autorisé à accéder à cette entité (ministère différent)';
                    }
                } else {
                    message = 'Agent non trouvé dans une entité';
                }
            } else {
                message = 'Agent non associé à cet utilisateur';
            }
        } else if (user.role_nom === 'agent') {
            // Les agents peuvent accéder uniquement à leur entité
            if (user.agent_id && user.id_entite_principale) {
                if (user.id_entite_principale === parseInt(entiteId)) {
                    authorized = true;
                    message = 'Accès autorisé (Agent de l\'entité)';
                } else {
                    message = 'Vous n\'êtes autorisé qu\'à accéder à votre propre entité';
                }
            } else {
                message = 'Agent non associé à cet utilisateur';
            }
        } else {
            message = 'Rôle non autorisé pour l\'accès aux entités';
        }

        res.json({
            success: true,
            authorized,
            message,
            entite: {
                id: entite.id,
                nom: entite.nom,
                code: entite.code,
                sigle: entite.sigle,
                type_entite: entite.type_entite,
                ministere_nom: entite.ministere_nom,
                ministere_code: entite.ministere_code
            },
            user: {
                id: user.id,
                username: user.username,
                role: user.role_nom,
                agent_id: user.agent_id,
                entite_id: user.id_entite_principale
            }
        });

    } catch (error) {
        console.error('Erreur lors de la vérification d\'accès entité:', error);
        res.status(500).json({
            success: false,
            message: 'Erreur interne du serveur',
            error: error.message
        });
    }
});

module.exports = router;