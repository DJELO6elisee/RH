/**
 * Template pour le certificat de reprise de service
 * Format officiel conforme au document de référence
 */

const { HEADER_CSS, buildHeaderHTML, resolveOfficialHeaderContext } = require('./officialHeader');
const { formatDocumentReference, getDocumentReference } = require('./utils/documentReference');
const { getResolvedFunctionLabel, getAgentPosteOuEmploi, normalizeFunctionLabel } = require('./utils/agentFunction');
const { attachActiveSignature } = require('./utils/signatureUtils');
const path = require('path');
const fs = require('fs');

function toTitleCase(value = '') {
    return value
        .split(/[\s-]+/)
        .filter(Boolean)
        .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
        .join(' ');
}

function formatNameParts(agent = {}) {
    const { normalizeCivilite } = require('./utils/agentFunction');
    const civilite = normalizeCivilite(agent.civilite, agent.sexe);
    const prenoms = (agent.prenom || '').toUpperCase().trim();
    const nom = (agent.nom || '').toUpperCase();
    return {
        civilite,
        prenoms,
        nom,
        fullWithCivilite: [civilite, prenoms, nom].filter(Boolean).join(' ').trim()
    };
}

async function resolveSignature(validateur) {
    if (!validateur) {
        return {
            role: 'Le Directeur',
            name: '',
            signatureImage: null
        };
    }

    // Récupérer la signature active depuis la base de données
    if (validateur && validateur.id) {
        await attachActiveSignature(validateur);
    }

    const nameParts = formatNameParts(validateur);
    const role = normalizeFunctionLabel(getResolvedFunctionLabel(validateur), 'Le Directeur');
    let signatureImage = null;

    if (validateur.signature_path) {
        const sanitized = validateur.signature_path
            .replace(/^\/?uploads[\\/]/, '')
            .replace(/\\/g, '/');
        const filePath = path.join(__dirname, '..', 'uploads', sanitized);

        if (fs.existsSync(filePath)) {
            try {
                const buffer = fs.readFileSync(filePath);
                const mimeType = validateur.signature_type || 'image/png';
                signatureImage = `data:${mimeType};base64,${buffer.toString('base64')}`;
            } catch (error) {
                console.error('❌ Erreur lors du chargement de la signature:', error);
            }
        } else {
            console.warn(`⚠️ Fichier de signature introuvable: ${filePath}`);
        }
    }

    return {
        role,
        name: nameParts.fullWithCivilite,
        signatureImage
    };
}

function isAgentWithSpecificPoste(roleNom = '') {
    if (!roleNom || typeof roleNom !== 'string') {
        return false;
    }
    
    const roleLower = roleNom.toLowerCase();
    const rolesSpecifiques = [
        'directeur',
        'drh',
        'sous_directeur',
        'chef_cabinet',
        'dir_cabinet',
        'directeur_general',
        'directeur_central'
    ];
    
    return rolesSpecifiques.includes(roleLower);
}

class CertificatRepriseServiceTemplate {
    static _normalizeMotifKey(value = '') {
        return value
            .toString()
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/_/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    static _toDateOnlyKey(value) {
        if (!value) return null;
        if (typeof value === 'string') {
            const trimmed = value.trim();
            const m = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
            if (m) return `${m[1]}-${m[2]}-${m[3]}`;
        }
        const parsed = new Date(value);
        if (isNaN(parsed.getTime())) return null;
        const y = parsed.getFullYear();
        const m = String(parsed.getMonth() + 1).padStart(2, '0');
        const d = String(parsed.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    static _getCessationEffectiveKey(item = {}) {
        return CertificatRepriseServiceTemplate._toDateOnlyKey(
            item?.effective_date_key || item?.agree_date_cessation || item?.date_cessation || item?.doc_date_generation
        );
    }

    static _toDateTimeKey(value) {
        if (!value) return null;
        if (typeof value === 'string') {
            const trimmed = value.trim();
            const m = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,6}))?)?/);
            if (m) {
                const us = (m[7] || '').padEnd(6, '0');
                return `${m[1]}-${m[2]}-${m[3]} ${m[4] || '00'}:${m[5] || '00'}:${m[6] || '00'}.${us}`;
            }
        }
        const parsed = new Date(value);
        if (isNaN(parsed.getTime())) return null;
        const y = parsed.getFullYear();
        const mo = String(parsed.getMonth() + 1).padStart(2, '0');
        const d = String(parsed.getDate()).padStart(2, '0');
        const h = String(parsed.getHours()).padStart(2, '0');
        const mi = String(parsed.getMinutes()).padStart(2, '0');
        const s = String(parsed.getSeconds()).padStart(2, '0');
        const ms = String(parsed.getMilliseconds()).padStart(3, '0');
        return `${y}-${mo}-${d} ${h}:${mi}:${s}.${ms}000`;
    }

    static _getCessationRecencyKey(item = {}) {
        return CertificatRepriseServiceTemplate._toDateTimeKey(
            item?.recency_key || item?.doc_date_generation || item?.date_validation_drh || item?.date_modification || item?.date_creation || item?.agree_date_cessation
        );
    }

    static _formatFrenchDateFromKey(dateKey) {
        if (!dateKey || !/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return '';
        const [year, month, day] = dateKey.split('-').map((v) => parseInt(v, 10));
        const months = ['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre'];
        const monthLabel = months[(month || 1) - 1] || '';
        return `${day} ${monthLabel} ${year}`;
    }

    /**
     * Calcule le motif de reprise de service à partir de la cessation associée (par rang) ou de la demande courante.
     * Critère d'approbation : statut_drh en priorité, puis status si statut_drh non renseigné.
     * @returns {{ motif: string }}
     */
    static async getMotifReprise(demande, agent, validateur) {
        const defaut = 'Demande de certificat de reprise de service';
        let motif = demande.agree_motif || demande.description || demande.motif_conge || defaut;
        const db = require('../config/database');
        const agentId = agent && (agent.id ?? agent.id_agent);
        if (!agentId) {
            return { motif: motif || defaut };
        }
        const demandeId = demande && (demande.id != null ? demande.id : demande.id_demande);

        try {
            // Cessations disponibles depuis:
            // 1) demandes de type certificat_cessation approuvées
            // 2) documents certificat_cessation générés directement (id_demande NULL)
            const cessationListResult = await db.query(`
                SELECT c.id, c.motif_conge, c.nombre_jours, c.annee_au_titre_conge, c.agree_date_cessation,
                       c.doc_id, c.doc_date_generation, c.recency_key
                FROM (
                    SELECT d.id,
                           d.motif_conge,
                           d.nombre_jours,
                           d.annee_au_titre_conge,
                           d.agree_date_cessation,
                           da.id AS doc_id,
                           da.date_generation AS doc_date_generation,
                           to_char(
                               COALESCE(
                                   d.date_validation_drh,
                                   d.date_modification,
                                   d.date_creation,
                                   d.agree_date_cessation::timestamp
                               ),
                               'YYYY-MM-DD HH24:MI:SS.US'
                           ) AS recency_key,
                           to_char(d.agree_date_cessation::date, 'YYYY-MM-DD') AS effective_date_key
                    FROM demandes d
                    LEFT JOIN documents_autorisation da
                        ON da.id_demande = d.id
                       AND da.type_document = 'certificat_cessation'
                    WHERE d.type_demande = 'certificat_cessation'
                      AND d.id_agent = $1
                      AND (d.statut_drh = 'approuve' OR d.status = 'approuve')

                    UNION ALL

                    SELECT NULL::integer AS id,
                           da.motif_cessation AS motif_conge,
                           NULL::integer AS nombre_jours,
                           NULL::integer AS annee_au_titre_conge,
                           da.date_cessation AS agree_date_cessation,
                           da.id AS doc_id,
                           da.date_generation AS doc_date_generation,
                           to_char(
                               COALESCE(
                                   da.date_generation,
                                   da.date_cessation::timestamp
                               ),
                               'YYYY-MM-DD HH24:MI:SS.US'
                           ) AS recency_key,
                           to_char(da.date_cessation::date, 'YYYY-MM-DD') AS effective_date_key
                    FROM documents_autorisation da
                    WHERE da.type_document = 'certificat_cessation'
                      AND da.id_agent_destinataire = $1
                      AND da.id_demande IS NULL
                ) c
                ORDER BY c.effective_date_key ASC NULLS LAST,
                         COALESCE(c.id, c.doc_id) ASC
            `, [agentId]);
            const cessationList = cessationListResult.rows || [];

            const dateRepriseKey = CertificatRepriseServiceTemplate._toDateOnlyKey(
                demande?.date_reprise_service || demande?.date_fin_conges || demande?.date_fin || demande?.date_debut
            );
            const repriseSnapshotKey = CertificatRepriseServiceTemplate._toDateTimeKey(
                demande?.date_validation_drh || demande?.date_modification || demande?.date_creation
            );
            const cessation = (() => {
                if (!cessationList.length) return null;
                const filteredBySnapshot = repriseSnapshotKey
                    ? cessationList.filter((item) => {
                        const recency = CertificatRepriseServiceTemplate._getCessationRecencyKey(item);
                        return !recency || recency <= repriseSnapshotKey;
                    })
                    : cessationList;
                const baseList = filteredBySnapshot.length ? filteredBySnapshot : cessationList;
                const eligible = dateRepriseKey
                    ? baseList.filter((item) => {
                        const cessationDateKey = CertificatRepriseServiceTemplate._getCessationEffectiveKey(item);
                        return cessationDateKey && cessationDateKey <= dateRepriseKey;
                    })
                    : baseList;
                const sorted = (eligible.length ? eligible : baseList).sort((a, b) => {
                    const aRecency = CertificatRepriseServiceTemplate._getCessationRecencyKey(a) || '0000-00-00 00:00:00.000000';
                    const bRecency = CertificatRepriseServiceTemplate._getCessationRecencyKey(b) || '0000-00-00 00:00:00.000000';
                    if (aRecency !== bRecency) return bRecency.localeCompare(aRecency); // la plus récente d'abord
                    const aKey = CertificatRepriseServiceTemplate._getCessationEffectiveKey(a) || '0000-00-00';
                    const bKey = CertificatRepriseServiceTemplate._getCessationEffectiveKey(b) || '0000-00-00';
                    if (aKey !== bKey) return bKey.localeCompare(aKey); // plus récent en premier
                    const aDocDate = CertificatRepriseServiceTemplate._toDateOnlyKey(a?.doc_date_generation) || '0000-00-00';
                    const bDocDate = CertificatRepriseServiceTemplate._toDateOnlyKey(b?.doc_date_generation) || '0000-00-00';
                    if (aDocDate !== bDocDate) return bDocDate.localeCompare(aDocDate);
                    const aId = Number(a?.id || a?.doc_id || 0);
                    const bId = Number(b?.id || b?.doc_id || 0);
                    return bId - aId;
                });
                return sorted[0];
            })();

            if (cessation) {
                motif = await CertificatRepriseServiceTemplate._buildMotifFromCessation(cessation, agent, validateur);
            } else if (demande.motif_conge || demande.agree_motif || (demande.description && demande.description !== defaut)) {
                // Fallback : construire un motif à partir de la demande courante (motif_conge / description)
                const motifFallback = CertificatRepriseServiceTemplate._buildMotifFromMotifConge(
                    demande.motif_conge || demande.agree_motif || demande.motif || demande.description,
                    demande.nombre_jours,
                    demande.annee_au_titre_conge
                );
                if (motifFallback) motif = motifFallback;
            }
        } catch (err) {
            console.error('⚠️ getMotifReprise:', err.message);
        }
        return { motif: motif || defaut };
    }

    /** Construit la phrase de motif à partir d'une ligne cessation (BDD). */
    static async _buildMotifFromCessation(cessation, agent, validateur) {
        const motifConge = CertificatRepriseServiceTemplate._normalizeMotifKey(cessation.motif_conge || '');
        const nombreJours = cessation.nombre_jours != null ? parseInt(cessation.nombre_jours, 10) : null;
        const anneeTitre = cessation.annee_au_titre_conge != null ? parseInt(cessation.annee_au_titre_conge, 10)
            : (cessation.agree_date_cessation ? new Date(cessation.agree_date_cessation).getFullYear() : null);
        const dateCessationValue = cessation.doc_date_generation || cessation.agree_date_cessation;
        const effectiveDateKey = CertificatRepriseServiceTemplate._getCessationEffectiveKey(cessation);
        let dateCessationFormatee = '';
        if (effectiveDateKey) {
            dateCessationFormatee = CertificatRepriseServiceTemplate._formatFrenchDateFromKey(effectiveDateKey);
        } else if (dateCessationValue) {
            const d = new Date(dateCessationValue);
            if (!isNaN(d.getTime())) {
                const months = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
                dateCessationFormatee = `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
            }
        }
        let refPart = '';
        if (cessation.doc_id != null) {
            try {
                const { getDocumentReference } = require('./utils/documentReference');
                const ref = await getDocumentReference({
                    document: { id: cessation.doc_id, type_document: 'certificat_cessation' },
                    agent: { id_ministere: agent.id_ministere },
                    validateur,
                    sigle: agent.ministere_sigle || validateur?.ministere_sigle
                });
                if (ref && dateCessationFormatee) refPart = ` conformément à la cessation de service N°${ref} du ${dateCessationFormatee}`;
            } catch (_) { /* ignorer si référence indisponible */ }
        }
        return CertificatRepriseServiceTemplate._motifPhrase(motifConge, nombreJours, anneeTitre, cessation.motif_conge, refPart);
    }

    static _motifPhrase(motifConge, nombreJours, anneeTitre, motifCongeRaw, refPart) {
        const motifKey = CertificatRepriseServiceTemplate._normalizeMotifKey(motifConge);
        const annee = anneeTitre || new Date().getFullYear();
        if (/(^|\s)conge annuel(x)?(s)?(\s|$)/.test(motifKey)) {
            const j = (nombreJours != null && !isNaN(nombreJours)) ? nombreJours : 30;
            return `Bénéficiaire d'un congé annuel de ${j} jour(s) consécutif(s) au titre de l'année ${annee}${refPart}.`;
        }
        if (/(^|\s)conge partiel(s)?(\s|$)/.test(motifKey)) {
            const j = (nombreJours != null && !isNaN(nombreJours)) ? nombreJours : 0;
            return `Bénéficiaire d'un congé partiel de ${j} jour(s) consécutif(s) au titre de l'année ${annee}${refPart}.`;
        }
        if (/(^|\s)conge exceptionnel(s)?(\s|$)/.test(motifKey)) {
            const j = (nombreJours != null && !isNaN(nombreJours)) ? nombreJours : 0;
            return `Bénéficiaire d'un congé exceptionnel de ${j} jour(s) consécutif(s) au titre de l'année ${annee}${refPart}.`;
        }
        if (/(^|\s)maternite(\s|$)/.test(motifKey)) return `Bénéficiaire d'un congé de maternité (14 semaines)${refPart}.`;
        if (/(^|\s)paternite(\s|$)/.test(motifKey)) return `Bénéficiaire d'un congé de paternité${refPart}.`;
        const typeConge = (motifCongeRaw || 'congé').toString();
        const j = (nombreJours != null && !isNaN(nombreJours)) ? nombreJours : null;
        return j != null
            ? `Bénéficiaire d'un ${typeConge} de ${j} jour(s) consécutif(s) au titre de l'année ${annee}${refPart}.`
            : `Bénéficiaire d'un ${typeConge}${refPart}.`;
    }

    /** Construit un motif à partir du libellé motif_conge (demande courante, sans référence document). */
    static _buildMotifFromMotifConge(motifCongeStr, nombreJours, anneeTitre) {
        if (!motifCongeStr || typeof motifCongeStr !== 'string') return null;
        const m = CertificatRepriseServiceTemplate._normalizeMotifKey(motifCongeStr);
        const annee = (anneeTitre != null ? parseInt(anneeTitre, 10) : null) || new Date().getFullYear();
        const j = (nombreJours != null ? parseInt(nombreJours, 10) : null);
        if (/(^|\s)conge annuel(x)?(s)?(\s|$)/.test(m)) return `Bénéficiaire d'un congé annuel de ${(j != null && !isNaN(j)) ? j : 30} jour(s) consécutif(s) au titre de l'année ${annee}.`;
        if (/(^|\s)conge partiel(s)?(\s|$)/.test(m)) return `Bénéficiaire d'un congé partiel de ${(j != null && !isNaN(j)) ? j : 0} jour(s) consécutif(s) au titre de l'année ${annee}.`;
        if (/(^|\s)conge exceptionnel(s)?(\s|$)/.test(m)) return `Bénéficiaire d'un congé exceptionnel de ${(j != null && !isNaN(j)) ? j : 0} jour(s) consécutif(s) au titre de l'année ${annee}.`;
        if (/(^|\s)maternite(\s|$)/.test(m)) return 'Bénéficiaire d\'un congé de maternité (14 semaines).';
        if (/(^|\s)paternite(\s|$)/.test(m)) return 'Bénéficiaire d\'un congé de paternité.';
        if (j != null && !isNaN(j)) return `Bénéficiaire d'un ${motifCongeStr} de ${j} jour(s) au titre de l'année ${annee}.`;
        return `Bénéficiaire d'un ${motifCongeStr}.`;
    }

    static async generateHTML(demande, agent, validateur, document = null) {
        const db = require('../config/database');
        const { pickFirstNonEmptyString } = require('./officialHeader');
        const { formatFullFrenchDate } = require('./officialHeader');
        
        const dateGeneration = new Date().toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const dateRepriseValue = demande.date_reprise_service || demande.date_fin_conges || demande.date_fin || demande.date_debut;
        const dateReprise = dateRepriseValue ? (() => {
            const d = new Date(dateRepriseValue);
            return isNaN(d.getTime()) ? 'Date non spécifiée' : d.toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' });
        })() : 'Date non spécifiée';

        const { motif } = await CertificatRepriseServiceTemplate.getMotifReprise(demande, agent, validateur);

        let numeroActeDecision = null;
        let dateDecision = null;
        const anneeFiltre = demande.annee_au_titre_conge
            ? parseInt(demande.annee_au_titre_conge, 10)
            : (dateRepriseValue ? new Date(dateRepriseValue).getFullYear() : new Date().getFullYear());

        // Récupérer la décision (numero_acte) pour l'en-tête si congé annuel
        try {
            let agentRoleNom = '';
            try {
                const roleResult = await db.query(`
                    SELECT r.nom FROM utilisateurs u
                    JOIN roles r ON u.id_role = r.id WHERE u.id_agent = $1 LIMIT 1
                `, [agent.id]);
                if (roleResult.rows.length > 0 && roleResult.rows[0].nom) agentRoleNom = roleResult.rows[0].nom;
            } catch (e) { /* ignore */ }
            const hasSpecificPoste = isAgentWithSpecificPoste(agentRoleNom);
            let decisionResult;
            if (hasSpecificPoste && agent.id) {
                decisionResult = await db.query(`
                    SELECT numero_acte, date_decision FROM decisions
                    WHERE type = 'individuelle' AND id_agent = $1 AND annee_decision = $2
                    ORDER BY date_decision DESC, created_at DESC LIMIT 1
                `, [agent.id, anneeFiltre]);
                if (decisionResult.rows.length > 0 && decisionResult.rows[0].numero_acte) {
                    numeroActeDecision = decisionResult.rows[0].numero_acte;
                    dateDecision = decisionResult.rows[0].date_decision;
                }
                if (!numeroActeDecision && agent.id_direction) {
                    const idDir = parseInt(agent.id_direction, 10);
                    if (!isNaN(idDir)) {
                        decisionResult = await db.query(`
                            SELECT numero_acte, date_decision FROM decisions
                            WHERE type = 'collective' AND id_direction = $1 AND (id_sous_direction IS NULL) AND annee_decision = $2
                            ORDER BY date_decision DESC, created_at DESC LIMIT 1
                        `, [idDir, anneeFiltre]);
                        if (decisionResult.rows.length > 0 && decisionResult.rows[0].numero_acte) {
                            numeroActeDecision = decisionResult.rows[0].numero_acte;
                            dateDecision = decisionResult.rows[0].date_decision;
                        }
                    }
                }
            } else {
                const idDirection = agent.id_direction != null ? parseInt(agent.id_direction, 10) : null;
                const idSousDirection = agent.id_sous_direction != null ? parseInt(agent.id_sous_direction, 10) : null;
                if (idSousDirection != null && !isNaN(idSousDirection)) {
                    decisionResult = await db.query(`
                        SELECT numero_acte, date_decision FROM decisions
                        WHERE type = 'collective' AND id_sous_direction = $1 AND annee_decision = $2
                        ORDER BY date_decision DESC, created_at DESC LIMIT 1
                    `, [idSousDirection, anneeFiltre]);
                } else if (idDirection != null && !isNaN(idDirection)) {
                    decisionResult = await db.query(`
                        SELECT numero_acte, date_decision FROM decisions
                        WHERE type = 'collective' AND id_direction = $1 AND (id_sous_direction IS NULL) AND annee_decision = $2
                        ORDER BY date_decision DESC, created_at DESC LIMIT 1
                    `, [idDirection, anneeFiltre]);
                } else {
                    decisionResult = await db.query(`
                        SELECT numero_acte, date_decision FROM decisions
                        WHERE type = 'collective' AND (id_direction IS NULL AND id_sous_direction IS NULL) AND annee_decision = $1
                        ORDER BY date_decision DESC, created_at DESC LIMIT 1
                    `, [anneeFiltre]);
                }
                if (decisionResult && decisionResult.rows.length > 0 && decisionResult.rows[0].numero_acte) {
                    numeroActeDecision = decisionResult.rows[0].numero_acte;
                    dateDecision = decisionResult.rows[0].date_decision;
                }
            }
        } catch (decisionError) {
            console.error('⚠️ Erreur lors de la récupération de la décision:', decisionError);
        }

        const resolvedSigle = pickFirstNonEmptyString([
            demande?.ministere_sigle,
            agent?.ministere_sigle,
            validateur?.ministere_sigle
        ]);

        const agentWithSigle = (!agent.ministere_sigle && resolvedSigle)
            ? { ...agent, ministere_sigle: resolvedSigle }
            : agent;
        const validateurWithSigle = (validateur && !validateur.ministere_sigle && resolvedSigle)
            ? { ...validateur, ministere_sigle: resolvedSigle }
            : validateur;

        const documentNumber = document?.id != null && document?.type_document
            ? await getDocumentReference({
                demande,
                document: { id: document.id, type_document: document.type_document },
                agent: { ...agentWithSigle, id_ministere: agent?.id_ministere },
                validateur: validateurWithSigle,
                sigle: resolvedSigle
            })
            : formatDocumentReference({
                demande,
                agent: agentWithSigle,
                validateur: validateurWithSigle,
                sigle: resolvedSigle
            });
        
        const headerContext = resolveOfficialHeaderContext({ agent, validateur });
        const ministryName = (validateurWithSigle && (validateurWithSigle.ministere_nom || validateurWithSigle.ministereNom))
            || agentWithSigle.ministere_nom || '';
        const directionName = (validateurWithSigle && (validateurWithSigle.direction_nom || validateurWithSigle.directionNom || validateurWithSigle.service_nom))
            || agentWithSigle.direction_nom || agentWithSigle.service_nom || '';
        
        // Numéro de décision dans l'en-tête uniquement pour le congé annuel
        const motifLower = (motif || '').toString().toLowerCase();
        const isCongeAnnuel = motifLower.includes('congé annuel') || motifLower.includes('conge annuel') || (motifLower.includes('congé') && motifLower.includes('annuel'));
        const headerHTML = buildHeaderHTML({
            documentNumber,
            dateString: new Date(),
            generatedAt: new Date(),
            city: 'Abidjan',
            ministryName,
            directionName,
            numeroActeDecision: isCongeAnnuel ? numeroActeDecision : null
        });

        const agentNameParts = formatNameParts(agentWithSigle);
        const validateurSignature = await resolveSignature(validateurWithSigle || validateur);
        
        // Récupérer les informations de classe et échelon de l'agent
        let classeInfo = '';
        let echelonInfo = '';
        try {
            const gradeQuery = `
                SELECT g.libelle as grade_libelle, e.libelle as echelon_libelle, ga.date_entree
                FROM grades_agents ga
                LEFT JOIN grades g ON ga.id_grade = g.id
                LEFT JOIN echelons e ON ga.id_echelon = e.id
                WHERE ga.id_agent = $1
                ORDER BY COALESCE(ga.date_entree, ga.created_at) DESC, ga.id DESC
                LIMIT 1
            `;
            const gradeResult = await db.query(gradeQuery, [agent.id]);
            if (gradeResult.rows.length > 0) {
                const gradeData = gradeResult.rows[0];
                if (gradeData.grade_libelle) {
                    classeInfo = gradeData.grade_libelle;
                }
                if (gradeData.echelon_libelle) {
                    echelonInfo = gradeData.echelon_libelle;
                }
                if (gradeData.date_entree) {
                    const dateEntree = new Date(gradeData.date_entree);
                    const dateEntreeStr = dateEntree.toLocaleDateString('fr-FR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    });
                    if (classeInfo && echelonInfo) {
                        classeInfo = `${classeInfo} ${echelonInfo} au ${dateEntreeStr}`;
                    }
                }
            }
        } catch (error) {
            console.error('⚠️ Erreur lors de la récupération du grade:', error);
        }

        const fonctionActuelle = getAgentPosteOuEmploi(agent);
        const serviceNom = agent.service_nom || agent.direction_nom || directionName || 'Service non renseigné';

        return `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Certificat de Reprise de Service</title>
            <style>
                ${HEADER_CSS}
                body {
                    font-family: 'Times New Roman', Georgia, serif;
                    margin: 40px;
                    line-height: 1.6;
                    color: #333;
                }
                .document-title {
                    text-align: center;
                    font-size: 24px;
                    font-weight: bold;
                    text-transform: uppercase;
                    border: 2px solid #000;
                    padding: 12px;
                    margin: 20px auto 30px auto;
                    width: 82%;
                    letter-spacing: 1px;
                }
                .content {
                    margin: 30px 0;
                }
                .agent-info {
                    margin: 25px 0;
                    padding: 20px;
                    background-color: #ffffff;
                    border: 1px solid #ddd;
                    border-radius: 5px;
                }
                .agent-info p {
                    margin: 10px 0;
                    font-size: 16px;
                    line-height: 1.8;
                }
                .agent-info strong {
                    color: #000;
                }
                .motif-section {
                    margin: 30px 0;
                    padding: 20px;
                    background-color: #f8f9fa;
                    border-left: 4px solid #3498db;
                }
                .motif-title {
                    font-size: 18px;
                    font-weight: bold;
                    text-align: center;
                    text-decoration: underline;
                    margin-bottom: 15px;
                    color: #2c3e50;
                }
                .motif-section p {
                    font-size: 16px;
                    line-height: 1.8;
                    text-align: justify;
                }
                .signature-section {
                    margin-top: 50px;
                    text-align: center;
                }
                .signature-box {
                    display: inline-block;
                    margin: 20px;
                    padding: 20px;
                    border: 2px dashed #bdc3c7;
                    border-radius: 5px;
                    min-width: 320px;
                    max-width: 90%;
                    text-align: center;
                }
                .signature-line {
                    font-weight: bold;
                    margin: 6px 0;
                    white-space: nowrap;
                }
                .footer {
                    margin-top: 35px;
                    text-align: center;
                    font-size: 12px;
                    color: #7f8c8d;
                    border-top: 1px solid #ecf0f1;
                    padding-top: 20px;
                }
            </style>
        </head>
        <body>
            ${headerHTML}

            <div class="document-title">CERTIFICAT DE REPRISE DE SERVICE</div>

            <div class="content">
                <div class="agent-info">
                    <p><strong>${agentNameParts.fullWithCivilite}</strong></p>
                    <p>Matricule: <strong>${agent.matricule}</strong></p>
                    <p><strong>${fonctionActuelle.toUpperCase()}</strong></p>
                    ${classeInfo ? `<p>${classeInfo}</p>` : ''}
                    <p>a repris le service à la <strong>${serviceNom.toUpperCase()}</strong> le <strong>${dateReprise}</strong>.</p>
                </div>

                <div class="motif-section">
                    <div class="motif-title">MOTIF DE LA REPRISE DE SERVICE</div>
                    <p>${motif}</p>
                </div>
            </div>

            <div class="signature-section">
                <div class="signature-box">
                    ${validateurSignature.role ? `<div class="signature-line">${validateurSignature.role}</div>` : ''}
                    ${validateurSignature.signatureImage ? `<div style="margin: 10px 0;"><img src="${validateurSignature.signatureImage}" alt="Signature" style="max-height: 80px; width: auto; object-fit: contain;" /></div>` : ''}
                    ${validateurSignature.name ? `<div class="signature-line">${validateurSignature.name}</div>` : ''}
                </div>
            </div>

            <div class="footer">
                <p>Ce document est généré automatiquement par le système de gestion des ressources humaines.</p>
                <p>Document généré le ${formatFullFrenchDate(new Date())}</p>
            </div>
        </body>
        </html>
        `;
    }
}

module.exports = CertificatRepriseServiceTemplate;

