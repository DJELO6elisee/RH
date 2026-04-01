/**
 * Export Excel hiérarchique partagé (État des agents / Rapport retraites).
 * Structure identique à ReportsPage handleExportExcelHierarchical.
 */
import * as XLSX from 'xlsx';

/** Résout une fiche agent dans une Map ou un objet quel que soit le typage de l'id (nombre, string, bigint sérialisé). */
export function resolveAgentFromMap(agentMap, id) {
    if (id == null || agentMap == null) return null;
    if (typeof agentMap.get === 'function') {
        return (
            agentMap.get(id) ??
            agentMap.get(String(id)) ??
            (typeof id === 'string' && /^\d+$/.test(id) ? agentMap.get(Number(id)) : null) ??
            (typeof id === 'number' ? agentMap.get(String(id)) : null)
        );
    }
    return (
        agentMap[id] ??
        agentMap[String(id)] ??
        (typeof id === 'string' && /^\d+$/.test(id) ? agentMap[Number(id)] : null) ??
        (typeof id === 'number' ? agentMap[String(id)] : null)
    );
}

export const ORDRE_STRUCTURES_MTL = [
    'CABINET',
    'INSPECTION GENERALE DU TOURISME ET DES LOISIRS',
    'DIRECTION DE LA COMMUNICATION ET DE LA DOCUMENTATION',
    'DIRECTION DU GUICHET UNIQUE',
    'DIRECTION DES AFFAIRES JURIDIQUES ET DU CONTENTIEUX',
    'DIRECTION DES AFFAIRES FINANCIERES',
    'DIRECTION DES RESSOURCES HUMAINES',
    'DIRECTION DE LA PLANIFICATION, DES STATISTIQUES ET DES PROJETS',
    'DIRECTION DE LA SECURITE TOURISTIQUE ET DES LOISIRS',
    'DIRECTION DE L\' INFORMATIQUE, DE LA DIGITALISATION ET DU DEVELOPPEMENT DES STARTUPS',
    'CELLULE DE PASSATION DES MARCHES PUBLICSS',
    'GESTIONNAIRE DU PATRIMOINEE',
    'DIRECTION GENERALE DE L\'INDUSTRIE TOURISTIQUE ET HOTELIERE',
    'DIRECTION DES ACTIVITES TOURISTIQUES',
    'DIRECTION DE LA COOPERATION ET DE LA PROFESSIONNALISATION',
    'DIRECTION DES SERVICES EXTERIEURS',
    'DIRECTION GENERALE DES LOISIRS',
    'DIRECTION DES PARCS DE LOISIRS, D\'ATTRACTION ET DES JEUX NUMERIQUES',
    'DIRECTION DE LA  VALORISATION, DE LA FORMATION ET DE LA PROMOTION DES JEUX TRADITIONNELS',
    'DIRECTION REGIONALE D\'ABIDJAN NORD',
    'DIRECTION DEPARTEMENTALE D\'ABIDJAN NORD 1',
    'DIRECTION DEPARTEMENTALE  DE DABOU',
    'DIRECTION REGIONALE D\'ABIDJAN SUD',
    'DIRECTION DEPARTEMENTALE D\'ABIDJAN SUD 1',
    'DIRECTION REGIONALE DE GRAND-BASSAM',
    'DIRECTION DEPARTEMENTALE D\'ADZOPE',
    'DIRECTION DEPARTEMENTALE D\'AGBOVILLE',
    'DIRECTION REGIONALE D\'ABENGOUROU',
    'DIRECTION DEPARTEMENTALE DE DAOUKRO',
    'DIRECTION REGIONALE DE BOUAKE',
    'DIRECTION DEPARTEMENTALE DE KATIOLA',
    'DIRECTION REGIONALE DE BONDOUKOU',
    'DIRECTION DEPARTEMENTALE DE BOUNA',
    'DIRECTION REGIONALE DE DALOA',
    'DIRECTION DEPARTEMENTALE DE GAGNOA',
    'DIRECTION DEPARTEMENTALE DE DIVO',
    'DIRECTION REGIONALE DE MAN',
    'DIRECTION DEPARTEMENTALE DE GUIGLO',
    'DIRECTION DEPARTEMENTALE DE DANANE',
    'DIRECTION REGIONALE DE SAN-PEDRO',
    'DIRECTION DEPARTEMENTALE DE SOUBRE',
    'DIRECTION DEPARTEMENTALE DE SASSANDRA',
    'DIRECTION REGIONALE DE KORHOGO',
    'DIRECTION DEPARTEMENTALE DE BOUNDIALI',
    'DIRECTION DEPARTEMENTALE DE FERKESSEDOUGOU',
    'DIRECTION REGIONALE D\'ODIENNE',
    'DIRECTION DEPARTEMENTALE DE TOUBA',
    'DIRECTION REGIONALE DE YAMOUSSOUKRO',
    'DIRECTION DEPARTEMENTALE DE DIMBOKRO',
    'DIRECTION DEPARTEMENTALE DE BOUAFLE',
    'DIRECTION REGIONALE DE SEGUELA',
    'DIRECTION DEPARTEMENTALE DE MANKONO',
    'BUREAU DE PARIS (FRANCE)',
    'BUREAU DE MILAN (ITALIE)',
    'BUREAU DE LONDRES (ROYAUME-UNI)',
    'BUREAU DE BERLIN (ALLEMAGNE)',
    'BUREAU DE GENEVE (SUISSE)',
    'BUREAU DE MADRID (ESPAGNE)',
    'BUREAU DE WASHINGTON (ETATS-UNIS)',
    'BUREAU DE LAGOS (NIGERIA)',
    'BUREAU DE BEIJING (CHINE)',
    'BUREAU DE PRETORIA (AFRIQUE DU SUD)',
    'BUREAU DE RIO DE JANEIRO (BRESIL)',
    'BUREAU DE RABAT (MAROC)',
    'BUREAU DE OTTAWA (CANADA)',
    'BUREAU DE DOHA (QATAR)',
    'CONSEIL NATIONAL DU TOURISME',
    'FONDS DE DEVELOPPEMENT TOURISTIQUE',
    'DIRECTION GENERALE DE COTE D\'IVOIRE TOURISME',
    'DIRECTION DES RELATIONS EXTERIEURES',
    'DIRECTION DU BUDGET, DES FINANCES ET DES MOYENS GENERAUX',
    'DIRECTION DU MARKETING, DE LA COMMUNICATION ET DES TIC',
    'DIRECTION DES RESSOURCES HUMAINES, DE LA FORMATION ET DU PERFECTIONNEMENT',
    'INSTANCE D\'AFFECTATION'
];

const DG_LOISIRS_NORMALIZED = (() => {
    const n = (str) => {
        if (!str) return '';
        return String(str).toUpperCase().trim().replace(/\s+/g, ' ').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    };
    return n('DIRECTION GENERALE DES LOISIRS');
})();

const DIRECTIONS_EXCLUDED_FROM_CABINET_TOTAL = [
    'INSPECTION GENERALE DU TOURISME ET DES LOISIRS',
    'CELLULE DE PASSATION DES MARCHES PUBLICS',
    'CELLULE DE PASSATION DES MARCHES PUBLICSS'
];

export function normalizeStructureName(name) {
    if (!name) return '';
    return String(name).toUpperCase().trim().replace(/\s+/g, ' ').replace(/\s*'\s*/g, "'");
}

export function normalizeForOrder(str) {
    if (!str) return '';
    return normalizeStructureName(str).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function getOrderIndex(name, ordreStructures = ORDRE_STRUCTURES_MTL) {
    const normalized = normalizeForOrder(name);
    if (!normalized) return 9999;
    const idx = ordreStructures.findIndex((item) => normalizeForOrder(item) === normalized);
    if (idx >= 0) return idx;
    if (normalized.includes('INSPECTION') && normalized.includes('GENERALE')) return 1;
    return 9999;
}

export function isOrdreMTLApplicable(currentMinistereNom) {
    if (!currentMinistereNom) return false;
    const nom = normalizeStructureName(currentMinistereNom);
    return nom.includes('TOURISME') && nom.includes('LOISIRS');
}

export function isNoDgSection(dgId, dgName) {
    if (dgId === 'no_dg') return true;
    const n = normalizeStructureName(dgName || '');
    return n.includes('SANS') && n.includes('DIRECTION');
}

export function shouldExcludeDirectionFromCabinetTotal(dgName, directionName) {
    const dgNorm = normalizeForOrder(dgName || '');
    if (dgNorm !== normalizeForOrder('CABINET')) return false;
    const dirNorm = normalizeForOrder(directionName || '');
    return DIRECTIONS_EXCLUDED_FROM_CABINET_TOTAL.some((ref) => normalizeForOrder(ref) === dirNorm);
}

export function shouldHideTotalDirectionRow(dgName, direction) {
    const dgNorm = normalizeForOrder(dgName || '');
    if (dgNorm !== normalizeForOrder('CABINET')) return false;
    const sousDirs = direction.sousDirections || {};
    const celluleNorm = normalizeForOrder('CELLULE DE PASSATION DES MARCHES PUBLICS');
    return Object.values(sousDirs).some(
        (sd) =>
            normalizeForOrder(sd.sousDirectionName || '') === celluleNorm ||
            normalizeForOrder(sd.sousDirectionName || '') === normalizeForOrder('CELLULE DE PASSATION DES MARCHES PUBLICSS')
    );
}

export function formatDateSafe(dateString) {
    if (!dateString) return '-';
    try {
        const datePart = String(dateString).split('T')[0];
        const [year, month, day] = datePart.split('-');
        if (!day || !month || !year) return '-';
        return `${day}/${month}/${year}`;
    } catch {
        return '-';
    }
}

const ORDRE_GRADES_DECROISSANT = [
    'HG', 'GI', 'GII', 'GIII',
    'A7', 'A6', 'A5', 'A4', 'A3',
    'B3', 'B2', 'B1',
    'C2', 'C1',
    'D1', 'D2'
];

function getGradeOrderIndex(gradeLabel) {
    if (!gradeLabel) return 9999;
    const normalized = String(gradeLabel).toUpperCase().trim().replace(/\s+/g, '');
    const exact = ORDRE_GRADES_DECROISSANT.findIndex((g) => normalized === g || normalized === g.replace(/\s/g, ''));
    if (exact >= 0) return exact;
    const matchA = normalized.match(/^A(\d+)$/);
    if (matchA) {
        const num = parseInt(matchA[1], 10);
        const idxA = ORDRE_GRADES_DECROISSANT.indexOf(`A${num}`);
        if (idxA >= 0) return idxA;
        return num <= 7 ? 4 + (7 - num) : 9999;
    }
    const matchB = normalized.match(/^B(\d+)$/);
    if (matchB) {
        const num = parseInt(matchB[1], 10);
        const idxB = ORDRE_GRADES_DECROISSANT.indexOf(`B${num}`);
        if (idxB >= 0) return idxB;
        return num <= 3 ? 9 + (3 - num) : 9999;
    }
    const matchC = normalized.match(/^C(\d+)$/);
    if (matchC) {
        const num = parseInt(matchC[1], 10);
        return num <= 2 ? 12 + (2 - num) : 9999;
    }
    const matchD = normalized.match(/^D(\d+)$/);
    if (matchD) return 14;
    if (/^[HG]|GII?I?$/i.test(normalized)) {
        if (normalized === 'HG') return 0;
        if (normalized === 'GI') return 1;
        if (normalized === 'GII') return 2;
        if (normalized === 'GIII') return 3;
    }
    return 9999;
}

export function sortAgentsByGrade(agents) {
    if (!agents || !Array.isArray(agents) || agents.length === 0) return agents;
    const list = agents.filter((a) => a != null);
    if (list.length === 0) return [];
    return [...list].sort((a, b) => {
        const gradeA = a.grade_libele || a.grade_libelle || '';
        const gradeB = b.grade_libele || b.grade_libelle || '';
        const orderA = getGradeOrderIndex(gradeA);
        const orderB = getGradeOrderIndex(gradeB);
        if (orderA !== orderB) return orderA - orderB;
        const matA = a.matricule != null ? String(a.matricule).trim() : '';
        const matB = b.matricule != null ? String(b.matricule).trim() : '';
        const numA = /^\d+$/.test(matA) ? parseInt(matA, 10) : NaN;
        const numB = /^\d+$/.test(matB) ? parseInt(matB, 10) : NaN;
        if (!Number.isNaN(numA) && !Number.isNaN(numB)) return numA - numB;
        if (!Number.isNaN(numA)) return -1;
        if (!Number.isNaN(numB)) return 1;
        return (matA || '').localeCompare(matB || '', 'fr');
    });
}

/**
 * Construit la structure groupée (même forme que groupAgentsHierarchically) à partir de hierarchyTree.
 * Les fiches complètes viennent d'agentMap quand l'id existe ; sinon on garde le résumé renvoyé par l'API.
 */
export function buildGroupedDataFromHierarchyTree(hierarchyTree, agentMap) {
    if (!hierarchyTree || !Array.isArray(hierarchyTree) || hierarchyTree.length === 0) {
        return {};
    }
    const mapToFullAgents = (summaries = []) => {
        return summaries
            .map((summary) => {
                if (!summary) return null;
                const id = summary.id != null ? summary.id : summary.id_agent;
                const full = id != null ? resolveAgentFromMap(agentMap, id) : null;
                return full || summary;
            })
            .filter((a) => a);
    };

    const hierarchicalStructure = {};

    hierarchyTree.forEach((dgNode) => {
        const dgIdValue = dgNode.id_direction_generale;
        const dgKey = dgIdValue != null ? `dg_${dgIdValue}` : 'no_dg';

        if (!hierarchicalStructure[dgKey]) {
            hierarchicalStructure[dgKey] = {
                directionGeneraleName: dgNode.direction_generale_libelle || (dgIdValue ? 'Direction Générale' : 'Directions sans Direction Générale'),
                directionGeneraleId: dgIdValue != null ? dgIdValue : 'no_dg',
                directions: {}
            };
        }

        const dgStruct = hierarchicalStructure[dgKey];

        (dgNode.directions || []).forEach((dirNode, indexDir) => {
            const dirIdValue = dirNode.id_direction;
            const dirKey = dirIdValue != null ? dirIdValue.toString() : `dir_sans_${dgKey}_${indexDir}`;
            const isDGDirect = dirIdValue == null;
            const explicitLabel = dirNode.direction_libelle && String(dirNode.direction_libelle).trim() !== '';
            const directionName = explicitLabel
                ? (dirNode.direction_libelle || 'Direction')
                : (isDGDirect ? (dgNode.direction_generale_libelle || 'Agents rattachés à la DG') : (dirNode.direction_libelle || 'Direction'));

            if (!dgStruct.directions[dirKey]) {
                dgStruct.directions[dirKey] = {
                    directionName,
                    directionId: dirIdValue != null ? dirIdValue : dirKey,
                    directionCode: '',
                    sousDirections: {},
                    directServices: {},
                    directAgents: [],
                    totalAgents: 0,
                    isDGDirect
                };
            }

            const dirStruct = dgStruct.directions[dirKey];

            const directAgents = sortAgentsByGrade(mapToFullAgents(dirNode.agents_sans_sous_ni_service || []));
            if (directAgents.length > 0) {
                dirStruct.directAgents = directAgents;
                dirStruct.totalAgents += directAgents.length;
            }

            (dirNode.services_sans_sous_direction || []).forEach((svc, svcIndex) => {
                const svcIdValue = svc.id_service != null ? svc.id_service : (svc.id != null ? svc.id : `svc_dir_${dirKey}_${svcIndex}`);
                const serviceAgents = sortAgentsByGrade(mapToFullAgents(svc.agents || []));
                if (serviceAgents.length === 0) return;

                if (!dirStruct.directServices[svcIdValue]) {
                    dirStruct.directServices[svcIdValue] = {
                        serviceName: svc.service_libelle || svc.libelle || 'Service',
                        serviceId: svcIdValue,
                        agents: serviceAgents,
                        agentCount: serviceAgents.length
                    };
                    dirStruct.totalAgents += serviceAgents.length;
                }
            });

            (dirNode.sous_directions || []).forEach((sdNode, sdIndex) => {
                const sdIdValue = sdNode.id_sous_direction != null ? sdNode.id_sous_direction : (sdNode.id != null ? sdNode.id : `sd_${dirKey}_${sdIndex}`);
                const directSdAgents = sortAgentsByGrade(mapToFullAgents(sdNode.agents_sans_service || []));

                const servicesWithAgents = {};
                (sdNode.services || []).forEach((svc, svcIndex) => {
                    const svcIdVal = svc.id_service != null ? svc.id_service : (svc.id != null ? svc.id : `svc_sd_${sdIdValue}_${svcIndex}`);
                    const serviceAgents = sortAgentsByGrade(mapToFullAgents(svc.agents || []));
                    if (serviceAgents.length === 0) return;

                    servicesWithAgents[svcIdVal] = {
                        serviceName: svc.service_libelle || svc.libelle || 'Service',
                        serviceId: svcIdVal,
                        agents: serviceAgents,
                        agentCount: serviceAgents.length
                    };
                });

                const totalSdAgents = directSdAgents.length + Object.values(servicesWithAgents).reduce((sum, s) => sum + s.agentCount, 0);
                if (totalSdAgents === 0) return;

                dirStruct.sousDirections[sdIdValue] = {
                    sousDirectionName: sdNode.sous_direction_libelle || sdNode.libelle || 'Sous-direction',
                    sousDirectionId: sdIdValue,
                    directAgents: directSdAgents,
                    services: servicesWithAgents,
                    totalAgents: totalSdAgents
                };

                dirStruct.totalAgents += totalSdAgents;
            });
        });
    });

    return hierarchicalStructure;
}

function sumAgentsUnderDirectionGenerale(dg) {
    return Object.values(dg.directions || {}).reduce((s, d) => s + (d.totalAgents || 0), 0);
}

function pickDirectionGeneraleMatch(dgByNameLists, normalizedName) {
    const entries = dgByNameLists[normalizedName];
    if (!entries || entries.length === 0) return null;
    if (entries.length === 1) return entries[0];
    return entries.reduce((best, cur) =>
        sumAgentsUnderDirectionGenerale(cur.directionGenerale) > sumAgentsUnderDirectionGenerale(best.directionGenerale)
            ? cur
            : best
    );
}

function getOrderedSectionsForExport(hierarchicalData, currentMinistereNom) {
    if (!isOrdreMTLApplicable(currentMinistereNom)) return null;
    const sections = [];
    const dgByNameLists = {};
    const directionByName = [];

    Object.keys(hierarchicalData).forEach((dgId) => {
        const dg = hierarchicalData[dgId];
        const dgNameNorm = normalizeForOrder(dg.directionGeneraleName || '');
        if (!dgByNameLists[dgNameNorm]) dgByNameLists[dgNameNorm] = [];
        dgByNameLists[dgNameNorm].push({ dgId, directionGenerale: dg });
        Object.keys(dg.directions || {}).forEach((dirId) => {
            const dir = dg.directions[dirId];
            const dirNameNorm = normalizeForOrder(dir.directionName || (dir.isDGDirect ? dg.directionGeneraleName : '') || '');
            directionByName.push({ dgId, directionGenerale: dg, direction: dir, dirNameNorm });
        });
    });

    const dgBlocksSet = new Set();
    ORDRE_STRUCTURES_MTL.forEach((name) => {
        const n = normalizeForOrder(name);
        if (n === DG_LOISIRS_NORMALIZED) return;
        const entries = dgByNameLists[n];
        if (!entries) return;
        entries.forEach((m) => dgBlocksSet.add(m.dgId));
    });

    ORDRE_STRUCTURES_MTL.forEach((name, orderIndex) => {
        const n = normalizeForOrder(name);
        const dgMatch = pickDirectionGeneraleMatch(dgByNameLists, n);
        const dirMatch = directionByName.find((d) => d.dirNameNorm === n);
        if (dgMatch && dgMatch.dgId && dgBlocksSet.has(dgMatch.dgId)) {
            sections.push({ type: 'dg_block', orderIndex, dgId: dgMatch.dgId, directionGenerale: dgMatch.directionGenerale });
        } else if (dirMatch && !dgBlocksSet.has(dirMatch.dgId)) {
            sections.push({ type: 'direction', orderIndex, dgId: dirMatch.dgId, directionGenerale: dirMatch.directionGenerale, direction: dirMatch.direction });
        }
    });

    sections.sort((a, b) => a.orderIndex - b.orderIndex);
    return sections;
}

/**
 * L'export ordonné MTL ne parcourt que les entrées listées dans ORDRE_STRUCTURES_MTL.
 * Les directions dont le libellé ne matche aucune entrée (ou variantes) n'apparaissaient ni dans le fichier ni dans le total ministère.
 */
export function appendDirectionsMissingFromOrderedExport(orderedContexts, groupedData) {
    if (!groupedData) return orderedContexts || [];
    const ordered = Array.isArray(orderedContexts) ? orderedContexts : [];
    const seen = new WeakSet();
    ordered.forEach((e) => {
        if (e && e.direction) seen.add(e.direction);
    });
    const extra = [];
    Object.keys(groupedData).forEach((dgId) => {
        const directionGenerale = groupedData[dgId];
        Object.keys(directionGenerale.directions || {}).forEach((dirKey) => {
            const direction = directionGenerale.directions[dirKey];
            if (!direction || seen.has(direction)) return;
            seen.add(direction);
            extra.push({ direction, directionGenerale, dgId });
        });
    });
    if (extra.length === 0) return ordered;
    extra.sort((a, b) => {
        const dgCmp = (a.directionGenerale.directionGeneraleName || '').localeCompare(
            b.directionGenerale.directionGeneraleName || '',
            'fr'
        );
        if (dgCmp !== 0) return dgCmp;
        const nameA = a.direction.directionName || (a.direction.isDGDirect ? a.directionGenerale.directionGeneraleName : '') || '';
        const nameB = b.direction.directionName || (b.direction.isDGDirect ? b.directionGenerale.directionGeneraleName : '') || '';
        return nameA.localeCompare(nameB, 'fr');
    });
    return [...ordered, ...extra];
}

function sumTotalAgentsInGroupedData(groupedData) {
    let sum = 0;
    Object.values(groupedData || {}).forEach((dg) => {
        Object.values(dg.directions || {}).forEach((dir) => {
            sum += dir.totalAgents || 0;
        });
    });
    return sum;
}

function getSortedHierarchyForExport(hierarchicalData, currentMinistereNom) {
    const useOrdreMTL = isOrdreMTLApplicable(currentMinistereNom);
    const dgEntries = Object.keys(hierarchicalData).map((dgId) => ({
        dgId,
        directionGenerale: hierarchicalData[dgId]
    }));

    if (useOrdreMTL) {
        dgEntries.sort((a, b) => {
            const orderA = getOrderIndex(a.directionGenerale.directionGeneraleName || '');
            const orderB = getOrderIndex(b.directionGenerale.directionGeneraleName || '');
            return orderA - orderB;
        });
    } else {
        dgEntries.sort((a, b) => (a.directionGenerale.directionGeneraleName || '').localeCompare(b.directionGenerale.directionGeneraleName || '', 'fr'));
    }

    dgEntries.forEach((entry) => {
        const dirEntries = Object.keys(entry.directionGenerale.directions || {}).map((directionId) => ({
            directionId,
            direction: entry.directionGenerale.directions[directionId]
        }));
        if (useOrdreMTL) {
            dirEntries.sort((a, b) => {
                const nameA = a.direction.directionName || (a.direction.isDGDirect ? entry.directionGenerale.directionGeneraleName : '') || '';
                const nameB = b.direction.directionName || (b.direction.isDGDirect ? entry.directionGenerale.directionGeneraleName : '') || '';
                return getOrderIndex(nameA) - getOrderIndex(nameB);
            });
        } else {
            dirEntries.sort((a, b) => (a.direction.directionName || '').localeCompare(b.direction.directionName || '', 'fr'));
        }
        entry.sortedDirections = dirEntries;
    });

    return dgEntries;
}

/**
 * Génère et télécharge le fichier Excel du rapport hiérarchique (structure identique à ReportsPage).
 * @param {Object} opts
 * @param {Object} opts.groupedData - Structure retournée par buildGroupedDataFromHierarchyTree ou groupAgentsHierarchically
 * @param {string} [opts.currentMinistereNom] - Nom du ministère (pour ordre MTL)
 * @param {string} [opts.title='ÉTAT DES AGENTS - RAPPORT HIÉRARCHIQUE'] - Titre principal
 * @param {string} [opts.periodLabel] - Ligne optionnelle (ex: "Période d'analyse : 5 ans à venir")
 * @param {string|number} [opts.periodYears] - Nombre d'années pour les totaux (ex: 10 → "Total direction dans 10 ans : X agents")
 * @param {Object} [opts.effectifActuelParDirection] - { [directionName]: number } effectif actuel par direction (hors retraités) pour afficher "Effectif de la direction dans X ans"
 * @param {Object} [opts.effectifActuelParDG] - { [dgName]: number } effectif actuel par direction générale (hors retraités) pour afficher "Effectif de la DG dans X ans"
 * @param {string} [opts.fileName] - Nom du fichier (sans .xlsx)
 */
export function exportHierarchicalReportExcel(opts) {
    const {
        groupedData,
        currentMinistereNom = '',
        title = 'ÉTAT DES AGENTS - RAPPORT HIÉRARCHIQUE',
        periodLabel = '',
        periodYears = '',
        effectifActuelParDirection = {},
        effectifActuelParDG = {},
        fileName = `Rapport_Hierarchique_Agents_${new Date().toISOString().split('T')[0]}.xlsx`
    } = opts;

    const numYears = periodYears ? Number(periodYears) : 0;
    const totalPeriodSuffix = numYears > 0 ? ` dans ${numYears} an${numYears > 1 ? 's' : ''}` : '';
    const isRetirementReport = numYears > 0;
    const labelPartant = isRetirementReport ? 'Total agents partant à la retraite' : 'Total';

    const headers = [
        '#', 'Matricule', 'Nom', 'Prénoms', 'Emploi', 'Grade', 'Echelon', 'Fonction',
        'Date de naissance', 'Date de Première prise de service', 'Date prise service Ministère', 'Date entree fonction',
        'Catégorie', 'Position', 'Adresse', 'Lieu de naissance',
        'Téléphone 1', 'Téléphone 2', 'Email', 'Nationalité', 'Statut agent', 'Statut emploi',
        'Situation Matrimoniale', 'Date de Mariage', 'Numéro acte de mariage', 'Nom de la conjointe', 'Nombre d\'enfants',
        'Entité', 'Direction', 'Date entree emploi', 'Date fin contrat', 'Date retraite',
        'Handicap', 'Pathologie'
    ];

    const allData = [];
    const mergeRanges = [];
    const boldRows = [];
    let globalIndex = 1;
    let totalAgentsMinistère = 0;

    allData.push([title]);
    if (periodLabel) allData.push([periodLabel]);
    allData.push([`Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`]);
    allData.push([]);
    allData.push(headers);

    const buildAgentRow = (agent) => {
        const row = [globalIndex++];
        row.push(agent.matricule || '-');
        row.push(agent.nom || '-');
        row.push(agent.prenom || '-');
        row.push(agent.emploi_libele || '-');
        row.push(agent.grade_libele || '-');
        row.push(agent.echelon_libelle || agent.echelon_libele || '-');
        row.push(agent.fonction_actuelle_libele || '-');
        row.push(formatDateSafe(agent.date_de_naissance));
        row.push(formatDateSafe(agent.date_prise_service_dans_la_direction));
        row.push(formatDateSafe(agent.date_prise_service_au_ministere));
        row.push(formatDateSafe(agent.fonction_date_entree));
        row.push(agent.categorie_libele || '-');
        row.push(agent.position_libelle || agent.position_libele || '-');
        row.push(agent.adresse || '-');
        row.push(agent.lieu_de_naissance || '-');
        row.push(agent.telephone1 || '-');
        row.push(agent.telephone2 || '-');
        row.push(agent.email || '-');
        row.push(agent.nationalite_libele || '-');
        row.push(agent.type_agent_libele || '-');
        row.push(agent.statut_emploi_libelle || agent.statut_emploi || '-');
        row.push(agent.situation_matrimoniale_libele || '-');
        row.push(formatDateSafe(agent.date_mariage));
        row.push(agent.numero_acte_mariage || '-');
        row.push(agent.nom_conjointe || '-');
        row.push(agent.nombre_enfants || agent.nombre_enfant || '-');
        row.push(agent.entite_nom || '-');
        row.push(agent.direction_libelle || '-');
        row.push(formatDateSafe(agent.emploi_date_entree));
        row.push(formatDateSafe(agent.date_fin_contrat));
        row.push(formatDateSafe(agent.date_retraite));
        row.push(agent.handicap_nom || agent.handicap || '-');
        row.push(agent.pathologie || '-');
        return row;
    };

    const exportDirection = (direction, indent = '') => {
        let totalAgentsDirection = 0;

        if (direction.directAgents && direction.directAgents.length > 0) {
            direction.directAgents.forEach((agent) => allData.push(buildAgentRow(agent)));
            totalAgentsDirection += direction.directAgents.length;
            const directAgentsTotalRow = [`${indent}${isRetirementReport ? labelPartant + ' (directs direction)' : 'Total agents directs direction'}${totalPeriodSuffix} : ${direction.directAgents.length} agents`];
            for (let i = 1; i < headers.length; i++) directAgentsTotalRow.push('');
            allData.push(directAgentsTotalRow);
            mergeRanges.push({ s: { r: allData.length - 1, c: 0 }, e: { r: allData.length - 1, c: 5 } });
        }

        if (direction.directServices && Object.keys(direction.directServices).length > 0) {
            const realServices = Object.keys(direction.directServices).filter(
                (serviceId) => direction.directServices[serviceId].serviceName !== 'Agents sans service spécifique'
            );
            const sortedServiceIds = realServices.sort((a, b) => {
                const serviceA = direction.directServices[a];
                const serviceB = direction.directServices[b];
                return serviceA.serviceName.localeCompare(serviceB.serviceName);
            });

            sortedServiceIds.forEach((serviceId, serviceIndex) => {
                const service = direction.directServices[serviceId];
                const hadTotalBefore = serviceIndex > 0 || (direction.directAgents && direction.directAgents.length > 0);
                if (hadTotalBefore) allData.push([]);
                allData.push([`${indent}  ${service.serviceName}`]);
                boldRows.push(allData.length - 1);

                service.agents.forEach((agent) => allData.push(buildAgentRow(agent)));
                const serviceTotalRow = [`${indent}  ${isRetirementReport ? labelPartant + ' (Service Direct)' : 'Total Service Direct'}${totalPeriodSuffix} : ${service.agentCount} agents`];
                for (let i = 1; i < headers.length; i++) serviceTotalRow.push(' ');
                allData.push(serviceTotalRow);
                totalAgentsDirection += service.agentCount;
            });
        }

        if (direction.sousDirections && Object.keys(direction.sousDirections).length > 0) {
            Object.keys(direction.sousDirections).forEach((sousDirectionId, sdIndex) => {
                const sousDirection = direction.sousDirections[sousDirectionId];
                const hadTotalBefore =
                    sdIndex > 0 ||
                    (direction.directAgents && direction.directAgents.length > 0) ||
                    (direction.directServices && Object.keys(direction.directServices).length > 0);
                if (hadTotalBefore) allData.push([]);
                allData.push([`${indent}    ${sousDirection.sousDirectionName}`]);
                boldRows.push(allData.length - 1);
                let totalAgentsSousDirection = 0;

                if (sousDirection.directAgents && sousDirection.directAgents.length > 0) {
                    sousDirection.directAgents.forEach((agent) => allData.push(buildAgentRow(agent)));
                    totalAgentsSousDirection += sousDirection.directAgents.length;
                }
                if (sousDirection.services && Object.keys(sousDirection.services).length > 0) {
                    Object.keys(sousDirection.services).forEach((serviceId, svcIndex) => {
                        const service = sousDirection.services[serviceId];
                        const hadTotalBefore = svcIndex > 0 || (sousDirection.directAgents && sousDirection.directAgents.length > 0);
                        if (hadTotalBefore) allData.push([]);
                        allData.push([`${indent}      SERVICE: ${service.serviceName}`]);
                        boldRows.push(allData.length - 1);
                        service.agents.forEach((agent) => allData.push(buildAgentRow(agent)));
                        const serviceTotalRow = [`${indent}      ${isRetirementReport ? labelPartant + ' (Service)' : 'Total Service'}${totalPeriodSuffix} : ${service.agentCount} agents`];
                        for (let i = 1; i < headers.length; i++) serviceTotalRow.push(' ');
                        allData.push(serviceTotalRow);
                        mergeRanges.push({ s: { r: allData.length - 1, c: 0 }, e: { r: allData.length - 1, c: 5 } });
                        totalAgentsSousDirection += service.agentCount;
                    });
                }
                const sousDirectionTotalRow = [`${indent}    ${isRetirementReport ? labelPartant + ' (sous-direction)' : 'Total sous-direction'}${totalPeriodSuffix} : ${totalAgentsSousDirection} agents`];
                for (let i = 1; i < headers.length; i++) sousDirectionTotalRow.push('');
                allData.push(sousDirectionTotalRow);
                mergeRanges.push({ s: { r: allData.length - 1, c: 0 }, e: { r: allData.length - 1, c: 5 } });
                totalAgentsDirection += totalAgentsSousDirection;
            });
        }

        return totalAgentsDirection;
    };

    let allDirectionsWithContext = [];
    const orderedSections = getOrderedSectionsForExport(groupedData, currentMinistereNom);

    if (orderedSections && orderedSections.length > 0) {
        orderedSections.forEach((sec) => {
            if (sec.type === 'dg_block') {
                const dg = sec.directionGenerale;
                const dirEntries = Object.keys(dg.directions || {}).map((directionId) => ({
                    direction: dg.directions[directionId],
                    directionGenerale: dg,
                    dgId: sec.dgId
                }));
                dirEntries.sort((a, b) => {
                    const nameA = a.direction.directionName || (a.direction.isDGDirect ? dg.directionGeneraleName : '') || '';
                    const nameB = b.direction.directionName || (b.direction.isDGDirect ? dg.directionGeneraleName : '') || '';
                    return getOrderIndex(nameA) - getOrderIndex(nameB);
                });
                dirEntries.forEach((e) => allDirectionsWithContext.push(e));
            } else if (sec.type === 'direction') {
                allDirectionsWithContext.push({
                    direction: sec.direction,
                    directionGenerale: sec.directionGenerale,
                    dgId: sec.dgId
                });
            }
        });
    } else {
        Object.keys(groupedData).forEach((dgId) => {
            const directionGenerale = groupedData[dgId];
            Object.keys(directionGenerale.directions || {}).forEach((directionId) => {
                const direction = directionGenerale.directions[directionId];
                allDirectionsWithContext.push({ direction, directionGenerale, dgId });
            });
        });
        const useOrdreMTL = isOrdreMTLApplicable(currentMinistereNom);
        allDirectionsWithContext.sort((a, b) => {
            const dgNameA = a.directionGenerale.directionGeneraleName || '';
            const dgNameB = b.directionGenerale.directionGeneraleName || '';
            if (useOrdreMTL) {
                const orderDgA = getOrderIndex(dgNameA);
                const orderDgB = getOrderIndex(dgNameB);
                if (orderDgA !== orderDgB) return orderDgA - orderDgB;
                const dirNameA = a.direction.directionName || (a.direction.isDGDirect ? dgNameA : '') || '';
                const dirNameB = b.direction.directionName || (b.direction.isDGDirect ? dgNameB : '') || '';
                const orderDirA = getOrderIndex(dirNameA);
                const orderDirB = getOrderIndex(dirNameB);
                if (orderDirA !== orderDirB) return orderDirA - orderDirB;
            } else {
                if (dgNameA !== dgNameB) return dgNameA.localeCompare(dgNameB, 'fr');
            }
            const dirNameA = a.direction.directionName || (a.direction.isDGDirect ? dgNameA : '');
            const dirNameB = b.direction.directionName || (b.direction.isDGDirect ? dgNameB : '');
            const isDGDirectA = a.direction.isDGDirect;
            const isDGDirectB = b.direction.isDGDirect;
            if (isDGDirectA && !isDGDirectB) return -1;
            if (!isDGDirectA && isDGDirectB) return 1;
            return (dirNameA || '').localeCompare(dirNameB || '', 'fr');
        });
    }

    const allDirectionsComplete = appendDirectionsMissingFromOrderedExport(allDirectionsWithContext, groupedData);
    allDirectionsWithContext.length = 0;
    allDirectionsComplete.forEach((item) => allDirectionsWithContext.push(item));

    const sumGrouped = sumTotalAgentsInGroupedData(groupedData);
    if (allDirectionsWithContext.length === 0 && sumGrouped > 0) {
        const sorted = getSortedHierarchyForExport(groupedData, currentMinistereNom);
        sorted.forEach((entry) => {
            (entry.sortedDirections || []).forEach(({ direction }) => {
                allDirectionsWithContext.push({
                    direction,
                    directionGenerale: entry.directionGenerale,
                    dgId: entry.dgId
                });
            });
        });
    }

    // Calculer l'effectif actuel par DG en se basant sur les effectifs par direction
    // afin que "Effectif de la direction générale dans X ans" soit cohérent
    const effectifActuelParDGCalcule = {};
    allDirectionsWithContext.forEach(({ direction, directionGenerale }) => {
        const directionName = (direction.directionName || '').trim();
        const dgName = (directionGenerale.directionGeneraleName || '').trim();
        if (!directionName || !dgName) return;
        const effectifDirection = effectifActuelParDirection[directionName];
        if (typeof effectifDirection === 'number' && effectifDirection >= 0) {
            effectifActuelParDGCalcule[dgName] =
                (effectifActuelParDGCalcule[dgName] || 0) + effectifDirection;
        }
    });

    let currentDgId = null;
    let totalAgentsDG = 0;
    let currentDgName = null;
    let lastLineWasTotal = false;

    allDirectionsWithContext.forEach(({ direction, directionGenerale, dgId }) => {
        if (currentDgId !== dgId) {
            if (currentDgId !== null && !isNoDgSection(currentDgId, currentDgName)) {
                const dgTotalRow = [`${isRetirementReport ? labelPartant + ' (DG ' + currentDgName + ')' : 'Total DG ' + currentDgName}${totalPeriodSuffix} : ${totalAgentsDG} agents`];
                for (let i = 1; i < headers.length; i++) dgTotalRow.push('');
                allData.push(dgTotalRow);
                mergeRanges.push({ s: { r: allData.length - 1, c: 0 }, e: { r: allData.length - 1, c: 5 } });
                if (isRetirementReport) {
                    const dgKey = (currentDgName || '').trim();
                    const effDG =
                        typeof effectifActuelParDGCalcule[dgKey] === 'number'
                            ? effectifActuelParDGCalcule[dgKey]
                            : effectifActuelParDG[dgKey];
                    if (typeof effDG === 'number' && effDG >= 0) {
                        const effDGDansXAns = Math.max(0, effDG - totalAgentsDG);
                        const effDGRow = [`Effectif de la direction générale${totalPeriodSuffix} : ${effDGDansXAns} agents`];
                        for (let i = 1; i < headers.length; i++) effDGRow.push('');
                        allData.push(effDGRow);
                        mergeRanges.push({ s: { r: allData.length - 1, c: 0 }, e: { r: allData.length - 1, c: 5 } });
                    }
                }
                allData.push([]);
            }
            currentDgId = dgId;
            currentDgName = directionGenerale.directionGeneraleName;
            totalAgentsDG = 0;
            lastLineWasTotal = false;
            if (!isNoDgSection(dgId, currentDgName)) {
                allData.push([currentDgName]);
                boldRows.push(allData.length - 1);
            }
        }

        const directionTitle =
            direction.directionCode ? `${direction.directionName} (${direction.directionCode})` : `${direction.directionName}`;
        const sameAsDG =
            normalizeStructureName(direction.directionName || '') === normalizeStructureName(currentDgName || '');
        if (!sameAsDG) {
            if (lastLineWasTotal) {
                allData.push([]);
                lastLineWasTotal = false;
            }
            allData.push([directionTitle]);
            boldRows.push(allData.length - 1);
        }

        const totalAgentsDirection = exportDirection(direction);
        if (!shouldExcludeDirectionFromCabinetTotal(currentDgName, direction.directionName)) {
            totalAgentsDG += totalAgentsDirection;
        }
        if (!shouldHideTotalDirectionRow(currentDgName, direction)) {
            const directionName = (direction.directionName || '').trim();
            const effectifActuel = effectifActuelParDirection[directionName];
            allData.push([`${labelPartant}${totalPeriodSuffix} : ${totalAgentsDirection} agents`]);
            for (let i = 1; i < headers.length; i++) allData[allData.length - 1].push('');
            mergeRanges.push({ s: { r: allData.length - 1, c: 0 }, e: { r: allData.length - 1, c: 5 } });
            if (isRetirementReport && typeof effectifActuel === 'number' && effectifActuel >= 0) {
                const effectifDansXAns = Math.max(0, effectifActuel - totalAgentsDirection);
                const effectifRow = [`Effectif de la direction${totalPeriodSuffix} : ${effectifDansXAns} agents`];
                for (let i = 1; i < headers.length; i++) effectifRow.push('');
                allData.push(effectifRow);
                mergeRanges.push({ s: { r: allData.length - 1, c: 0 }, e: { r: allData.length - 1, c: 5 } });
            }
        }
        lastLineWasTotal = true;
    });

    if (currentDgId !== null && !isNoDgSection(currentDgId, currentDgName)) {
        const dgTotalRow = [`${isRetirementReport ? labelPartant + ' (DG ' + currentDgName + ')' : 'Total DG ' + currentDgName}${totalPeriodSuffix} : ${totalAgentsDG} agents`];
        for (let i = 1; i < headers.length; i++) dgTotalRow.push('');
        allData.push(dgTotalRow);
        mergeRanges.push({ s: { r: allData.length - 1, c: 0 }, e: { r: allData.length - 1, c: 5 } });
        if (isRetirementReport) {
            const dgKey = (currentDgName || '').trim();
            const effDG =
                typeof effectifActuelParDGCalcule[dgKey] === 'number'
                    ? effectifActuelParDGCalcule[dgKey]
                    : effectifActuelParDG[dgKey];
            if (typeof effDG === 'number' && effDG >= 0) {
                const effDGDansXAns = Math.max(0, effDG - totalAgentsDG);
                const effDGRow = [`Effectif de la direction générale${totalPeriodSuffix} : ${effDGDansXAns} agents`];
                for (let i = 1; i < headers.length; i++) effDGRow.push('');
                allData.push(effDGRow);
                mergeRanges.push({ s: { r: allData.length - 1, c: 0 }, e: { r: allData.length - 1, c: 5 } });
            }
        }
    }

    // Total sur toute la structure (cohérent avec les données du rapport, y compris directions hors ordre MTL)
    totalAgentsMinistère = sumTotalAgentsInGroupedData(groupedData);

    const ministryTotalRow = [`${isRetirementReport ? labelPartant + ' (ministère)' : 'Total ministère'}${totalPeriodSuffix} : ${totalAgentsMinistère} agents`];
    for (let i = 1; i < headers.length; i++) ministryTotalRow.push('');
    allData.push(ministryTotalRow);
    mergeRanges.push({ s: { r: allData.length - 1, c: 0 }, e: { r: allData.length - 1, c: 5 } });

    if (isRetirementReport && (Object.keys(effectifActuelParDirection).length > 0 || Object.keys(effectifActuelParDG).length > 0)) {
        const totalEffectifActuel =
            Object.keys(effectifActuelParDirection).length > 0
                ? Object.values(effectifActuelParDirection).reduce((s, n) => s + (typeof n === 'number' ? n : 0), 0)
                : Object.values(effectifActuelParDG).reduce((s, n) => s + (typeof n === 'number' ? n : 0), 0);
        const effectifMinistereDansXAns = Math.max(0, totalEffectifActuel - totalAgentsMinistère);
        const ministryEffectifRow = [`Effectif du ministère${totalPeriodSuffix} : ${effectifMinistereDansXAns} agents`];
        for (let i = 1; i < headers.length; i++) ministryEffectifRow.push('');
        allData.push(ministryEffectifRow);
        mergeRanges.push({ s: { r: allData.length - 1, c: 0 }, e: { r: allData.length - 1, c: 5 } });
    }

    const columnWidths = [
        6, 11, 16, 35, 35, 8, 14, 28, 12, 12, 12, 12, 12, 12, 28, 20, 13, 13, 26, 12, 12, 12,
        18, 12, 16, 18, 10, 16, 38, 12, 12, 12, 12, 12
    ].slice(0, headers.length);

    const worksheet = XLSX.utils.aoa_to_sheet(allData);
    worksheet['!cols'] = columnWidths.map((width) => ({ wch: width }));

    if (mergeRanges.length > 0) {
        worksheet['!merges'] = [...(worksheet['!merges'] || []), ...mergeRanges];
    }
    boldRows.forEach((rowIndex) => {
        const cellRef = XLSX.utils.encode_cell({ r: rowIndex, c: 0 });
        if (worksheet[cellRef]) {
            worksheet[cellRef].s = { font: { bold: true } };
        }
    });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rapport Hiérarchique');
    XLSX.writeFile(workbook, fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`);
}
