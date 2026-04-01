const crypto = require('crypto');
const pool = require('../config/database');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

class WebAuthnController {
    constructor() {
        this.secretKey = process.env.JWT_SECRET || 'your-secret-key';
        this.expiresIn = '24h';
        this.rpId = process.env.WEBAUTHN_RP_ID || 'localhost'; // Relying Party ID
        this.rpName = process.env.WEBAUTHN_RP_NAME || 'Ministère RH';
        
        // Liste des origines autorisées pour WebAuthn (similaire à CORS)
        // Peut être configurée via WEBAUTHN_ORIGINS (séparées par des virgules) ou utilise les valeurs par défaut
        const originsFromEnv = process.env.WEBAUTHN_ORIGINS 
            ? process.env.WEBAUTHN_ORIGINS.split(',').map(o => o.trim())
            : [];
        
        this.allowedOrigins = originsFromEnv.length > 0 ? originsFromEnv : [
            'http://localhost:3000', // React frontend principal
            'http://localhost:3001', // Ministère Éducation
            'http://localhost:3002', // Ministère Santé
            'http://localhost:3003', // Ministère Finances
            'https://tourisme.2ise-groupe.com', // Production - Ministère Tourisme
            'http://tourisme.2ise-groupe.com', // Production - Ministère Tourisme (sans HTTPS)
            'http://sigrh-mtl.ci', // Production - SIGRH MTL
            'https://sigrh-mtl.ci', // Production - SIGRH MTL (HTTPS)
            process.env.WEBAUTHN_ORIGIN // URL personnalisée depuis .env (pour compatibilité)
        ].filter(Boolean); // Supprime les valeurs undefined/null
        
        // Pour compatibilité avec l'ancien code
        this.origin = this.allowedOrigins[0] || 'http://localhost:3000';
    }
    
    // Vérifier si une origine est autorisée
    isOriginAllowed(origin) {
        if (!origin) return false;
        
        // Vérification exacte
        if (this.allowedOrigins.includes(origin)) {
            return true;
        }
        
        // Vérification flexible (pour gérer les variations http/https)
        for (const allowedOrigin of this.allowedOrigins) {
            // Comparaison exacte
            if (origin === allowedOrigin) {
                return true;
            }
            // Vérifier si l'origine contient le domaine autorisé (pour gérer les ports différents)
            if (allowedOrigin.includes(origin) || origin.includes(allowedOrigin)) {
                return true;
            }
            // Extraire le domaine de base (sans protocole) pour comparaison
            const allowedDomain = allowedOrigin.replace(/^https?:\/\//, '').split(':')[0];
            const originDomain = origin.replace(/^https?:\/\//, '').split(':')[0];
            if (allowedDomain === originDomain) {
                return true;
            }
        }
        
        return false;
    }

    // Générer un challenge pour l'enregistrement
    async generateRegistrationChallenge(req, res) {
        try {
            const { username } = req.body;

            if (!username) {
                return res.status(400).json({
                    success: false,
                    message: 'Nom d\'utilisateur requis'
                });
            }

            // Vérifier que l'utilisateur existe
            const userResult = await pool.query(
                'SELECT id, username, email FROM utilisateurs WHERE username = $1 AND is_active = true',
                [username]
            );

            if (userResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Utilisateur non trouvé'
                });
            }

            const user = userResult.rows[0];

            // Générer un challenge unique
            const challenge = crypto.randomBytes(32).toString('base64url');
            const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

            // Stocker le challenge
            await pool.query(
                'INSERT INTO webauthn_challenges (challenge, id_utilisateur, type, expires_at) VALUES ($1, $2, $3, $4)',
                [challenge, user.id, 'registration', expiresAt]
            );

            // Nettoyer les anciens challenges
            await this.cleanExpiredChallenges();

            // Préparer les options d'enregistrement WebAuthn
            // Convertir l'ID utilisateur en Buffer puis en base64url pour le frontend
            const userIdBuffer = Buffer.from(user.id.toString());
            const userIdBase64 = userIdBuffer.toString('base64url');
            
            const publicKeyCredentialCreationOptions = {
                challenge: challenge, // Envoyer la chaîne base64url directement
                rp: {
                    id: this.rpId,
                    name: this.rpName
                },
                user: {
                    id: userIdBase64, // Envoyer en base64url
                    name: user.username,
                    displayName: user.email
                },
                pubKeyCredParams: [
                    { alg: -7, type: 'public-key' }, // ES256
                    { alg: -257, type: 'public-key' } // RS256
                ],
                authenticatorSelection: {
                    // Forcer l'utilisation de l'authentificateur intégré (empreinte digitale) plutôt qu'une passkey
                    authenticatorAttachment: 'platform', // Utiliser uniquement l'authentificateur intégré (empreinte digitale)
                    userVerification: 'required', // Requis pour l'empreinte digitale
                    requireResidentKey: false // Ne pas exiger de clé résidente (évite la création de passkey)
                    // Ne pas inclure residentKey pour éviter que le navigateur propose une passkey
                },
                timeout: 60000,
                attestation: 'none', // 'none' pour éviter les demandes de passkey
                excludeCredentials: [], // Liste vide pour forcer une nouvelle création locale
                // Extensions pour désactiver certaines fonctionnalités de passkey
                extensions: {
                    // Désactiver la création automatique de passkey
                    credProps: false
                }
            };

            res.json({
                success: true,
                challenge: challenge,
                options: publicKeyCredentialCreationOptions
            });

        } catch (error) {
            console.error('Erreur lors de la génération du challenge d\'enregistrement:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur interne du serveur',
                error: error.message
            });
        }
    }

    // Enregistrer un credential WebAuthn
    async registerCredential(req, res) {
        try {
            const { username, credential, clientDataJSON, attestationObject, deviceName } = req.body;

            if (!username || !credential || !clientDataJSON || !attestationObject) {
                return res.status(400).json({
                    success: false,
                    message: 'Données d\'enregistrement incomplètes'
                });
            }

            // Vérifier que l'utilisateur existe
            const userResult = await pool.query(
                'SELECT id FROM utilisateurs WHERE username = $1 AND is_active = true',
                [username]
            );

            if (userResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Utilisateur non trouvé'
                });
            }

            const userId = userResult.rows[0].id;

            // Décoder et vérifier le clientDataJSON
            const clientData = JSON.parse(Buffer.from(clientDataJSON, 'base64url').toString());
            
            // Vérifier le challenge
            const challengeResult = await pool.query(
                'SELECT * FROM webauthn_challenges WHERE challenge = $1 AND id_utilisateur = $2 AND type = $3 AND expires_at > CURRENT_TIMESTAMP',
                [clientData.challenge, userId, 'registration']
            );

            if (challengeResult.rows.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Challenge invalide ou expiré'
                });
            }

            // Vérifier l'origine
            if (!this.isOriginAllowed(clientData.origin)) {
                console.warn(`⚠️ Origine non autorisée pour l'enregistrement: ${clientData.origin}`);
                console.log(`📋 Origines autorisées: ${this.allowedOrigins.join(', ')}`);
                return res.status(400).json({
                    success: false,
                    message: `Origine non autorisée: ${clientData.origin}`
                });
            }

            // Vérifier le type
            if (clientData.type !== 'webauthn.create') {
                return res.status(400).json({
                    success: false,
                    message: 'Type de requête invalide'
                });
            }

            // Stocker le credential (en production, il faudrait décoder et valider l'attestation)
            // Pour simplifier, on stocke les données brutes
            const credentialId = credential.id;
            const publicKey = JSON.stringify({
                credentialId: credentialId,
                attestationObject: attestationObject,
                clientDataJSON: clientDataJSON
            });

            // Vérifier si un credential existe déjà pour cet utilisateur avec le même ID
            const existingCredential = await pool.query(
                'SELECT id FROM webauthn_credentials WHERE credential_id = $1',
                [credentialId]
            );

            if (existingCredential.rows.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Cette empreinte digitale est déjà enregistrée'
                });
            }

            // Enregistrer le credential
            await pool.query(
                `INSERT INTO webauthn_credentials 
                (id_utilisateur, credential_id, public_key, device_name, user_agent, created_at) 
                VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)`,
                [
                    userId,
                    credentialId,
                    publicKey,
                    deviceName || 'Appareil inconnu',
                    req.headers['user-agent'] || ''
                ]
            );

            // Supprimer le challenge utilisé
            await pool.query(
                'DELETE FROM webauthn_challenges WHERE challenge = $1',
                [clientData.challenge]
            );

            res.json({
                success: true,
                message: 'Empreinte digitale enregistrée avec succès'
            });

        } catch (error) {
            console.error('Erreur lors de l\'enregistrement du credential:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur interne du serveur',
                error: error.message
            });
        }
    }

    // Générer un challenge pour l'authentification
    async generateAuthenticationChallenge(req, res) {
        try {
            const { username } = req.body;

            if (!username) {
                return res.status(400).json({
                    success: false,
                    message: 'Nom d\'utilisateur requis'
                });
            }

            // Vérifier que l'utilisateur existe et a des credentials enregistrés
            const userResult = await pool.query(
                `SELECT u.id, u.username, u.email 
                FROM utilisateurs u
                WHERE u.username = $1 AND u.is_active = true
                AND EXISTS (
                    SELECT 1 FROM webauthn_credentials wc 
                    WHERE wc.id_utilisateur = u.id AND wc.is_active = true
                )`,
                [username]
            );

            if (userResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Utilisateur non trouvé ou aucune empreinte digitale enregistrée'
                });
            }

            const user = userResult.rows[0];

            // Récupérer les credentials de l'utilisateur
            const credentialsResult = await pool.query(
                'SELECT credential_id, public_key FROM webauthn_credentials WHERE id_utilisateur = $1 AND is_active = true',
                [user.id]
            );

            if (credentialsResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Aucune empreinte digitale enregistrée pour cet utilisateur'
                });
            }

            // Générer un challenge unique
            const challenge = crypto.randomBytes(32).toString('base64url');
            const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

            // Stocker le challenge
            await pool.query(
                'INSERT INTO webauthn_challenges (challenge, id_utilisateur, type, expires_at) VALUES ($1, $2, $3, $4)',
                [challenge, user.id, 'authentication', expiresAt]
            );

            // Nettoyer les anciens challenges
            await this.cleanExpiredChallenges();

            // Préparer les options d'authentification WebAuthn
            const allowCredentials = credentialsResult.rows.map(cred => ({
                id: cred.credential_id,
                type: 'public-key',
                transports: ['internal'] // Pour les capteurs intégrés
            }));

            const publicKeyCredentialRequestOptions = {
                challenge: challenge, // Envoyer la chaîne base64url directement
                allowCredentials: allowCredentials,
                timeout: 60000,
                userVerification: 'required',
                rpId: this.rpId
            };

            res.json({
                success: true,
                challenge: challenge,
                options: publicKeyCredentialRequestOptions
            });

        } catch (error) {
            console.error('Erreur lors de la génération du challenge d\'authentification:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur interne du serveur',
                error: error.message
            });
        }
    }

    // Authentifier avec un credential WebAuthn
    async authenticate(req, res) {
        try {
            const { username, credential, clientDataJSON, authenticatorData, signature, organizationId, organizationType } = req.body;

            if (!username || !credential || !clientDataJSON || !authenticatorData || !signature) {
                return res.status(400).json({
                    success: false,
                    message: 'Données d\'authentification incomplètes'
                });
            }

            // Vérifier que l'utilisateur existe
            const userResult = await pool.query(
                'SELECT id FROM utilisateurs WHERE username = $1 AND is_active = true',
                [username]
            );

            if (userResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Utilisateur non trouvé'
                });
            }

            const userId = userResult.rows[0].id;

            // Décoder et vérifier le clientDataJSON
            const clientData = JSON.parse(Buffer.from(clientDataJSON, 'base64url').toString());
            
            // Vérifier le challenge
            const challengeResult = await pool.query(
                'SELECT * FROM webauthn_challenges WHERE challenge = $1 AND id_utilisateur = $2 AND type = $3 AND expires_at > CURRENT_TIMESTAMP',
                [clientData.challenge, userId, 'authentication']
            );

            if (challengeResult.rows.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Challenge invalide ou expiré'
                });
            }

            // Vérifier l'origine
            if (!this.isOriginAllowed(clientData.origin)) {
                console.warn(`⚠️ Origine non autorisée pour l'authentification: ${clientData.origin}`);
                console.log(`📋 Origines autorisées: ${this.allowedOrigins.join(', ')}`);
                return res.status(400).json({
                    success: false,
                    message: `Origine non autorisée: ${clientData.origin}`
                });
            }

            // Vérifier le type
            if (clientData.type !== 'webauthn.get') {
                return res.status(400).json({
                    success: false,
                    message: 'Type de requête invalide'
                });
            }

            // Vérifier le credential
            const credentialId = credential.id;
            const credentialResult = await pool.query(
                'SELECT * FROM webauthn_credentials WHERE credential_id = $1 AND id_utilisateur = $2 AND is_active = true',
                [credentialId, userId]
            );

            if (credentialResult.rows.length === 0) {
                return res.status(401).json({
                    success: false,
                    message: 'Credential invalide'
                });
            }

            const credentialData = credentialResult.rows[0];

            // En production, il faudrait vérifier la signature cryptographique
            // Pour l'instant, on accepte si le credential existe et le challenge est valide

            // Mettre à jour le compteur et la date d'utilisation
            await pool.query(
                'UPDATE webauthn_credentials SET counter = counter + 1, last_used_at = CURRENT_TIMESTAMP WHERE id = $1',
                [credentialData.id]
            );

            // Supprimer le challenge utilisé
            await pool.query(
                'DELETE FROM webauthn_challenges WHERE challenge = $1',
                [clientData.challenge]
            );

            // Récupérer les informations complètes de l'utilisateur
            let userQuery = `
                SELECT u.*, r.nom as role_nom, r.permissions
                FROM utilisateurs u
                JOIN roles r ON u.id_role = r.id
                WHERE u.id = $1 AND u.is_active = true
            `;

            let queryParams = [userId];

            // Vérifier l'organisation si spécifiée (même logique que dans AuthController)
            if (organizationId && organizationType) {
                userQuery += ` AND (r.nom = 'super_admin' OR `;
                if (organizationType === 'ministere') {
                    userQuery += `((r.nom IN ('DRH', 'drh', 'agent', 'chef_service', 'directeur', 'sous_directeur', 'dir_cabinet', 'ministre', 'chef_cabinet', 'directeur_general', 'directeur_central') AND (
                        u.id_agent IS NULL OR EXISTS (
                            SELECT 1 FROM agents a 
                            WHERE a.id = u.id_agent 
                            AND a.id_ministere = $2
                        )
                    )))`;
                    queryParams.push(organizationId);
                } else if (organizationType === 'institution') {
                    userQuery += `((r.nom IN ('DRH', 'drh', 'agent', 'chef_service', 'directeur', 'sous_directeur', 'dir_cabinet', 'ministre', 'chef_cabinet', 'directeur_general', 'directeur_central') AND (
                        u.id_agent IS NULL OR EXISTS (
                            SELECT 1 FROM agents_institutions_main a 
                            WHERE a.id = u.id_agent 
                            AND a.id_institution = $2
                        )
                    )))`;
                    queryParams.push(organizationId);
                }
                userQuery += `)`;
            }

            const user = await pool.query(userQuery, queryParams);

            if (user.rows.length === 0) {
                return res.status(401).json({
                    success: false,
                    message: 'Accès non autorisé à cette organisation'
                });
            }

            const userData = user.rows[0];

            // Enregistrer la tentative de connexion réussie
            await this.recordLoginAttempt(username, req.ip, true);

            // Mettre à jour last_login
            await pool.query(
                'UPDATE utilisateurs SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
                [userData.id]
            );

            // Générer le token JWT
            const token = jwt.sign({
                id: userData.id,
                username: userData.username,
                role: userData.role_nom,
                permissions: userData.permissions
            }, this.secretKey, { expiresIn: this.expiresIn });

            // Enregistrer la session
            await pool.query(
                'INSERT INTO sessions (id_utilisateur, token, expires_at) VALUES ($1, $2, $3)',
                [userData.id, token, new Date(Date.now() + 24 * 60 * 60 * 1000)]
            );

            // Préparer les données utilisateur
            const userResponse = {
                id: userData.id,
                username: userData.username,
                email: userData.email,
                role: userData.role_nom,
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
                message: 'Authentification par empreinte digitale réussie',
                data: {
                    token,
                    user: userResponse
                }
            });

        } catch (error) {
            console.error('Erreur lors de l\'authentification:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur interne du serveur',
                error: error.message
            });
        }
    }

    // Lister les credentials d'un utilisateur
    async listCredentials(req, res) {
        try {
            const userId = req.user ? req.user.id : null;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Utilisateur non authentifié'
                });
            }

            const credentials = await pool.query(
                `SELECT id, credential_id, device_name, created_at, last_used_at, is_active
                FROM webauthn_credentials
                WHERE id_utilisateur = $1
                ORDER BY created_at DESC`,
                [userId]
            );

            res.json({
                success: true,
                data: credentials.rows
            });

        } catch (error) {
            console.error('Erreur lors de la récupération des credentials:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur interne du serveur',
                error: error.message
            });
        }
    }

    // Supprimer un credential
    async deleteCredential(req, res) {
        try {
            const userId = req.user ? req.user.id : null;
            const { credentialId } = req.params;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: 'Utilisateur non authentifié'
                });
            }

            // Vérifier que le credential appartient à l'utilisateur
            const credential = await pool.query(
                'SELECT id FROM webauthn_credentials WHERE id = $1 AND id_utilisateur = $2',
                [credentialId, userId]
            );

            if (credential.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'Credential non trouvé'
                });
            }

            // Supprimer le credential
            await pool.query(
                'DELETE FROM webauthn_credentials WHERE id = $1',
                [credentialId]
            );

            res.json({
                success: true,
                message: 'Empreinte digitale supprimée avec succès'
            });

        } catch (error) {
            console.error('Erreur lors de la suppression du credential:', error);
            res.status(500).json({
                success: false,
                message: 'Erreur interne du serveur',
                error: error.message
            });
        }
    }

    // Nettoyer les challenges expirés
    async cleanExpiredChallenges() {
        try {
            await pool.query('DELETE FROM webauthn_challenges WHERE expires_at < CURRENT_TIMESTAMP');
        } catch (error) {
            console.error('Erreur lors du nettoyage des challenges:', error);
        }
    }

    // Enregistrer une tentative de connexion
    async recordLoginAttempt(username, ipAddress, success) {
        try {
            await pool.query(
                'INSERT INTO login_attempts (username, ip_address, success) VALUES ($1, $2, $3)',
                [username, ipAddress, success]
            );
        } catch (error) {
            console.error('Erreur lors de l\'enregistrement de la tentative de connexion:', error);
        }
    }
}

module.exports = WebAuthnController;

