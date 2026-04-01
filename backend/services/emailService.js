const nodemailer = require('nodemailer');
const crypto = require('crypto');

class EmailService {
    constructor() {
        // Configuration du transporteur email avec options robustes
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: process.env.SMTP_PORT || 587,
            secure: process.env.SMTP_SECURE === 'true' || false, // true pour 465, false pour autres ports
            auth: {
                user: process.env.SMTP_USER || 'your-email@gmail.com',
                pass: process.env.SMTP_PASS || 'your-app-password'
            },
            // Options pour améliorer la compatibilité
            tls: {
                rejectUnauthorized: false
            },
            connectionTimeout: 60000, // 60 secondes
            greetingTimeout: 30000, // 30 secondes
            socketTimeout: 60000, // 60 secondes
            // Retry logic
            pool: true,
            maxConnections: 1,
            maxMessages: 3,
            rateDelta: 20000,
            rateLimit: 5
        });

        // Vérifier la configuration email
        this.verifyConnection();
    }

    // Vérifier la connexion SMTP
    async verifyConnection() {
        try {
            await this.transporter.verify();
            console.log('✅ Service email configuré avec succès');
        } catch (error) {
            console.error('❌ Erreur de configuration email:', error.message);
            console.log('📧 Pour configurer l\'email, ajoutez ces variables dans votre .env:');
            console.log('   SMTP_HOST=smtp.gmail.com');
            console.log('   SMTP_PORT=587');
            console.log('   SMTP_USER=votre-email@gmail.com');
            console.log('   SMTP_PASS=votre-mot-de-passe-application');
        }
    }

    // Générer un code de connexion aléatoire
    generateLoginCode() {
        return crypto.randomBytes(4).toString('hex').toUpperCase();
    }

    // Envoyer un email de bienvenue avec code de connexion
    async sendWelcomeEmail(agentData, loginCode, userPassword = null) {
            const { nom, prenom, email, matricule, username } = agentData;

            const mailOptions = {
                    from: `"Système RH" <${process.env.SMTP_USER || 'noreply@rh-system.com'}>`,
                    to: email,
                    subject: 'Bienvenue - Votre code de connexion',
                    html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: #2c3e50; color: white; padding: 20px; text-align: center; }
                        .content { padding: 30px; background: #f9f9f9; }
                        .code-box { background: #3498db; color: white; padding: 20px; text-align: center; margin: 20px 0; border-radius: 5px; }
                        .code { font-size: 24px; font-weight: bold; letter-spacing: 3px; }
                        .footer { background: #34495e; color: white; padding: 15px; text-align: center; font-size: 12px; }
                        .warning { background: #e74c3c; color: white; padding: 10px; border-radius: 5px; margin: 15px 0; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>🏛️ Système de Gestion RH</h1>
                            <p>Bienvenue dans votre espace personnel</p>
                        </div>
                        
                        <div class="content">
                            <h2>Bonjour ${prenom} ${nom},</h2>
                            
                            <p>Votre compte agent a été créé avec succès dans le système de gestion des ressources humaines.</p>
                            
                            <p><strong>Vos informations de connexion :</strong></p>
                            <ul>
                                <li><strong>Matricule :</strong> ${matricule}</li>
                                <li><strong>Email :</strong> ${email}</li>
                            </ul>
                            
                            ${userPassword ? `
                            <div class="code-box" style="background: #27ae60;">
                                <h3>✅ Compte utilisateur créé - Connexion directe :</h3>
                                <p><strong>Nom d'utilisateur :</strong> ${username || matricule}</p>
                                <p><strong>Mot de passe temporaire :</strong> <span style="font-size: 1.2em; font-weight: bold;">${userPassword}</span></p>
                            </div>
                            
                            <div class="code-box">
                                <h3>Code de connexion alternatif :</h3>
                                <div class="code">${loginCode}</div>
                            </div>
                            
                            <div class="warning">
                                <strong>⚠️ Important :</strong> Vous avez deux options de connexion :
                                <ul>
                                    <li><strong>Connexion directe :</strong> Utilisez votre matricule et le mot de passe temporaire</li>
                                    <li><strong>Code de connexion :</strong> Utilisez le code ci-dessus (valide 24h)</li>
                                </ul>
                                Changez votre mot de passe lors de votre première connexion.
                            </div>
                            
                            <h3>Comment vous connecter :</h3>
                            <ol>
                                <li>Rendez-vous sur le portail RH de votre organisation</li>
                                <li><strong>Option 1 :</strong> Utilisez votre nom d'utilisateur + mot de passe temporaire</li>
                                <li><strong>Option 2 :</strong> Utilisez votre matricule + code de connexion</li>
                                <li>Changez votre mot de passe lors de votre première connexion</li>
                            </ol>
                            ` : `
                            <div class="code-box">
                                <h3>Votre code de connexion temporaire :</h3>
                                <div class="code">${loginCode}</div>
                            </div>
                            
                            <div class="warning">
                                <strong>⚠️ Important :</strong> Ce code est valide pour une durée limitée. 
                                Utilisez-le pour votre première connexion et changez votre mot de passe immédiatement.
                            </div>
                            
                            <h3>Comment vous connecter :</h3>
                            <ol>
                                <li>Rendez-vous sur le portail RH de votre organisation</li>
                                <li>Utilisez votre matricule comme nom d'utilisateur</li>
                                <li>Utilisez le code ci-dessus comme mot de passe temporaire</li>
                                <li>Changez votre mot de passe lors de votre première connexion</li>
                            </ol>
                            `}
                            
                            <p>Si vous avez des questions ou des problèmes, contactez votre service RH.</p>
                            
                            <p>Cordialement,<br>
                            <strong>L'équipe des Ressources Humaines</strong></p>
                        </div>
                        
                        <div class="footer">
                            <p>Cet email a été envoyé automatiquement. Merci de ne pas y répondre.</p>
                            <p>© ${new Date().getFullYear()} Système de Gestion RH</p>
                        </div>
                    </div>
                </body>
                </html>
            `,
            text: `
                Système de Gestion RH - Bienvenue
                
                Bonjour ${prenom} ${nom},
                
                Votre compte agent a été créé avec succès.
                
                Informations de connexion :
                - Matricule : ${matricule}
                - Email : ${email}
                ${userPassword ? `
                - Nom d'utilisateur : ${username || matricule}
                - Mot de passe temporaire : ${userPassword}
                - Code de connexion alternatif : ${loginCode}
                
                IMPORTANT : Vous avez deux options de connexion :
                1. Connexion directe : Utilisez votre nom d'utilisateur + mot de passe temporaire
                2. Code de connexion : Utilisez le code ci-dessus (valide 24h)
                ` : `
                - Code de connexion temporaire : ${loginCode}
                
                IMPORTANT : Ce code est valide pour une durée limitée.
                Utilisez-le pour votre première connexion et changez votre mot de passe.
                `}
                
                Comment vous connecter :
                1. Rendez-vous sur le portail RH
                2. ${userPassword ? 'Option 1: Utilisez votre nom d\'utilisateur + mot de passe temporaire' : 'Utilisez votre matricule comme nom d\'utilisateur'}
                3. ${userPassword ? 'Option 2: Utilisez votre matricule + code de connexion' : 'Utilisez le code ci-dessus comme mot de passe temporaire'}
                4. Changez votre mot de passe lors de votre première connexion
                
                Cordialement,
                L'équipe des Ressources Humaines
            `
        };

        try {
            const info = await this.transporter.sendMail(mailOptions);
            console.log(`✅ Email envoyé à ${email}:`, info.messageId);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error(`❌ Erreur envoi email à ${email}:`, error.message);
            
            // Messages d'erreur plus explicites
            let errorMessage = error.message;
            if (error.message.includes('Greeting never received')) {
                errorMessage = 'Problème de connexion SMTP - Vérifiez la configuration du serveur email';
            } else if (error.message.includes('Invalid login')) {
                errorMessage = 'Identifiants SMTP invalides - Vérifiez email/mot de passe';
            } else if (error.message.includes('Connection timeout')) {
                errorMessage = 'Timeout de connexion SMTP - Vérifiez la connectivité réseau';
            }
            
            return { success: false, error: errorMessage };
        }
    }

    // Envoyer un email de réinitialisation de mot de passe
    async sendPasswordResetEmail(email, resetCode) {
        const mailOptions = {
            from: `"Système RH" <${process.env.SMTP_USER || 'noreply@rh-system.com'}>`,
            to: email,
            subject: 'Réinitialisation de votre mot de passe',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: #e74c3c; color: white; padding: 20px; text-align: center; }
                        .content { padding: 30px; background: #f9f9f9; }
                        .code-box { background: #3498db; color: white; padding: 20px; text-align: center; margin: 20px 0; border-radius: 5px; }
                        .code { font-size: 24px; font-weight: bold; letter-spacing: 3px; }
                        .footer { background: #34495e; color: white; padding: 15px; text-align: center; font-size: 12px; }
                        .warning { background: #f39c12; color: white; padding: 10px; border-radius: 5px; margin: 15px 0; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>🔐 Réinitialisation de mot de passe</h1>
                        </div>
                        
                        <div class="content">
                            <h2>Demande de réinitialisation</h2>
                            
                            <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
                            
                            <div class="code-box">
                                <h3>Votre code de réinitialisation :</h3>
                                <div class="code">${resetCode}</div>
                            </div>
                            
                            <div class="warning">
                                <strong>⚠️ Important :</strong> Ce code est valide pour 15 minutes seulement.
                            </div>
                            
                            <p>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
                        </div>
                        
                        <div class="footer">
                            <p>© ${new Date().getFullYear()} Système de Gestion RH</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };

        try {
            const info = await this.transporter.sendMail(mailOptions);
            console.log(`✅ Email de réinitialisation envoyé à ${email}:`, info.messageId);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error(`❌ Erreur envoi email de réinitialisation à ${email}:`, error.message);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new EmailService();