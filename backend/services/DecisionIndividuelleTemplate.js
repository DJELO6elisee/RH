const { HEADER_CSS, buildHeaderHTML } = require('./officialHeader');
const { formatNameParts } = require('./utils/agentFunction');
const path = require('path');
const fs = require('fs');

class DecisionIndividuelleTemplate {

    static async generateHTML(decision, agent, validateur, annee = new Date().getFullYear()) {
        const dateGeneration = decision.date_decision ? new Date(decision.date_decision).toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }) : new Date().toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const numeroDocument = decision.numero_acte || `_______/MTL/DRH/SDGP`;
        const directionName = decision.direction_libelle || (agent && agent.direction_nom) || 'la Direction des Ressources Humaines';
        
        let agentText = '';
        if (agent) {
            const civilite = agent.sexe === 'F' ? (agent.civilite || 'Mme/Mlle') : 'M.';
            const nomComplet = `${(agent.nom || '').toUpperCase()} ${(agent.prenom || '').toUpperCase()}`;
            const emploi = (agent.emploi || agent.fonction_actuelle || '').toUpperCase();
            agentText = `à ${civilite} ${nomComplet}, matricule ${agent.matricule || ''}, ${emploi} à ${directionName}`;
        } else {
            agentText = `à _____________________, matricule ________________, __________________ à ${directionName}`;
        }

        return `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Décision de Congé Individuelle</title>
            <style>
                ${HEADER_CSS}
                body {
                    font-family: 'Times New Roman', serif;
                    margin: 0;
                    padding: 20px;
                    line-height: 1.5;
                    color: #000;
                    background-color: #fff;
                    font-size: 14px;
                }
                .document-container {
                    max-width: 800px;
                    margin: 0 auto;
                }
                .main-title-block {
                    text-align: center;
                    margin: 40px 0 20px 0;
                }
                .decision-number {
                    font-weight: bold;
                    margin-bottom: 5px;
                }
                .decision-object {
                    font-weight: bold;
                    margin-bottom: 10px;
                }
                .ministry-title {
                    font-weight: bold;
                    text-transform: uppercase;
                    margin-bottom: 20px;
                }
                .vu-list {
                    margin: 20px 0;
                    text-align: justify;
                }
                .vu-item {
                    display: flex;
                    margin-bottom: 5px;
                }
                .vu-label {
                    font-weight: bold;
                    width: 40px;
                    flex-shrink: 0;
                }
                .decide-title {
                    text-align: center;
                    font-weight: bold;
                    text-decoration: underline;
                    letter-spacing: 5px;
                    margin: 30px 0;
                }
                .article {
                    margin-bottom: 15px;
                    text-align: justify;
                }
                .article-title {
                    text-decoration: underline;
                    font-weight: bold;
                }
                .footer-section {
                    display: flex;
                    justify-content: space-between;
                    margin-top: 40px;
                }
                .ampliations {
                    width: 40%;
                }
                .ampliations-title {
                    text-decoration: underline;
                    font-weight: bold;
                    margin-bottom: 10px;
                }
                .ampliation-item {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 3px;
                }
                .signature-block {
                    width: 50%;
                    text-align: center;
                    font-weight: bold;
                }
                .signature-date {
                    margin-bottom: 20px;
                    text-align: left;
                    margin-left: 20%;
                }
                .signature-role {
                    margin-bottom: 60px;
                    text-align: left;
                }
                .signature-name {
                    text-align: left;
                }
            </style>
        </head>
        <body>
            <div class="document-container">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div style="text-align: center; width: 45%;">
                        <div style="font-weight: bold;">MINISTERE DU TOURISME</div>
                        <div style="font-weight: bold;">ET DES LOISIRS</div>
                        <div>------------</div>
                    </div>
                    <div style="text-align: center; width: 45%;">
                        <div style="font-weight: bold;">REPUBLIQUE DE COTE D'IVOIRE</div>
                        <div>Union-Discipline-Travail</div>
                        <div>------------</div>
                    </div>
                </div>
 
                <div class="main-title-block">
                    <div class="decision-number">DECISION N° ${numeroDocument}</div>
                    <div class="decision-object">Portant attribution d'un congé annuel au titre de l'année ${annee}</div>
                    <div class="ministry-title">MINISTRE DU TOURISME ET DES LOISIRS,</div>
                </div>
 
                <div class="vu-list">
                    <div class="vu-item"><div class="vu-label">Vu</div><div>la Constitution ;</div></div>
                    <div class="vu-item"><div class="vu-label">Vu</div><div>la loi n°2023-892 du 23 novembre 2023 portant Statut Général de la Fonction Publique ;</div></div>
                    <div class="vu-item"><div class="vu-label">Vu</div><div>le décret n° 2012-928 du 19 septembre 2012 portant nomination du Directeur des Ressources Humaines du Ministère du Tourisme ;</div></div>
                    <div class="vu-item"><div class="vu-label">Vu</div><div>le décret n° 2021-462 du 08 septembre 2021 portant organisation du Ministère du Tourisme et des Loisirs ;</div></div>
                    <div class="vu-item"><div class="vu-label">Vu</div><div>le décret n°2024-139 du 13 mars 2024 modifiant le décret n° 2011-290 du 12 octobre 2011 portant institution du poste de Directeur des Ressources Humaines dans tous les Ministères ;</div></div>
                    <div class="vu-item"><div class="vu-label">Vu</div><div>le décret n°2025-120 du 26 février 2025 portant modalités communes d'application de la loi portant Statut Général de la Fonction Publique ;</div></div>
                    <div class="vu-item"><div class="vu-label">Vu</div><div>le décret n°2025-121 du 26 février 2025 portant modalités particulières d'application de la loi portant Statut Général de la Fonction Publique ;</div></div>
                    <div class="vu-item"><div class="vu-label">Vu</div><div>le décret n°2026-07 du 21 janvier 2026 portant nomination du Premier Ministre, Chef du Gouvernement ;</div></div>
                    <div class="vu-item"><div class="vu-label">Vu</div><div>le décret n°2026-08 du 23 janvier 2026 portant nomination des membres du Gouvernement ;</div></div>
                    <div class="vu-item"><div class="vu-label">Vu</div><div>le décret n°2026-84 du 04 mars 2026 portant attributions des membres du Gouvernement ;</div></div>
                    <div class="vu-item"><div class="vu-label">Vu</div><div>le soit transmis ou la demande formulée par l'intéressé(e) ;</div></div>
                </div>
 
                <div class="decide-title">DECIDE</div>
 
                <div class="article">
                    <span class="article-title">Article 1</span> : Un congé annuel de 30 jours consécutifs au titre de l'année ${annee} à solde de présence pour en jouir à ses frais, est accordé ${agentText}.
                </div>
 
                <div class="article">
                    <span class="article-title">Article 2</span> : A l'issue de leur congé, l'intéressé(e) reprendra service à son poste.
                </div>
 
                <div class="article">
                    <span class="article-title">Article 3</span> : La présente décision de congé qui prendra effet pour compter de la date de cessation de service de l'intéressé(e) sera enregistrée, communiquée et publiée partout où besoin sera.
                </div>
 
                <div class="footer-section">
                    <div class="ampliations">
                        <div class="ampliations-title">Ampliations :</div>
                        <div class="ampliation-item"><span>- MTL/CAB</span><span>1</span></div>
                        <div class="ampliation-item"><span>- MFPMA</span><span>1</span></div>
                        <div class="ampliation-item"><span>- DRH</span><span>1</span></div>
                        <div class="ampliation-item"><span>- Contrôle Financier</span><span>1</span></div>
                        <div class="ampliation-item"><span>- Intéressé(e)</span><span>1</span></div>
                        <div class="ampliation-item"><span>- Archives</span><span>1</span></div>
                        <div class="ampliation-item"><span>---</span></div>
                        <div class="ampliation-item"><span></span><span>6</span></div>
                    </div>
                    
                    <div class="signature-block">
                        <div class="signature-date">Fait à Abidjan, le</div>
                        <div class="signature-role">P/Le Ministre et P.O.,<br>le Directeur des Ressources Humaines</div>
                        <div class="signature-name">Yawa Florentine ASSARI épse AKPALE</div>
                    </div>
                </div>
            </div>
        </body>
        </html>
        `;
    }
}

module.exports = DecisionIndividuelleTemplate;
