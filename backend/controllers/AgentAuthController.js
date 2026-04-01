const authCodeService = require('../services/authCodeService');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');

class AgentAuthController {
    // Authentification d'un agent avec son matricule et code de connexion
    async loginWithCode(req, res) {
        try {
            const { matricule, code } = req.body;

            // Validation des données
            if (!matricule || !code) {
                return res.status(400).json({
                    success: false,
                    error: 'Matricule et code de connexion requis'
                });
            }

            // Récupérer l'agent par matricule avec grade et type d'agent
            const agent = await authCodeService.getAgentByMatricule(matricule);
            if (!agent) {
                return res.status(401).json({
                    success: false,
                    error: 'Matricule invalide'
                });
            }

            // Vérifier si l'agent est retiré manuellement
            if (agent.retire === true) {
                return res.status(403).json({
                    success: false,
                    error: 'Vous n\'avez plus droit d\'accès au système. Votre compte a été retiré.'
                });
            }

            // Vérifier si l'agent est à la retraite (calcul basé sur date de naissance + grade)
            if (agent.date_de_naissance && agent.id_type_d_agent === 1 && agent.grade_libele) {
                // Calcul de l'âge de retraite selon le grade
                const gradeNormalise = String(agent.grade_libele).replace(/\s+/g, '').toUpperCase();
                const ageRetraite = ['A4', 'A5', 'A6', 'A7'].includes(gradeNormalise) ? 65 : 60;
                
                // Calcul de la date de retraite (31 décembre de l'année de retraite)
                const birthYear = new Date(agent.date_de_naissance).getFullYear();
                const retirementYear = birthYear + ageRetraite;
                const dateRetraite = new Date(retirementYear, 11, 31); // 31 décembre (mois 11 = décembre)
                
                // Vérifier si la date de retraite est passée
                if (dateRetraite < new Date()) {
                    return res.status(403).json({
                        success: false,
                        error: 'Vous n\'avez plus droit d\'accès au système. Vous êtes à la retraite depuis le ' + dateRetraite.toLocaleDateString('fr-FR') + '.'
                    });
                }
            }

            // Vérifier le code de connexion
            const codeVerification = await authCodeService.verifyLoginCode(agent.id, code);
            if (!codeVerification.valid) {
                return res.status(401).json({
                    success: false,
                    error: codeVerification.reason
                });
            }

            // Générer un token JWT
            const token = jwt.sign({
                    agentId: agent.id,
                    matricule: agent.matricule,
                    nom: agent.nom,
                    prenom: agent.prenom,
                    email: agent.email,
                    type: 'agent'
                },
                process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '24h' }
            );

            // Retourner les informations de l'agent et le token
            res.json({
                success: true,
                message: 'Connexion réussie',
                token,
                agent: {
                    id: agent.id,
                    matricule: agent.matricule,
                    nom: agent.nom,
                    prenom: agent.prenom,
                    email: agent.email,
                    statut_emploi: agent.statut_emploi
                }
            });

        } catch (error) {
            console.error('Erreur lors de l\'authentification de l\'agent:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur interne du serveur'
            });
        }
    }

    // Générer un nouveau code de connexion pour un agent
    async generateNewCode(req, res) {
        try {
            const { matricule } = req.body;

            if (!matricule) {
                return res.status(400).json({
                    success: false,
                    error: 'Matricule requis'
                });
            }

            // Récupérer l'agent par matricule
            const agent = await authCodeService.getAgentByMatricule(matricule);
            if (!agent) {
                return res.status(404).json({
                    success: false,
                    error: 'Agent non trouvé'
                });
            }

            if (!agent.email) {
                return res.status(400).json({
                    success: false,
                    error: 'Aucun email associé à cet agent'
                });
            }

            // Générer un nouveau code
            const loginCode = authCodeService.generateLoginCode();

            // Sauvegarder le nouveau code
            await authCodeService.saveLoginCode(agent.id, loginCode);

            // Envoyer l'email avec le nouveau code
            const emailService = require('../services/emailService');
            const emailResult = await emailService.sendWelcomeEmail(agent, loginCode);

            if (emailResult.success) {
                res.json({
                    success: true,
                    message: 'Nouveau code de connexion envoyé par email'
                });
            } else {
                res.status(500).json({
                    success: false,
                    error: 'Code généré mais échec de l\'envoi de l\'email'
                });
            }

        } catch (error) {
            console.error('Erreur lors de la génération du nouveau code:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur interne du serveur'
            });
        }
    }

    // Vérifier le statut d'un agent
    async getAgentStatus(req, res) {
        try {
            const { matricule } = req.params;

            const agent = await authCodeService.getAgentByMatricule(matricule);
            if (!agent) {
                return res.status(404).json({
                    success: false,
                    error: 'Agent non trouvé'
                });
            }

            res.json({
                success: true,
                agent: {
                    id: agent.id,
                    matricule: agent.matricule,
                    nom: agent.nom,
                    prenom: agent.prenom,
                    email: agent.email,
                    statut_emploi: agent.statut_emploi,
                    hasEmail: !!agent.email
                }
            });

        } catch (error) {
            console.error('Erreur lors de la vérification du statut de l\'agent:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur interne du serveur'
            });
        }
    }

    // Nettoyer les codes expirés
    async cleanupExpiredCodes(req, res) {
        try {
            const deletedCount = await authCodeService.cleanupExpiredCodes();

            res.json({
                success: true,
                message: `${deletedCount} codes expirés supprimés`
            });

        } catch (error) {
            console.error('Erreur lors du nettoyage des codes expirés:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur interne du serveur'
            });
        }
    }

    // Récupérer les statistiques des codes
    async getCodeStats(req, res) {
        try {
            const stats = await authCodeService.getCodeStats();

            res.json({
                success: true,
                stats
            });

        } catch (error) {
            console.error('Erreur lors de la récupération des statistiques:', error);
            res.status(500).json({
                success: false,
                error: 'Erreur interne du serveur'
            });
        }
    }
}

module.exports = new AgentAuthController();