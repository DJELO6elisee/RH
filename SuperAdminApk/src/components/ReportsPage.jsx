import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
    Card,
    CardBody,
    CardHeader,
    CardTitle,
    Button,
    Table,
    Row,
    Col,
    Input,
    InputGroup,
    InputGroupAddon,
    InputGroupText,
    FormGroup,
    Label,
    Alert,
    Spinner,
    Dropdown,
    DropdownToggle,
    DropdownMenu,
    DropdownItem,
    Modal,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Form,
    FormGroup as FormGroupCheckbox,
    CustomInput,
    Pagination,
    PaginationItem,
    PaginationLink,
    Collapse
} from 'reactstrap';
import { 
    MdPrint, 
    MdFileDownload, 
    MdPictureAsPdf, 
    MdTableChart, 
    MdDescription,
    MdFilterList,
    MdSearch,
    MdRefresh,
    MdSettings,
    MdArrowBack
} from 'react-icons/md';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { saveAs } from 'file-saver';
import { useHistory } from 'react-router-dom';
import {
    exportHierarchicalReportExcel,
    appendDirectionsMissingFromOrderedExport,
    resolveAgentFromMap
} from '../utils/hierarchicalReportExcel';

const ReportsPage = ({ 
    title, 
    description, 
    apiEndpoint, 
    fields = [],
    searchFields = [],
    filters = [],
    itemsPerPage: itemsPerPageProp,
    user,
    hierarchicalExcludeRetirementWithinYears = null,
    topBanner = null
}) => {
    const history = useHistory();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterValues, setFilterValues] = useState({});
    const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
    const [printModal, setPrintModal] = useState(false);
    const [printData, setPrintData] = useState([]);
    const [fieldSelectionModal, setFieldSelectionModal] = useState(false);
    const [selectedFields, setSelectedFields] = useState([]);
    const [availableFields, setAvailableFields] = useState([]);
    const [showOnlySelectedFields, setShowOnlySelectedFields] = useState(false);
    const [pendingExportAction, setPendingExportAction] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = itemsPerPageProp != null ? itemsPerPageProp : 10;
    // Nouvelle structure hiérarchique renvoyée par l'API (Direction Générale → Direction → Sous-direction → Service → Agents)
    const [hierarchyTree, setHierarchyTree] = useState([]);
    // Ministère courant (pour affichage et pour n'appliquer l'ordre MTL que si c'est le bon ministère)
    const [currentMinistereNom, setCurrentMinistereNom] = useState('');
    const [currentMinistereId, setCurrentMinistereId] = useState(null);
    const [filtersExpanded, setFiltersExpanded] = useState(true);

    // Ordre canonique des structures pour le Ministère du Tourisme et des Loisirs (affichage sans confusion)
    const ORDRE_STRUCTURES_MTL = [
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

    const normalizeStructureName = (name) => {
        if (!name) return '';
        return String(name)
            .toUpperCase()
            .trim()
            .replace(/\s+/g, ' ')
            .replace(/\s*'\s*/g, "'");
    };

    // Normaliser pour comparaison (retirer accents) afin que "Fonds de Développement" matche "FONDS DE DEVELOPPEMENT"
    const normalizeForOrder = (str) => {
        if (!str) return '';
        return normalizeStructureName(str)
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
    };

    const getOrderIndex = (name) => {
        const normalized = normalizeForOrder(name);
        if (!normalized) return 9999;
        const idx = ORDRE_STRUCTURES_MTL.findIndex(
            item => normalizeForOrder(item) === normalized
        );
        if (idx >= 0) return idx;
        // Reconnaître INSPECTION GENERALE (DG ou direction) même si le libellé varie → juste après CABINET (index 1)
        if (normalized.includes('INSPECTION') && normalized.includes('GENERALE')) {
            return 1;
        }
        return 9999;
    };

    // Retourne les DG puis les directions triés selon ORDRE_STRUCTURES_MTL (pour PDF/Word comme pour Excel)
    const getSortedHierarchyForExport = (hierarchicalData) => {
        const useOrdreMTL = isOrdreMTLApplicable();
        const dgEntries = Object.keys(hierarchicalData).map(dgId => ({
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
        dgEntries.forEach(entry => {
            const dirEntries = Object.keys(entry.directionGenerale.directions).map(directionId => ({
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
    };

    // Nom normalisé de la DG dont les directions doivent s'afficher section par section (pour placer DG Côte d'Ivoire juste après FDT)
    const DG_LOISIRS_NORMALIZED = normalizeForOrder('DIRECTION GENERALE DES LOISIRS');

    /**
     * Pour le ministère MTL : ordre section par section selon ORDRE_STRUCTURES_MTL.
     * La DG "DIRECTION GENERALE DES LOISIRS" n'est pas émise en bloc ; ses directions (FDT, Instance, etc.)
     * sont émises à leur position dans la liste, ce qui permet d'afficher "DIRECTION GENERALE DE COTE D'IVOIRE TOURISME"
     * juste après "FONDS DE DEVELOPPEMENT TOURISTIQUE".
     * Retourne null si ordre MTL non applicable (alors utiliser getSortedHierarchyForExport).
     */
    const sumAgentsUnderDirectionGenerale = (dg) =>
        Object.values(dg.directions || {}).reduce((s, d) => s + (d.totalAgents || 0), 0);

    const pickDirectionGeneraleMatchLocal = (dgByNameLists, normalizedName) => {
        const entries = dgByNameLists[normalizedName];
        if (!entries || entries.length === 0) return null;
        if (entries.length === 1) return entries[0];
        return entries.reduce((best, cur) =>
            sumAgentsUnderDirectionGenerale(cur.directionGenerale) > sumAgentsUnderDirectionGenerale(best.directionGenerale)
                ? cur
                : best
        );
    };

    const getOrderedSectionsForExport = (hierarchicalData) => {
        if (!isOrdreMTLApplicable()) return null;
        const sections = [];
        const dgByNameLists = {};
        const directionByName = [];
        Object.keys(hierarchicalData).forEach(dgId => {
            const dg = hierarchicalData[dgId];
            const dgNameNorm = normalizeForOrder(dg.directionGeneraleName || '');
            if (!dgByNameLists[dgNameNorm]) dgByNameLists[dgNameNorm] = [];
            dgByNameLists[dgNameNorm].push({ dgId, directionGenerale: dg });
            Object.keys(dg.directions || {}).forEach(dirId => {
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
            const dgMatch = pickDirectionGeneraleMatchLocal(dgByNameLists, n);
            const dirMatch = directionByName.find(d => d.dirNameNorm === n);
            if (dgMatch && dgMatch.dgId && dgBlocksSet.has(dgMatch.dgId)) {
                sections.push({ type: 'dg_block', orderIndex, dgId: dgMatch.dgId, directionGenerale: dgMatch.directionGenerale });
            } else if (dirMatch && !dgBlocksSet.has(dirMatch.dgId)) {
                sections.push({ type: 'direction', orderIndex, dgId: dirMatch.dgId, directionGenerale: dirMatch.directionGenerale, direction: dirMatch.direction });
            }
        });
        sections.sort((a, b) => a.orderIndex - b.orderIndex);
        return sections;
    };

    /**
     * Retourne une liste plate de { dgId, directionGenerale, direction } dans l'ordre d'affichage
     * (ordre section par section MTL si applicable, sinon ordre DG puis directions).
     */
    const getOrderedDirectionsListForExport = (hierarchicalData) => {
        const orderedSections = getOrderedSectionsForExport(hierarchicalData);
        const list = [];
        if (orderedSections && orderedSections.length > 0) {
            orderedSections.forEach(sec => {
                if (sec.type === 'dg_block') {
                    const dg = sec.directionGenerale;
                    const dirs = Object.keys(dg.directions || {}).map(id => ({ direction: dg.directions[id], directionGenerale: dg, dgId: sec.dgId }));
                    dirs.sort((a, b) => getOrderIndex(a.direction.directionName || (a.direction.isDGDirect ? dg.directionGeneraleName : '') || '') - getOrderIndex(b.direction.directionName || (b.direction.isDGDirect ? dg.directionGeneraleName : '') || ''));
                    dirs.forEach(e => list.push({ dgId: e.dgId, directionGenerale: e.directionGenerale, direction: e.direction }));
                } else if (sec.type === 'direction') {
                    list.push({ dgId: sec.dgId, directionGenerale: sec.directionGenerale, direction: sec.direction });
                }
            });
        } else {
            const sorted = getSortedHierarchyForExport(hierarchicalData);
            sorted.forEach(({ dgId, directionGenerale, sortedDirections }) => {
                sortedDirections.forEach(({ direction }) => {
                    list.push({ dgId, directionGenerale, direction });
                });
            });
        }
        const sumGrouped = Object.values(hierarchicalData || {}).reduce(
            (s, dg) =>
                s +
                Object.values(dg.directions || {}).reduce((t, dir) => t + (dir.totalAgents || 0), 0),
            0
        );
        if (list.length === 0 && sumGrouped > 0) {
            const sorted = getSortedHierarchyForExport(hierarchicalData);
            sorted.forEach(({ dgId, directionGenerale, sortedDirections }) => {
                sortedDirections.forEach(({ direction }) => {
                    list.push({ dgId, directionGenerale, direction });
                });
            });
        }
        return appendDirectionsMissingFromOrderedExport(list, hierarchicalData);
    };

    // True si l'ordre canonique MTL doit être appliqué (évite d'appliquer l'ordre à un autre ministère)
    const isOrdreMTLApplicable = () => {
        if (!currentMinistereNom) return false;
        const nom = normalizeStructureName(currentMinistereNom);
        return nom.includes('TOURISME') && nom.includes('LOISIRS');
    };

    // True si la DG est "sans direction générale" → ne pas afficher son titre ni son total dans les exports
    const isNoDgSection = (dgId, dgName) => {
        if (dgId === 'no_dg') return true;
        const n = normalizeStructureName(dgName || '');
        return n.includes('SANS') && n.includes('DIRECTION');
    };

    // Directions exclues du total de la DG CABINET (elles ont leur propre total, ne pas les additionner au "TOTAL DG CABINET")
    const DIRECTIONS_EXCLUDED_FROM_CABINET_TOTAL = [
        'INSPECTION GENERALE DU TOURISME ET DES LOISIRS',
        'CELLULE DE PASSATION DES MARCHES PUBLICS',
        'CELLULE DE PASSATION DES MARCHES PUBLICSS'
    ];
    const shouldExcludeDirectionFromCabinetTotal = (dgName, directionName) => {
        const dgNorm = normalizeForOrder(dgName || '');
        if (dgNorm !== normalizeForOrder('CABINET')) return false;
        const dirNorm = normalizeForOrder(directionName || '');
        return DIRECTIONS_EXCLUDED_FROM_CABINET_TOTAL.some(
            ref => normalizeForOrder(ref) === dirNorm
        );
    };

    // Ne pas afficher la ligne "TOTAL DIRECTION" quand elle fait la somme des agents directs du CABINET et de la Cellule de passation (41+4=45)
    const shouldHideTotalDirectionRow = (dgName, direction) => {
        const dgNorm = normalizeForOrder(dgName || '');
        if (dgNorm !== normalizeForOrder('CABINET')) return false;
        const sousDirs = direction.sousDirections || {};
        const celluleNorm = normalizeForOrder('CELLULE DE PASSATION DES MARCHES PUBLICS');
        return Object.values(sousDirs).some(sd =>
            normalizeForOrder(sd.sousDirectionName || '') === celluleNorm ||
            normalizeForOrder(sd.sousDirectionName || '') === normalizeForOrder('CELLULE DE PASSATION DES MARCHES PUBLICSS')
        );
    };

    // Ordre d'affichage des types d'agents dans le rapport hiérarchique : FONCTIONNAIRES, CONTRACTUEL, BNETD, puis autres (alphabétique)
    const ORDRE_TYPE_AGENT = ['FONCTIONNAIRES', 'CONTRACTUEL', 'BNETD'];
    const getTypeAgentOrderIndex = (typeLabel) => {
        if (!typeLabel) return ORDRE_TYPE_AGENT.length;
        const n = String(typeLabel).toUpperCase().trim();
        if (n.includes('FONCTIONNAIRE')) return 0;
        if (n.includes('CONTRACTUEL')) return 1;
        if (n.includes('BNETD')) return 2;
        return ORDRE_TYPE_AGENT.length;
    };
    const sortAgentsByTypeThenName = (agents) => {
        if (!agents || !Array.isArray(agents) || agents.length === 0) return agents;
        return [...agents].sort((a, b) => {
            const orderA = getTypeAgentOrderIndex(a.type_agent_libele || a.type_agent);
            const orderB = getTypeAgentOrderIndex(b.type_agent_libele || b.type_agent);
            if (orderA !== orderB) return orderA - orderB;
            if (orderA === ORDRE_TYPE_AGENT.length) {
                const libA = (a.type_agent_libele || a.type_agent || '').toLowerCase();
                const libB = (b.type_agent_libele || b.type_agent || '').toLowerCase();
                if (libA !== libB) return libA.localeCompare(libB, 'fr');
            }
            const nomA = (a.nom || '').toLowerCase();
            const nomB = (b.nom || '').toLowerCase();
            if (nomA !== nomB) return nomA.localeCompare(nomB, 'fr', { sensitivity: 'base' });
            return (a.prenom || '').toLowerCase().localeCompare((b.prenom || '').toLowerCase(), 'fr', { sensitivity: 'base' });
        });
    };

    // Ordre des grades du plus élevé au plus bas (rapport hiérarchique)
    const ORDRE_GRADES_DECROISSANT = [
        'HG', 'GI', 'GII', 'GIII',           // Préfectoral
        'A7', 'A6', 'A5', 'A4', 'A3',        // Catégorie A
        'B3', 'B2', 'B1',                    // Catégorie B
        'C2', 'C1',                          // Catégorie C
        'D1', 'D2'                           // Catégorie D
    ];
    const getGradeOrderIndex = (gradeLabel) => {
        if (!gradeLabel) return 9999;
        const normalized = String(gradeLabel).toUpperCase().trim().replace(/\s+/g, '');
        const exact = ORDRE_GRADES_DECROISSANT.findIndex(g => normalized === g || normalized === g.replace(/\s/g, ''));
        if (exact >= 0) return exact;
        // Match A7, A6, etc. par pattern
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
    };

    // Tri des agents par grade (du plus élevé au plus bas) ; sans grade ou égalité : par matricule croissant
    const sortAgentsByGrade = (agents) => {
        if (!agents || !Array.isArray(agents) || agents.length === 0) return agents;
        return [...agents].sort((a, b) => {
            const gradeA = a.grade_libele || a.grade_libelle || '';
            const gradeB = b.grade_libele || b.grade_libelle || '';
            const orderA = getGradeOrderIndex(gradeA);
            const orderB = getGradeOrderIndex(gradeB);
            if (orderA !== orderB) return orderA - orderB;
            // Même grade ou tous deux sans grade : tri par matricule (ancien → récent)
            const matA = a.matricule != null ? String(a.matricule).trim() : '';
            const matB = b.matricule != null ? String(b.matricule).trim() : '';
            const numA = /^\d+$/.test(matA) ? parseInt(matA, 10) : NaN;
            const numB = /^\d+$/.test(matB) ? parseInt(matB, 10) : NaN;
            if (!Number.isNaN(numA) && !Number.isNaN(numB)) return numA - numB;
            if (!Number.isNaN(numA)) return -1;
            if (!Number.isNaN(numB)) return 1;
            return (matA || '').localeCompare(matB || '', 'fr');
        });
    };

    // Alias pour compatibilité : même tri que sortAgentsByGrade (par grade puis matricule)
    const sortAgentsByMatricule = sortAgentsByGrade;

    const calculateRetirementAgeFromGrade = (gradeLabel = '') => {
        if (!gradeLabel) return 60;
        const normalized = gradeLabel.toUpperCase().trim();
        const grades65 = ['A4', 'A5', 'A6', 'A7'];
        return grades65.includes(normalized) ? 65 : 60;
    };

    const parseDateValue = (value) => {
        if (!value) return null;
        const normalized = value.toString().trim();
        if (!normalized) return null;

        const direct = new Date(normalized);
        if (!Number.isNaN(direct.getTime())) return direct;

        const match = normalized.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
        if (match) {
            const [, day, month, year] = match;
            const iso = `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T00:00:00Z`;
            const parsed = new Date(iso);
            if (!Number.isNaN(parsed.getTime())) return parsed;
        }
        return null;
    };

    const calculateAge = (dateString) => {
        const birthDate = parseDateValue(dateString);
        if (!birthDate) return null;
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age -= 1;
        }
        return age >= 0 ? age : null;
    };

    const getRetirementDate = (agent) => {
        const candidates = [
            agent.date_retraite,
            agent.date_retraite_calculee,
            agent.retirement_date
        ];
        for (const candidate of candidates) {
            const parsed = parseDateValue(candidate);
            if (parsed) return parsed;
        }
        return null;
    };

    const getRetirementAgeForAgent = (agent) => {
        if (agent.age_retraite_calcule) return agent.age_retraite_calcule;
        if (agent.age_retraite) return agent.age_retraite;
        return calculateRetirementAgeFromGrade(agent.grade_libele || agent.grade_libelle || '');
    };

    const hasReachedRetirement = (agent) => {
        const today = new Date();
        const retirementDate = getRetirementDate(agent);
        if (retirementDate && retirementDate <= today) {
            return true;
        }

        const retirementAge = getRetirementAgeForAgent(agent);
        const currentAge = calculateAge(agent.date_de_naissance);
        if (retirementAge && currentAge && currentAge >= retirementAge) {
            return true;
        }

        return false;
    };

    // Fonction pour obtenir les headers d'authentification
    const getAuthHeaders = () => {
        const token = localStorage.getItem('token');
        return {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        };
    };

    // Générer un titre dynamique basé sur les filtres appliqués
    const getDynamicTitle = () => {
        let dynamicTitle = title;
        const filterDescriptions = [];

        // Parcourir les filtres actifs
        Object.keys(filterValues).forEach(key => {
            if (filterValues[key]) {
                const filter = filters.find(f => f.name === key);
                if (filter) {
                    const selectedOption = filter.options?.find(opt => opt.value === filterValues[key]);
                    if (selectedOption && selectedOption.value !== '') {
                        // Adapter le texte selon le type de filtre
                        if (key === 'sexe') {
                            filterDescriptions.push(`de sexe ${selectedOption.label.toLowerCase()}`);
                        } else if (key === 'type_agent') {
                            filterDescriptions.push(`de type ${selectedOption.label}`);
                        } else if (key === 'statut_emploi') {
                            filterDescriptions.push(`au statut ${selectedOption.label}`);
                        } else if (key === 'id_categorie') {
                            filterDescriptions.push(`de catégorie ${selectedOption.label}`);
                        } else if (key === 'id_grade') {
                            filterDescriptions.push(`de grade ${selectedOption.label}`);
                        } else {
                            filterDescriptions.push(`${filter.label}: ${selectedOption.label}`);
                        }
                    }
                }
            }
        });

        // Ajouter les descriptions au titre
        if (filterDescriptions.length > 0) {
            dynamicTitle += ' ' + filterDescriptions.join(', ');
        }

        return dynamicTitle;
    };

    // Charger les données
    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);

            let url = `https://tourisme.2ise-groupe.com/api/${apiEndpoint}`;
            const queryParams = [];

            // Ajouter les filtres
            Object.keys(filterValues).forEach(key => {
                if (filterValues[key]) {
                    queryParams.push(`${key}=${filterValues[key]}`);
                }
            });

            // Pour les rapports d'agents, si aucun filtre include_entites n'est défini, 
            // inclure les agents des entités par défaut
            if (apiEndpoint === 'agents' && !filterValues.include_entites) {
                queryParams.push('include_entites=true');
            }

            // Ajouter la recherche
            if (searchTerm) {
                queryParams.push(`search=${searchTerm}`);
            }

            if (queryParams.length > 0) {
                url += `?${queryParams.join('&')}`;
            }

            const response = await fetch(url, {
                headers: getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            let dataToSet = [];

            if (result.data && Array.isArray(result.data)) {
                dataToSet = result.data;
            } else if (Array.isArray(result)) {
                dataToSet = result;
            } else if (result.success && result.data) {
                dataToSet = result.data;
            }

            // Filtrer pour exclure les agents à la retraite ET les agents retirés manuellement
            const filtered = dataToSet.filter(agent => 
                !hasReachedRetirement(agent) && 
                (!agent.retire || agent.retire === false)
            );
            setData(filtered);
        } catch (err) {
            setError('Erreur de connexion au serveur');
            console.error('Erreur:', err);
        } finally {
            setLoading(false);
        }
    };

    // Nouvelle fonction pour charger les données hiérarchiques
    const loadHierarchicalData = async () => {
        try {
            setLoading(true);
            setError(null);

            // Récupérer l'ID du ministère de l'utilisateur
            const userMinistereId = await getUserMinistereId();
            console.log('🔍 ReportsPage - getUserMinistereId result:', userMinistereId);
            console.log('🔍 ReportsPage - user object:', user);
            
            let url = `https://tourisme.2ise-groupe.com/api/agents/hierarchical-report`;
            const queryParams = [];

            // Ajouter le filtre par ministère (seulement si non présent dans les filtres explicites)
            if (userMinistereId && !filterValues.id_ministere) {
                queryParams.push(`id_ministere=${userMinistereId}`);
                console.log('🔍 ReportsPage - Ajout du filtre par ministère par défaut:', userMinistereId);
            } else if (filterValues.id_ministere) {
                console.log('🔍 ReportsPage - Utilisation du filtre ministère sélectionné:', filterValues.id_ministere);
            } else {
                console.log('⚠️ ReportsPage - Aucun ID de ministère trouvé (ni par défaut ni par filtre), pas de filtrage appliqué');
            }

            // Ajouter les filtres
            Object.keys(filterValues).forEach(key => {
                if (filterValues[key]) {
                    queryParams.push(`${key}=${filterValues[key]}`);
                }
            });

            // Pour les rapports d'agents, si aucun filtre include_entites n'est défini, 
            // inclure les agents des entités par défaut
            if (!filterValues.include_entites) {
                queryParams.push('include_entites=true');
            }

            // Ajouter la recherche
            if (searchTerm) {
                queryParams.push(`search=${searchTerm}`);
            }

            // Éviter Cache-Control / Pragma en en-têtes : hors allowedHeaders CORS → échec de la préflight en cross-origin
            if (
                hierarchicalExcludeRetirementWithinYears != null &&
                Number(hierarchicalExcludeRetirementWithinYears) >= 1
            ) {
                queryParams.push(
                    `exclude_retirement_within_years=${encodeURIComponent(
                        String(Math.min(60, Math.floor(Number(hierarchicalExcludeRetirementWithinYears))))
                    )}`
                );
            }

            queryParams.push(`_ts=${Date.now()}`);
            if (queryParams.length > 0) {
                url += `?${queryParams.join('&')}`;
            }

            console.log('🔍 Chargement des données hiérarchiques depuis:', url);

            const response = await fetch(url, {
                cache: 'no-store',
                headers: getAuthHeaders()
            });

            if (!response.ok) {
                const errText = await response.text().catch(() => '');
                throw new Error(`HTTP ${response.status}${errText ? `: ${errText.slice(0, 200)}` : ''}`);
            }

            const result = await response.json();
            console.log('🔍 Données hiérarchiques reçues:', result);
            
            let dataToSet = [];
            let treeToSet = [];
            
            if (result.success) {
                if (result.data && Array.isArray(result.data)) {
                    dataToSet = result.data;
                    console.log('🔍 Nombre d\'agents récupérés:', dataToSet.length);
                    console.log('🔍 Échantillon des agents:', dataToSet.slice(0, 3).map(agent => ({
                        nom: agent.nom_complet,
                        direction: agent.direction_libelle,
                        sous_direction: agent.sous_direction_libelle,
                        service: agent.service_libelle,
                        statut: agent.statut_emploi
                    })));
                }
                if (result.hierarchyTree && Array.isArray(result.hierarchyTree)) {
                    treeToSet = result.hierarchyTree;
                    console.log('🔍 Arbre hiérarchique reçu (hierarchyTree):', treeToSet.length, 'nœud(s) DG');
                }
            } else {
                console.error('❌ Format de réponse inattendu:', result);
                dataToSet = [];
                treeToSet = [];
            }
            
            // Ne pas réappliquer hasReachedRetirement ici : la logique JS (âge / date) diverge du SQL du backend
            // (grade courant, fuseaux, arrondis) et faisait disparaître des agents encore présents dans hierarchyTree.
            // L'API hierarchical-report applique déjà retraités / retirés / statuts.
            setData(dataToSet);
            setHierarchyTree(treeToSet);
            // Mémoriser le ministère courant (pour affichage et ordre MTL)
            const firstAgent = dataToSet[0];
            if (firstAgent) {
                setCurrentMinistereNom(firstAgent.ministere_nom || '');
                setCurrentMinistereId(firstAgent.id_ministere ?? userMinistereId ?? null);
            } else {
                setCurrentMinistereNom('');
                setCurrentMinistereId(userMinistereId ?? null);
            }
        } catch (err) {
            const msg = err && err.message ? String(err.message) : 'Erreur inconnue';
            const isNetwork =
                /Failed to fetch|NetworkError|Load failed|Network request failed/i.test(msg) ||
                err?.name === 'TypeError';
            setError(
                isNetwork
                    ? 'Erreur de connexion au serveur (réseau ou CORS). Vérifiez la console.'
                    : msg
            );
            console.error('❌ Erreur lors du chargement des données hiérarchiques:', err);
        } finally {
            setLoading(false);
        }
    };

    // Filtrer les données selon les filtres appliqués et le terme de recherche
    const filteredData = data.filter(item => {
        // 1. Filtrage par terme de recherche (recherche textuelle dans les champs)
        if (searchTerm) {
            const matchesSearch = searchFields.some(field => 
                item[field] && item[field].toString().toLowerCase().includes(searchTerm.toLowerCase())
            );
            if (!matchesSearch) return false;
        }
        
        // 2. Filtres liste déroulante : pour les agents, hierarchical-report les applique déjà côté API
        // (rechargement quand filterValues change). Un second passage ici excluait souvent 1–2 lignes
        // (champ absent sur la fiche, ex. id_* null alors que le SQL avait matché autrement).
        if (apiEndpoint !== 'agents') {
            for (const filterName in filterValues) {
                const filterValue = filterValues[filterName];

                if (!filterValue || filterValue === '') continue;

                if (filterName === 'include_entites') continue;
                if (['annee_prise_service', 'date_debut', 'date_fin'].includes(filterName)) continue;

                const itemValue = item[filterName];

                if (filterName === 'type_agent') {
                    const typeAgentLibele = (item.type_agent_libele || item.type_agent || '').toUpperCase();
                    const filterValueUpper = filterValue.toUpperCase();
                    if (typeAgentLibele !== filterValueUpper) {
                        return false;
                    }
                } else {
                    if (itemValue != filterValue) {
                        return false;
                    }
                }
            }
        }

        return true;
    })
    // Trier par ordre alphabétique (nom puis prénom)
    .sort((a, b) => {
        const nomA = (a.nom || '').toLowerCase();
        const nomB = (b.nom || '').toLowerCase();
        if (nomA !== nomB) {
            return nomA.localeCompare(nomB, 'fr', { sensitivity: 'base' });
        }
        const prenomA = (a.prenom || '').toLowerCase();
        const prenomB = (b.prenom || '').toLowerCase();
        return prenomA.localeCompare(prenomB, 'fr', { sensitivity: 'base' });
    });

    // Pagination
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedData = filteredData.slice(startIndex, endIndex);

    // Réinitialiser la page courante si elle dépasse le nombre total de pages ou si les filtres changent
    useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(1);
        }
    }, [totalPages, currentPage]);

    // Réinitialiser la page quand les filtres ou la recherche changent
    useEffect(() => {
        setCurrentPage(1);
    }, [filterValues, searchTerm]);

    // Fonction d'impression avec sélection de champs
    const handlePrint = () => {
        setPendingExportAction('print');
        setFieldSelectionModal(true);
    };

    // Confirmer l'impression avec les champs sélectionnés
    const confirmPrint = () => {
        setPrintData(filteredData);
        setPrintModal(true);
        setFieldSelectionModal(false);
        setPendingExportAction(null);
    };

    // Fonction générique pour ouvrir la modal de sélection des champs
    const openFieldSelectionModal = (exportType) => {
        setPendingExportAction(exportType);
        setFieldSelectionModal(true);
    };

    // Gestion de la sélection des champs
    const handleFieldSelection = (fieldName, isSelected) => {
        if (isSelected) {
            setSelectedFields(prev => [...prev, fieldName]);
        } else {
            setSelectedFields(prev => prev.filter(name => name !== fieldName));
        }
    };

    // Sélectionner/désélectionner tous les champs
    const toggleAllFields = (selectAll) => {
        if (selectAll) {
            setSelectedFields(availableFields.map(field => field.name));
        } else {
            setSelectedFields([]);
        }
    };

    // Obtenir les champs sélectionnés pour l'affichage
    const getSelectedFieldsForDisplay = () => {
        const selectedFieldsList = availableFields.filter(field => selectedFields.includes(field.name));
        
        // Séparer les champs normaux des champs de direction
        const normalFields = selectedFieldsList.filter(field => field.type !== 'direction');
        const directionFields = selectedFieldsList.filter(field => field.type === 'direction');
        
        return {
            normalFields,
            directionFields
        };
    };

    // Grouper les agents par direction (inclure tous les agents)
    const groupAgentsByDirection = (data) => {
        const groups = {};
        
        data.forEach(agent => {
            const directionId = agent.id_direction;
            
            // Agents avec direction spécifiée
            if (directionId && agent.direction_libelle && agent.direction_libelle.trim() !== '') {
                const directionName = agent.direction_libelle;
                const groupKey = `direction_${directionId}`;
                
                if (!groups[groupKey]) {
                    groups[groupKey] = {
                        directionName,
                        agents: []
                    };
                }
                groups[groupKey].agents.push(agent);
            } else {
                // Agents sans direction - les inclure dans un groupe spécial
                const groupKey = 'agents_sans_direction';
                if (!groups[groupKey]) {
                    groups[groupKey] = {
                        directionName: 'Agents sans service spécifique',
                        agents: []
                    };
                }
                groups[groupKey].agents.push(agent);
            }
        });
        
        return groups;
    };

    // Fonction helper pour formater les dates sans problème de fuseau horaire
    const formatDateSafe = (dateString) => {
        if (!dateString) return '-';
        try {
            // Extraire seulement la partie date (YYYY-MM-DD) sans l'heure
            const datePart = dateString.split('T')[0];
            const [year, month, day] = datePart.split('-');
            
            // Retourner au format français DD/MM/YYYY
            return `${day}/${month}/${year}`;
        } catch (error) {
            console.error('Erreur lors du formatage de la date:', dateString, error);
            return '-';
        }
    };

    // Fonction pour formater une valeur de champ (détecte et formate les dates automatiquement)
    const formatFieldValue = (value, fieldName) => {
        if (!value || value === '-') return '-';
        
        // Liste des noms de champs qui contiennent des dates
        const dateFieldNames = [
            'date_de_naissance', 'date_naissance', 'date_embauche', 'date_prise_service_au_ministere',
            'date_prise_service_dans_la_direction', 'date_fin_contrat', 'date_retraite',
            'date_signature_nomination', 'date_nomination_emploi', 'date_mariage',
            'date_entree', 'date_entree_fonction', 'date_entree_emploi', 'fonction_date_entree', 'emploi_date_entree'
        ];
        
        // Vérifier si c'est un champ de date par son nom
        if (dateFieldNames.some(dateField => fieldName.includes(dateField))) {
            return formatDateSafe(value);
        }
        
        // Vérifier si la valeur ressemble à une date ISO (format: YYYY-MM-DD ou YYYY-MM-DDTHH:mm:ss...)
        const datePattern = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}.*)?$/;
        if (typeof value === 'string' && datePattern.test(value.trim())) {
            return formatDateSafe(value);
        }
        
        return value;
    };

    // Fonction helper pour récupérer l'ID du ministère de l'utilisateur
    const getUserMinistereId = async () => {
        console.log('🔍 getUserMinistereId - user:', user);
        console.log('🔍 getUserMinistereId - user?.organization:', user?.organization);
        
        if (user?.organization?.type === 'ministere' && user?.organization?.id) {
            console.log('🔍 getUserMinistereId - Ministère trouvé dans organization:', user.organization.id);
            return user.organization.id;
        } else if (user?.id_agent) {
            console.log('🔍 getUserMinistereId - Recherche via agent ID:', user.id_agent);
            try {
                const token = localStorage.getItem('token');
                const agentResponse = await fetch(`https://tourisme.2ise-groupe.com/api/agents/${user.id_agent}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (agentResponse.ok) {
                    const agentData = await agentResponse.json();
                    console.log('🔍 getUserMinistereId - Agent data:', agentData);
                    return agentData.data?.id_ministere;
                }
            } catch (error) {
                console.error('❌ Erreur lors de la récupération du ministère de l\'agent:', error);
            }
        } else {
            console.log('⚠️ getUserMinistereId - Aucune organisation ou agent trouvé');
        }
        return null;
    };

    // Nouvelle fonction pour grouper hiérarchiquement : Direction Générale → Direction → Sous-directions → Services → Agents
    const groupAgentsHierarchically = async (data) => {
        // 🆕 Si l'API renvoie déjà un arbre hiérarchique (hierarchyTree),
        // on l'utilise pour construire la structure attendue par les exports Excel/PDF/Word,
        // sans aucun code "en dur" sur les directions.
        if (hierarchyTree && Array.isArray(hierarchyTree) && hierarchyTree.length > 0) {
            console.log('🔍 Utilisation de hierarchyTree pour le groupement hiérarchique (frontend dynamique).');
            
            const agentMap = {};
            data.forEach((agent) => {
                if (!agent) return;
                const id = agent.id != null ? agent.id : agent.id_agent;
                if (id == null) return;
                agentMap[id] = agent;
                agentMap[String(id)] = agent;
                if (typeof id === 'string' && /^\d+$/.test(id)) {
                    agentMap[Number(id)] = agent;
                }
            });

            const mapToFullAgents = (summaries = []) => {
                return summaries
                    .map((summary) => {
                        if (!summary) return null;
                        const sid = summary.id != null ? summary.id : summary.id_agent;
                        const full = sid != null ? resolveAgentFromMap(agentMap, sid) : null;
                        return full || summary;
                    })
                    .filter((a) => a != null);
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
                    // Utiliser direction_libelle dès qu'il est renseigné (ex. INSPECTION GENERALE fusionnée sous Cabinet), sinon DG ou "Direction"
                    const explicitLabel = (dirNode.direction_libelle && String(dirNode.direction_libelle).trim() !== '');
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

                    // 1. Agents directement rattachés à la direction (sans sous-direction ni service)
                    const directAgents = sortAgentsByGrade(mapToFullAgents(dirNode.agents_sans_sous_ni_service || []));
                    if (directAgents.length > 0) {
                        dirStruct.directAgents = directAgents;
                        dirStruct.totalAgents += directAgents.length;
                    }

                    // 2. Services directement rattachés à la direction (sans sous-direction)
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

                    // 3. Sous-directions
                    (dirNode.sous_directions || []).forEach((sdNode, sdIndex) => {
                        const sdIdValue = sdNode.id_sous_direction != null ? sdNode.id_sous_direction : (sdNode.id != null ? sdNode.id : `sd_${dirKey}_${sdIndex}`);
                        const directSdAgents = sortAgentsByGrade(mapToFullAgents(sdNode.agents_sans_service || []));

                        const servicesWithAgents = {};
                        (sdNode.services || []).forEach((svc, svcIndex) => {
                            const svcIdValue = svc.id_service != null ? svc.id_service : (svc.id != null ? svc.id : `svc_sd_${sdIdValue}_${svcIndex}`);
                            const serviceAgents = sortAgentsByGrade(mapToFullAgents(svc.agents || []));
                            if (serviceAgents.length === 0) return;

                            servicesWithAgents[svcIdValue] = {
                                serviceName: svc.service_libelle || svc.libelle || 'Service',
                                serviceId: svcIdValue,
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

            // Ne pas ajouter de section "Agents sans direction" quand on utilise hierarchyTree :
            // le backend a déjà placé tous les agents (y compris ceux avec DG mais sans direction) dans l'arbre.

            const totalAgents = Object.values(hierarchicalStructure).reduce((sum, dg) => {
                return sum + Object.values(dg.directions).reduce((dirSum, dir) => dirSum + dir.totalAgents, 0);
            }, 0);
            const totalDirections = Object.values(hierarchicalStructure).reduce((sum, dg) => 
                sum + Object.keys(dg.directions).length, 0
            );
            console.log(`✅ Rapport hiérarchique (depuis hierarchyTree) - ${Object.keys(hierarchicalStructure).length} DG, ${totalDirections} directions, ${totalAgents} agents`);

            return hierarchicalStructure;
        }

        // 🧰 Fallback : ancien comportement basé sur les entités si aucun hierarchyTree n'est disponible
        const token = localStorage.getItem('token');
        
        console.log('🚀 Début du groupement hiérarchique - Nombre d\'agents:', data.length);
        
        // Récupérer l'ID du ministère
        const userMinistereId = await getUserMinistereId();
        console.log('🔍 userMinistereId récupéré:', userMinistereId);
        
        // OPTIMISATION : Récupérer TOUTES les entités hiérarchiques EN UNE FOIS
        console.log('🔄 Récupération de toutes les entités hiérarchiques...');
        
        // Récupérer toutes les directions générales
        let directionsGeneralesUrl = `https://tourisme.2ise-groupe.com/api/directions-generales?limit=1000`;
        if (userMinistereId) directionsGeneralesUrl += `&ministere_id=${userMinistereId}`;
        
        // Récupérer toutes les directions
        let directionsUrl = `https://tourisme.2ise-groupe.com/api/directions?limit=1000`;
        if (userMinistereId) directionsUrl += `&id_ministere=${userMinistereId}`;
        
        // Récupérer tous les services
        let servicesUrl = `https://tourisme.2ise-groupe.com/api/services?limit=1000`;
        if (userMinistereId) servicesUrl += `&id_ministere=${userMinistereId}`;
        
        // Récupérer toutes les sous-directions
        let sousDirectionsUrl = `https://tourisme.2ise-groupe.com/api/sous_directions?limit=1000`;
        if (userMinistereId) sousDirectionsUrl += `&id_ministere=${userMinistereId}`;
        
        // Faire toutes les requêtes en parallèle
        const [directionsGeneralesResponse, directionsResponse, servicesResponse, sousDirectionsResponse] = await Promise.all([
            fetch(directionsGeneralesUrl, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(directionsUrl, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(servicesUrl, { headers: { 'Authorization': `Bearer ${token}` } }),
            fetch(sousDirectionsUrl, { headers: { 'Authorization': `Bearer ${token}` } })
        ]);
        
        const [directionsGeneralesResult, directionsResult, servicesResult, sousDirectionsResult] = await Promise.all([
            directionsGeneralesResponse.json(),
            directionsResponse.json(),
            servicesResponse.json(),
            sousDirectionsResponse.json()
        ]);
        
        const allDirectionsGenerales = directionsGeneralesResult.success ? directionsGeneralesResult.data : [];
        const allDirections = directionsResult.success ? directionsResult.data : [];
        const allServices = servicesResult.success ? servicesResult.data : [];
        const allSousDirections = sousDirectionsResult.success ? sousDirectionsResult.data : [];
        
        console.log(`✅ Entités récupérées - Directions Générales: ${allDirectionsGenerales.length}, Directions: ${allDirections.length}, Services: ${allServices.length}, Sous-directions: ${allSousDirections.length}`);
        
        // console.log('🔍 DEBUG - Directions récupérées:', allDirections.length);
        
        // Si le filtre par ministère n'a pas fonctionné, filtrer manuellement
        let filteredDirections = allDirections;
        if (!userMinistereId && allDirections.length > 0) {
            // Récupérer le ministère depuis le premier agent
            const firstAgent = data.find(agent => agent.id_ministere);
            if (firstAgent && firstAgent.id_ministere) {
                const targetMinistereId = firstAgent.id_ministere;
                filteredDirections = allDirections.filter(direction => 
                    direction.id_ministere === targetMinistereId
                );
                console.log(`🔧 Filtrage manuel - Ministère ${targetMinistereId}: ${filteredDirections.length} directions`);
            }
        }
        
        // Exclure explicitement les directions qui sont en fait des services
        const invalidDirections = ['Service Informatique', 'SERVICE INFORMATIQUE'];
        filteredDirections = filteredDirections.filter(direction => 
            !invalidDirections.includes(direction.libelle)
        );
        
        // Créer les mappings pour faciliter l'accès
        const directionMapping = {};
        const directionGeneraleMapping = {};
        const sousDirectionMapping = {};
        const serviceMapping = {};
        
        filteredDirections.forEach(d => {
            directionMapping[d.id] = d;
            if (d.id_direction_generale) {
                if (!directionGeneraleMapping[d.id_direction_generale]) {
                    directionGeneraleMapping[d.id_direction_generale] = [];
                }
                directionGeneraleMapping[d.id_direction_generale].push(d);
            }
        });
        
        allSousDirections.forEach(sd => {
            sousDirectionMapping[sd.id] = sd;
        });
        
        allServices.forEach(s => {
            serviceMapping[s.id] = s;
        });
        
        // Créer la structure hiérarchique : Direction Générale → Directions
        const hierarchicalStructure = {};
        
        // Grouper par Direction Générale d'abord
        allDirectionsGenerales.forEach(dg => {
            if (!hierarchicalStructure[dg.id]) {
                hierarchicalStructure[dg.id] = {
                    directionGeneraleName: dg.libelle,
                    directionGeneraleId: dg.id,
                    directions: {}
                };
            }
        });
        
        // Si certaines directions n'ont pas de direction générale, créer un groupe "Sans Direction Générale"
        filteredDirections.forEach(direction => {
            if (!direction.id_direction_generale) {
                if (!hierarchicalStructure['no_dg']) {
                    hierarchicalStructure['no_dg'] = {
                        directionGeneraleName: 'Directions sans Direction Générale',
                        directionGeneraleId: 'no_dg',
                        directions: {}
                    };
                }
            }
        });
        
        console.log('🔍 Agents reçus pour le rapport:', data.length);
        
        // D'abord, identifier quelles directions ont des agents
        const directionsWithAgents = new Set();
        data.forEach(agent => {
            if (agent.id_direction) {
                directionsWithAgents.add(agent.id_direction);
            }
        });
        
        // Créer les groupes de directions dans leur Direction Générale respective
        filteredDirections.forEach(direction => {
            if (!directionsWithAgents.has(direction.id)) {
                return; // Ignorer les directions sans agents
            }
            
            const dgId = direction.id_direction_generale || 'no_dg';
            
            if (!hierarchicalStructure[dgId]) {
                hierarchicalStructure[dgId] = {
                    directionGeneraleName: direction.direction_generale_libelle || 'Directions sans Direction Générale',
                    directionGeneraleId: dgId,
                    directions: {}
                };
            }
            
            hierarchicalStructure[dgId].directions[direction.id] = {
                directionName: direction.libelle,
                directionId: direction.id,
                directionCode: direction.code || '',
                sousDirections: {},
                directServices: {},
                directAgents: [], // Agents directs de la direction (id_direction mais PAS id_sous_direction ni id_service)
                totalAgents: 0
            };
        });
        
        console.log(`🔍 ${Object.keys(hierarchicalStructure).length} directions générales configurées`);
        console.log('🔄 Traitement des données en mémoire (sans requêtes supplémentaires)...');
        
        // Pour chaque Direction Générale
        for (const dgId in hierarchicalStructure) {
            const dg = hierarchicalStructure[dgId];
            
            // Pour chaque Direction dans cette Direction Générale
            for (const directionId in dg.directions) {
                const direction = dg.directions[directionId];
                
                // Récupérer TOUS les agents de cette direction (peu importe sous-direction/service)
                const allDirectionAgents = data.filter(agent => agent.id_direction === parseInt(directionId));
                
                if (allDirectionAgents.length === 0) {
                    continue;
                }
                
                // 1. AGENTS DIRECTS DE LA DIRECTION (id_direction mais PAS id_sous_direction ni id_service)
                const directAgents = sortAgentsByGrade(allDirectionAgents.filter(agent => 
                    !agent.id_sous_direction && !agent.id_service
                ));
                
                if (directAgents.length > 0) {
                    direction.directAgents = directAgents;
                    direction.totalAgents += directAgents.length;
                }
                
                // 2. SERVICES DIRECTS DE LA DIRECTION (id_direction et id_service mais PAS id_sous_direction)
                const directServices = allServices.filter(s => 
                    s.id_direction === parseInt(directionId) && !s.id_sous_direction
                );
                
                if (directServices.length > 0) {
                    direction.directServices = {};
                    
                    for (const service of directServices) {
                        // Agents avec ce service ET cette direction MAIS PAS de sous-direction
                        const serviceAgents = sortAgentsByGrade(allDirectionAgents.filter(agent => 
                            (agent.id_service === service.id || agent.service_libelle === service.libelle) &&
                            !agent.id_sous_direction
                        ));
                        
                        if (serviceAgents.length > 0) {
                            direction.directServices[service.id] = {
                                serviceName: service.libelle,
                                serviceId: service.id,
                                agents: serviceAgents,
                                agentCount: serviceAgents.length
                            };
                            direction.totalAgents += serviceAgents.length;
                        }
                    }
                }
                
                // 3. SOUS-DIRECTIONS (id_sous_direction)
                const sousDirections = allSousDirections.filter(sd => 
                    sd.id_direction === parseInt(directionId)
                );
                
                for (const sousDirection of sousDirections) {
                    // Agents de cette sous-direction
                    const sousDirectionAgents = allDirectionAgents.filter(agent => 
                        agent.id_sous_direction === sousDirection.id
                    );
                    
                    if (sousDirectionAgents.length === 0) {
                        continue; // Ignorer les sous-directions sans agents
                    }
                    
                    // 3a. AGENTS DIRECTS DE SOUS-DIRECTION (id_sous_direction mais PAS id_service)
                    const directSousDirectionAgents = sortAgentsByGrade(sousDirectionAgents.filter(agent => 
                        !agent.id_service
                    ));
                    
                    // 3b. SERVICES DE SOUS-DIRECTION (id_sous_direction ET id_service)
                    const sousDirectionServices = allServices.filter(s => 
                        s.id_sous_direction === sousDirection.id
                    );
                    
                    const servicesWithAgents = {};
                    
                    for (const service of sousDirectionServices) {
                        const serviceAgents = sortAgentsByGrade(sousDirectionAgents.filter(agent => 
                            agent.id_service === service.id || agent.service_libelle === service.libelle
                        ));
                        
                        if (serviceAgents.length > 0) {
                            servicesWithAgents[service.id] = {
                                serviceName: service.libelle,
                                serviceId: service.id,
                                agents: serviceAgents,
                                agentCount: serviceAgents.length
                            };
                        }
                    }
                    
                    // Créer la sous-direction si elle a des agents directs OU des services
                    if (directSousDirectionAgents.length > 0 || Object.keys(servicesWithAgents).length > 0) {
                        direction.sousDirections[sousDirection.id] = {
                            sousDirectionName: sousDirection.libelle,
                            sousDirectionId: sousDirection.id,
                            directAgents: directSousDirectionAgents, // NOUVEAU : Agents directs de sous-direction
                            services: servicesWithAgents,
                            totalAgents: directSousDirectionAgents.length + 
                                        Object.values(servicesWithAgents).reduce((sum, s) => sum + s.agentCount, 0)
                        };
                        direction.totalAgents += direction.sousDirections[sousDirection.id].totalAgents;
                    }
                }
            }
        }

        // Placer les agents qui ont une Direction Générale mais pas de direction sous leur DG
        const dgDirectAgents = {};
        data.forEach(agent => {
            if ((!agent.id_direction || !agent.direction_libelle || agent.direction_libelle.trim() === '') && agent.id_direction_generale) {
                const dgId = agent.id_direction_generale;
                if (!dgDirectAgents[dgId]) dgDirectAgents[dgId] = [];
                dgDirectAgents[dgId].push(agent);
            }
        });
        Object.keys(dgDirectAgents).forEach(dgId => {
            if (!hierarchicalStructure[dgId]) {
                hierarchicalStructure[dgId] = {
                    directionGeneraleName: dgDirectAgents[dgId][0]?.direction_generale_libelle || 'Direction Générale',
                    directionGeneraleId: dgId,
                    directions: {}
                };
            }
            const dgNode = hierarchicalStructure[dgId];
            if (!dgNode.directions['dg_direct']) {
                dgNode.directions['dg_direct'] = {
                    directionName: dgNode.directionGeneraleName,
                    directionId: 'dg_direct',
                    directionCode: '',
                    sousDirections: {},
                    directServices: {},
                    directAgents: [],
                    totalAgents: 0
                };
            }
            dgNode.directions['dg_direct'].directAgents = sortAgentsByGrade(dgDirectAgents[dgId]);
            dgNode.directions['dg_direct'].totalAgents = dgDirectAgents[dgId].length;
        });

        // "Agents sans direction" uniquement pour ceux sans DG et sans direction (vraiment non rattachés)
        const agentsWithoutDirection = data.filter(agent => 
            (!agent.id_direction || !agent.direction_libelle || agent.direction_libelle.trim() === '') &&
            !agent.id_direction_generale
        );
        
        if (agentsWithoutDirection.length > 0) {
            console.log(`🔍 Agents sans direction ni DG trouvés:`, agentsWithoutDirection.length);
            if (!hierarchicalStructure['no_dg']) {
                hierarchicalStructure['no_dg'] = {
                    directionGeneraleName: 'Directions sans Direction Générale',
                    directionGeneraleId: 'no_dg',
                    directions: {}
                };
            }
            hierarchicalStructure['no_dg'].directions['agents_sans_direction'] = {
                directionName: 'Agents sans rattachement hiérarchique',
                directionId: 'agents_sans_direction',
                directionCode: '',
                sousDirections: {},
                directServices: {},
                directAgents: sortAgentsByGrade(agentsWithoutDirection),
                totalAgents: agentsWithoutDirection.length
            };
        }

        // Aplatir la structure pour retour (Direction Générale → Directions)
        // On garde la structure hiérarchique complète pour l'export
        const totalAgents = Object.values(hierarchicalStructure).reduce((sum, dg) => {
            return sum + Object.values(dg.directions).reduce((dirSum, dir) => dirSum + dir.totalAgents, 0);
        }, 0);
        
        const totalDirections = Object.values(hierarchicalStructure).reduce((sum, dg) => 
            sum + Object.keys(dg.directions).length, 0
        );
        
        console.log(`✅ Rapport hiérarchique généré - ${Object.keys(hierarchicalStructure).length} directions générales, ${totalDirections} directions, ${totalAgents} agents`);
        
        // Retourner la structure hiérarchique complète (Direction Générale → Directions)
        return hierarchicalStructure;
    };

    // Obtenir les champs à afficher dans le tableau principal
    const getFieldsToDisplay = () => {
        if (showOnlySelectedFields) {
            const { normalFields } = getSelectedFieldsForDisplay();
            return normalFields;
        }
        return fields.filter(field => field.name !== 'id');
    };

    // Exécuter l'action d'export selon le type
    const executePendingAction = () => {
        if (!pendingExportAction) return;

        switch (pendingExportAction) {
            case 'print':
                confirmPrint();
                break;
            case 'excel':
                executeExportExcel();
                break;
            case 'pdf':
                executeExportPDF();
                break;
            case 'word':
                executeExportWord();
                break;
            default:
                break;
        }
    };

    // Fonction d'export Excel
    const handleExportExcel = () => {
        openFieldSelectionModal('excel');
    };

    // Nouvelle fonction d'export Excel hiérarchique améliorée
    const handleExportExcelHierarchical = async () => {
        try {
            setLoading(true);

            const groupedData = await groupAgentsHierarchically(filteredData);

            const projYears = hierarchicalExcludeRetirementWithinYears;
            const hasProjection =
                projYears != null && Number(projYears) >= 1;
            const y = hasProjection ? Math.min(60, Math.floor(Number(projYears))) : 0;
            const periodLabel = hasProjection
                ? `Projection : exclusion des agents dont la retraite est prévue dans les ${y} prochaine(s) année(s) (date enregistrée ou estimation 60/65 ans selon le grade).`
                : '';
            const titleExcel = hasProjection
                ? `ÉTAT DES AGENTS - PROJECTION RETRAITES (${y} AN${y > 1 ? 'S' : ''})`
                : 'ÉTAT DES AGENTS - RAPPORT HIÉRARCHIQUE';
            const fileName = hasProjection
                ? `Projection_Retraites_${y}ans_${new Date().toISOString().split('T')[0]}.xlsx`
                : undefined;

            exportHierarchicalReportExcel({
                groupedData,
                currentMinistereNom,
                title: titleExcel,
                periodLabel,
                ...(fileName ? { fileName } : {})
            });

            alert('Rapport hiérarchique exporté avec succès !');
        } catch (error) {
            console.error('Erreur lors de l\'export hiérarchique:', error);
            alert('Erreur lors de la génération du rapport hiérarchique');
        } finally {
            setLoading(false);
        }
    };

    // Fonction d'export Excel avec champs sélectionnés
    const executeExportExcel = () => {
        const dynamicTitle = getDynamicTitle();
        const { normalFields, directionFields } = getSelectedFieldsForDisplay();
        
        // Filtrer le champ "nom_complet" des champs normaux
        const filteredFields = normalFields.filter(field => 
            field.name !== 'nom_complet' && field.label !== 'Nom complet'
        );
        
        // Créer les en-têtes de colonnes pour les champs normaux (sans nom_complet)
        const headers = ['#', ...filteredFields.map(field => field.label)];
        
        // Grouper les agents par direction
        const groupedData = groupAgentsByDirection(filteredData);
        
        // Trier : ordre canonique MTL si c'est le bon ministère, sinon alphabétique
        const useOrdreMTL = isOrdreMTLApplicable();
        const sortedDirectionIds = Object.keys(groupedData).sort((a, b) => {
            const groupA = groupedData[a];
            const groupB = groupedData[b];
            if (a === 'agents_sans_direction') return 1;
            if (b === 'agents_sans_direction') return -1;
            const nameA = groupA.directionName || '';
            const nameB = groupB.directionName || '';
            if (useOrdreMTL) {
                const orderA = getOrderIndex(nameA);
                const orderB = getOrderIndex(nameB);
                if (orderA !== orderB) return orderA - orderB;
            }
            return nameA.localeCompare(nameB, 'fr');
        });
        
        // Préparer toutes les données
        const allData = [];
        let globalIndex = 1;
        let totalAgents = 0;
        
        // Parcourir chaque direction dans l'ordre trié
        sortedDirectionIds.forEach(directionId => {
            const group = groupedData[directionId];
            const agentsCount = group.agents.length;
            totalAgents += agentsCount;
            
            // Ajouter le titre de la direction - commencer à la colonne 1 (pas 0) pour ne pas affecter la colonne #
            const directionTitleRow = [''];
            directionTitleRow.push(group.directionName);
            // Remplir les autres colonnes avec des cellules vides pour permettre la fusion
            for (let i = 2; i < headers.length; i++) {
                directionTitleRow.push('');
            }
            allData.push(directionTitleRow);
            allData.push([]); // Ligne vide
            
            // Ajouter les en-têtes pour cette direction
            allData.push(headers);
            
            // Ajouter les agents de cette direction
            group.agents.forEach(agent => {
                const row = [globalIndex++];
                filteredFields.forEach(field => {
                    // Gérer les variantes de noms de champs (ex: echelon_libele vs echelon_libelle)
                    let fieldValue = agent[field.name];
                    
                    // Gestion spéciale pour l'échelon (peut être echelon_libele ou echelon_libelle)
                    if (field.name === 'echelon_libele' && !fieldValue) {
                        fieldValue = agent.echelon_libelle || agent.echelon_libele;
                    }
                    
                    // Gestion spéciale pour position (peut être position_libelle ou position_libele)
                    if (field.name === 'position_libelle' && !fieldValue) {
                        fieldValue = agent.position_libele || agent.position_libelle;
                    }
                    
                    // Formater les dates avant de les ajouter
                    if (fieldValue && (
                        field.name.includes('date') || 
                        field.name.includes('Date') ||
                        field.name === 'date_naissance' ||
                        field.name === 'date_de_naissance' ||
                        field.name === 'date_embauche' ||
                        field.name === 'date_prise_service_au_ministere' ||
                        field.name === 'date_prise_service_dans_la_direction' ||
                        field.name === 'date_fin_contrat' ||
                        field.name === 'date_retraite' ||
                        field.name === 'date_mariage' ||
                        field.name === 'date_entree' ||
                        field.name === 'fonction_date_entree' ||
                        field.name === 'emploi_date_entree'
                    )) {
                        row.push(formatDateSafe(fieldValue));
                    } else {
                        row.push(fieldValue || '-');
                    }
                });
                allData.push(row);
            });
            
            // Ajouter le total pour cette direction
            allData.push([]); // Ligne vide
            // Le total commence à la colonne 1, la colonne 0 reste vide
            const totalRow = [''];
            totalRow.push(`Total - Nombre d'agents: ${agentsCount}`);
            // Remplir les autres colonnes avec des cellules vides pour permettre la fusion
            for (let i = 2; i < headers.length; i++) {
                totalRow.push('');
            }
            allData.push(totalRow);
            allData.push([]); // Ligne vide entre les directions
        });
        
        // Ajouter le total général à la fin
        if (Object.keys(groupedData).length > 0) {
            // Le titre "TOTAL GÉNÉRAL" commence aussi à la colonne 1
            const grandTotalTitleRow = [''];
            grandTotalTitleRow.push('TOTAL GÉNÉRAL');
            // Remplir les autres colonnes avec des cellules vides pour permettre la fusion
            for (let i = 2; i < headers.length; i++) {
                grandTotalTitleRow.push('');
            }
            allData.push(grandTotalTitleRow);
            allData.push([]); // Ligne vide
            // Le total général commence aussi à la colonne 1
            const grandTotalRow = [''];
            grandTotalRow.push(`Nombre total d'agents: ${totalAgents}`);
            // Remplir les autres colonnes avec des cellules vides pour permettre la fusion
            for (let i = 2; i < headers.length; i++) {
                grandTotalRow.push('');
            }
            allData.push(grandTotalRow);
        }
        
        // Créer le worksheet
        const worksheet = XLSX.utils.aoa_to_sheet(allData);
        
        // Définir les largeurs de colonnes optimisées
        const columnWidths = [];
        columnWidths.push(5); // N° (colonne étroite pour les numéros uniquement)
        filteredFields.forEach(field => {
            // Définir des largeurs appropriées selon le type de champ pour afficher toutes les informations
            switch(field.name) {
                case 'matricule':
                    columnWidths.push(15); // Réduit de 25 à 15
                    break;
                case 'email':
                    columnWidths.push(30); // Augmenté pour afficher les emails complets
                    break;
                case 'nom':
                    columnWidths.push(18); // Augmenté pour les noms complets
                    break;
                case 'prenom':
                    columnWidths.push(25); // Augmenté pour les prénoms complets
                    break;
                case 'lieu_naissance':
                    columnWidths.push(25); // Augmenté pour les lieux de naissance complets
                    break;
                case 'adresse':
                    columnWidths.push(30); // Augmenté pour les adresses complètes
                    break;
                case 'fonction_actuelle_libele':
                case 'emploi_libele':
                    columnWidths.push(25); // Augmenté pour les fonctions et emplois complets
                    break;
                case 'direction_libelle':
                case 'sous_direction_libelle':
                case 'service_libelle':
                    columnWidths.push(25); // Augmenté pour les noms complets
                    break;
                case 'ministere_nom':
                case 'entite_nom':
                    columnWidths.push(20); // Augmenté pour les noms complets
                    break;
                case 'telephone1':
                case 'telephone2':
                case 'telephone':
                    columnWidths.push(15); // Augmenté pour les numéros complets
                    break;
                case 'date_naissance':
                case 'date_embauche':
                case 'date_prise_service_au_ministere':
                case 'date_prise_service_dans_la_direction':
                case 'date_fin_contrat':
                case 'date_retraite':
                    columnWidths.push(15); // Augmenté pour les dates complètes
                    break;
                case 'nationalite_libele':
                case 'civilite':
                case 'civilité':
                    columnWidths.push(15); // Augmenté pour les libellés complets
                    break;
                case 'type_agent_libele':
                case 'statut_emploi':
                case 'statut_emploi_libelle':
                case 'mode_entree_libele':
                    columnWidths.push(15); // Augmenté pour les libellés complets
                    break;
                case 'situation_matrimoniale_libele':
                    columnWidths.push(20); // Augmenté pour les libellés complets
                    break;
                case 'grade_libele':
                case 'echelon_libelle':
                case 'echelon_libele':
                case 'categorie_libele':
                case 'position_libelle':
                case 'position_libele':
                    columnWidths.push(15); // Augmenté pour les libellés complets
                    break;
                case 'sexe':
                    columnWidths.push(8); // Colonne étroite pour M/F
                    break;
                case 'nombre_enfants':
                    columnWidths.push(12); // Colonne pour les nombres
                    break;
                default:
                    columnWidths.push(15); // Largeur par défaut augmentée
            }
        });
        
        // Ajouter des styles et bordures pour le tableau
        const range = XLSX.utils.decode_range(worksheet['!ref']);
        
        let currentRow = 0;
        Object.keys(groupedData).forEach(directionId => {
            const group = groupedData[directionId];
            
            // Style pour le titre de la direction - fusionner uniquement sur les colonnes de données (pas sur la colonne #)
            // Le titre commence à la colonne 1, la colonne 0 reste vide
            const titleCellAddress = XLSX.utils.encode_cell({ r: currentRow, c: 1 });
            if (worksheet[titleCellAddress]) {
                worksheet[titleCellAddress].s = {
                    font: { bold: true, size: 14, color: { rgb: "FFFFFF" } },
                    fill: { fgColor: { rgb: "2E5984" } },
                    alignment: { horizontal: "left", vertical: "center", indent: 0, wrapText: false }
                };
                // Fusionner le titre de la direction uniquement sur les colonnes de données (colonne 1 à headers.length-1)
                // La colonne 0 (#) reste indépendante et vide
                if (headers.length > 1) {
                    const mergeRange = {
                        s: { r: currentRow, c: 1 },
                        e: { r: currentRow, c: headers.length - 1 }
                    };
                    if (!worksheet['!merges']) {
                        worksheet['!merges'] = [];
                    }
                    worksheet['!merges'].push(mergeRange);
                    // Étendre le style sur toutes les cellules fusionnées
                    for (let col = 1; col < headers.length; col++) {
                        const cellAddr = XLSX.utils.encode_cell({ r: currentRow, c: col });
                        if (!worksheet[cellAddr]) {
                            worksheet[cellAddr] = { t: 's', v: '' };
                        }
                        worksheet[cellAddr].s = worksheet[titleCellAddress].s;
                    }
                }
            }
            currentRow += 2; // Titre + ligne vide
            
            // Style pour les en-têtes de cette direction
            for (let col = 0; col < headers.length; col++) {
                const cellAddress = XLSX.utils.encode_cell({ r: currentRow, c: col });
                if (worksheet[cellAddress]) {
                    worksheet[cellAddress].s = {
                        font: { bold: true, color: { rgb: "FFFFFF" } },
                        fill: { fgColor: { rgb: "366092" } },
                        border: {
                            top: { style: "thin", color: { rgb: "000000" } },
                            bottom: { style: "thin", color: { rgb: "000000" } },
                            left: { style: "thin", color: { rgb: "000000" } },
                            right: { style: "thin", color: { rgb: "000000" } }
                        },
                        alignment: { horizontal: "center", vertical: "center" }
                    };
                }
            }
            currentRow++;
            
            // Style pour les données de cette direction
            for (let i = 0; i < group.agents.length; i++) {
                for (let col = 0; col < headers.length; col++) {
                    const cellAddress = XLSX.utils.encode_cell({ r: currentRow, c: col });
                    if (worksheet[cellAddress]) {
                        worksheet[cellAddress].s = {
                            border: {
                                top: { style: "thin", color: { rgb: "000000" } },
                                bottom: { style: "thin", color: { rgb: "000000" } },
                                left: { style: "thin", color: { rgb: "000000" } },
                                right: { style: "thin", color: { rgb: "000000" } }
                            },
                            alignment: { vertical: "center" }
                        };
                        
                        // Alternance de couleurs pour les lignes
                        if (i % 2 === 0) {
                            worksheet[cellAddress].s.fill = { fgColor: { rgb: "F8F9FA" } };
                        }
                    }
                }
                currentRow++;
            }
            
            // Style pour la ligne de total de cette direction - fusionner uniquement sur les colonnes de données
            currentRow++; // Ligne vide avant le total
            const totalCellAddress = XLSX.utils.encode_cell({ r: currentRow, c: 1 });
            if (worksheet[totalCellAddress]) {
                worksheet[totalCellAddress].s = {
                    font: { bold: true },
                    fill: { fgColor: { rgb: "E8F4FD" } },
                    border: {
                        top: { style: "thin", color: { rgb: "000000" } },
                        bottom: { style: "thin", color: { rgb: "000000" } },
                        left: { style: "thin", color: { rgb: "000000" } },
                        right: { style: "thin", color: { rgb: "000000" } }
                    },
                    alignment: { horizontal: "center", vertical: "center" }
                };
                // Fusionner le total uniquement sur les colonnes de données (colonne 1 à headers.length-1)
                if (headers.length > 1) {
                    const mergeRange = {
                        s: { r: currentRow, c: 1 },
                        e: { r: currentRow, c: headers.length - 1 }
                    };
                    if (!worksheet['!merges']) {
                        worksheet['!merges'] = [];
                    }
                    worksheet['!merges'].push(mergeRange);
                    // Étendre le style sur toutes les cellules fusionnées
                    for (let col = 1; col < headers.length; col++) {
                        const cellAddr = XLSX.utils.encode_cell({ r: currentRow, c: col });
                        if (!worksheet[cellAddr]) {
                            worksheet[cellAddr] = { t: 's', v: '' };
                        }
                        worksheet[cellAddr].s = worksheet[totalCellAddress].s;
                    }
                }
            }
            currentRow += 2; // Total + ligne vide entre les directions
        });
        
        // Style pour le total général
        if (Object.keys(groupedData).length > 0) {
            // Style pour le titre "TOTAL GÉNÉRAL" - fusionner uniquement sur les colonnes de données
            // Le titre commence à la colonne 1, la colonne 0 reste vide
            const grandTotalTitleCell = XLSX.utils.encode_cell({ r: currentRow, c: 1 });
            if (worksheet[grandTotalTitleCell]) {
                worksheet[grandTotalTitleCell].s = {
                    font: { bold: true, size: 14, color: { rgb: "FFFFFF" } },
                    fill: { fgColor: { rgb: "D32F2F" } },
                    alignment: { horizontal: "left", vertical: "center", indent: 0, wrapText: false }
                };
                // Fusionner le titre "TOTAL GÉNÉRAL" uniquement sur les colonnes de données (colonne 1 à headers.length-1)
                if (headers.length > 1) {
                    const mergeRange = {
                        s: { r: currentRow, c: 1 },
                        e: { r: currentRow, c: headers.length - 1 }
                    };
                    if (!worksheet['!merges']) {
                        worksheet['!merges'] = [];
                    }
                    worksheet['!merges'].push(mergeRange);
                    // Étendre le style sur toutes les cellules fusionnées
                    for (let col = 1; col < headers.length; col++) {
                        const cellAddr = XLSX.utils.encode_cell({ r: currentRow, c: col });
                        if (!worksheet[cellAddr]) {
                            worksheet[cellAddr] = { t: 's', v: '' };
                        }
                        worksheet[cellAddr].s = worksheet[grandTotalTitleCell].s;
                    }
                }
            }
            currentRow += 2; // Titre + ligne vide
            
            // Style pour la ligne de total général - fusionner uniquement sur les colonnes de données
            const grandTotalCellAddress = XLSX.utils.encode_cell({ r: currentRow, c: 1 });
            if (worksheet[grandTotalCellAddress]) {
                worksheet[grandTotalCellAddress].s = {
                    font: { bold: true, size: 12 },
                    fill: { fgColor: { rgb: "FFCDD2" } },
                    border: {
                        top: { style: "medium", color: { rgb: "D32F2F" } },
                        bottom: { style: "medium", color: { rgb: "D32F2F" } },
                        left: { style: "medium", color: { rgb: "D32F2F" } },
                        right: { style: "medium", color: { rgb: "D32F2F" } }
                    },
                    alignment: { horizontal: "center", vertical: "center" }
                };
                // Fusionner le total général uniquement sur les colonnes de données (colonne 1 à headers.length-1)
                if (headers.length > 1) {
                    const mergeRange = {
                        s: { r: currentRow, c: 1 },
                        e: { r: currentRow, c: headers.length - 1 }
                    };
                    if (!worksheet['!merges']) {
                        worksheet['!merges'] = [];
                    }
                    worksheet['!merges'].push(mergeRange);
                    // Étendre le style sur toutes les cellules fusionnées
                    for (let col = 1; col < headers.length; col++) {
                        const cellAddr = XLSX.utils.encode_cell({ r: currentRow, c: col });
                        if (!worksheet[cellAddr]) {
                            worksheet[cellAddr] = { t: 's', v: '' };
                        }
                        worksheet[cellAddr].s = worksheet[grandTotalCellAddress].s;
                    }
                }
            }
        }
        
        // Appliquer les largeurs de colonnes APRÈS toutes les fusions pour éviter qu'elles soient affectées
        // Utiliser les largeurs définies explicitement plutôt que le calcul automatique
        worksheet['!cols'] = columnWidths.map(width => ({ wch: width }));
        
        
        
        // Créer le workbook
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'États des Agents');
        
        // Générer le fichier Excel
        const fileName = `${dynamicTitle.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(workbook, fileName);
        setFieldSelectionModal(false);
        setPendingExportAction(null);
    };

    // Fonction d'export PDF
    const handleExportPDF = () => {
        openFieldSelectionModal('pdf');
    };

    // Fonction d'export PDF avec champs sélectionnés
    const executeExportPDF = async () => {
        try {
            const pdf = new jsPDF('l', 'mm', 'a4');
            const dynamicTitle = getDynamicTitle();
            const { normalFields } = getSelectedFieldsForDisplay();
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            
            // Ajouter le titre avec le nombre d'agents (centré)
            pdf.setFontSize(16);
            pdf.setFont(undefined, 'bold');
            const titleText = `${dynamicTitle} - ${filteredData.length} agent(s) trouvé(s)`;
            const titleWidth = pdf.getTextWidth(titleText);
            const titleX = (pageWidth - titleWidth) / 2;
            pdf.text(titleText, titleX, 20);
            
            // Ajouter la date (centrée)
            pdf.setFontSize(10);
            pdf.setFont(undefined, 'normal');
            const dateText = `Généré le ${new Date().toLocaleDateString('fr-FR', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })}`;
            const dateWidth = pdf.getTextWidth(dateText);
            const dateX = (pageWidth - dateWidth) / 2;
            pdf.text(dateText, dateX, 30);

            // Créer le tableau directement dans le PDF sans html2canvas
            let yPosition = 45;
            const lineHeight = 8;
            const colWidth = (pageWidth - 40) / (normalFields.length + 1); // +1 pour le numéro
            
            // En-têtes du tableau
            pdf.setFontSize(9);
            pdf.setFont(undefined, 'bold');
            
            // Numéro
            pdf.text('#', 20, yPosition);
            
            // En-têtes des colonnes
            normalFields.forEach((field, index) => {
                const xPos = 20 + (index + 1) * colWidth;
                // Tronquer le texte si trop long
                const headerText = field.label.length > 15 ? field.label.substring(0, 15) + '...' : field.label;
                pdf.text(headerText, xPos, yPosition);
            });
            
            yPosition += lineHeight;
            
            // Ligne de séparation
            pdf.line(20, yPosition, pageWidth - 20, yPosition);
            yPosition += 3;
            
            // Données du tableau
            pdf.setFont(undefined, 'normal');
            pdf.setFontSize(8);
            
            filteredData.forEach((item, index) => {
                // Vérifier si on a besoin d'une nouvelle page
                if (yPosition > pageHeight - 20) {
                    pdf.addPage();
                    yPosition = 20;
                }
                
                // Numéro de ligne
                pdf.text((index + 1).toString(), 20, yPosition);
                
                // Données des colonnes
                normalFields.forEach((field, colIndex) => {
                    const xPos = 20 + (colIndex + 1) * colWidth;
                    let cellValue = '-';
                    
                    if (field.isDirectionCount) {
                        // Pour les champs de direction, afficher "Oui" si l'agent appartient à cette direction
                        const belongsToDirection = item.id_direction === field.directionId;
                        cellValue = belongsToDirection ? 'Oui' : 'Non';
                    } else {
                        cellValue = formatFieldValue(item[field.name], field.name);
                    }
                    
                    // Tronquer le texte si trop long
                    const displayText = cellValue.toString().length > 20 ? 
                        cellValue.toString().substring(0, 20) + '...' : 
                        cellValue.toString();
                    
                    pdf.text(displayText, xPos, yPosition);
                });
                
                yPosition += lineHeight;
                
                // Ligne de séparation tous les 5 lignes
                if ((index + 1) % 5 === 0) {
                    pdf.line(20, yPosition - 2, pageWidth - 20, yPosition - 2);
                    yPosition += 3;
                }
            });

            // Sauvegarder le PDF
            pdf.save(`${title}_${filteredData.length}_agents_${new Date().toISOString().split('T')[0]}.pdf`);
            setFieldSelectionModal(false);
            setPendingExportAction(null);
            
        } catch (error) {
            console.error('Erreur lors de l\'export PDF:', error);
            alert('Erreur lors de la génération du PDF. Veuillez réessayer.');
            setFieldSelectionModal(false);
            setPendingExportAction(null);
        }
    };

    // Fonction d'export Word (HTML)
    const handleExportWord = () => {
        openFieldSelectionModal('word');
    };

    // Nouvelle fonction d'export PDF hiérarchique
    const handleExportPDFHierarchical = async () => {
        try {
            setLoading(true);
            const pdf = new jsPDF('l', 'mm', 'a4');
            const dynamicTitle = getDynamicTitle();
            const { normalFields } = getSelectedFieldsForDisplay();
            const pageWidth = pdf.internal.pageSize.getWidth();
            
            // Grouper les données hiérarchiquement
            const hierarchicalData = await groupAgentsHierarchically(filteredData);
            
            let yPosition = 20;
            const lineHeight = 7;
            const pageHeight = pdf.internal.pageSize.getHeight();
            
            // Fonction pour ajouter une nouvelle page si nécessaire
            const checkPageBreak = (requiredSpace = 20) => {
                if (yPosition + requiredSpace > pageHeight - 20) {
                    pdf.addPage();
                    yPosition = 20;
                    return true;
                }
                return false;
            };
            
            // Titre principal
            pdf.setFontSize(16);
            pdf.setFont(undefined, 'bold');
            pdf.text(`${dynamicTitle} - Rapport Hiérarchique`, pageWidth / 2, yPosition, { align: 'center' });
            yPosition += 15;
            
            pdf.setFontSize(10);
            pdf.setFont(undefined, 'normal');
            pdf.text(`Généré le: ${new Date().toLocaleDateString('fr-FR')}`, pageWidth / 2, yPosition, { align: 'center' });
            yPosition += 20;
            
            let globalIndex = 1;
            let totalAgentsMinistère = 0;
            let currentPdfDgId = null;
            let currentPdfDgName = null;
            let totalAgentsPdfDG = 0;
            let totalAgentsPdfDGFull = 0; // total incluant toutes les directions (pour total ministère)
            
            const orderedDirectionsList = getOrderedDirectionsListForExport(hierarchicalData);
            orderedDirectionsList.forEach(({ dgId, directionGenerale, direction }) => {
                if (currentPdfDgId !== dgId) {
                    if (currentPdfDgId !== null && !isNoDgSection(currentPdfDgId, currentPdfDgName)) {
                        checkPageBreak(12);
                        pdf.setFontSize(14);
                        pdf.setFont(undefined, 'bold');
                        pdf.text(`TOTAL DG ${currentPdfDgName}: ${totalAgentsPdfDG} agents`, 20, yPosition);
                        yPosition += 15;
                        totalAgentsMinistère += totalAgentsPdfDGFull;
                    }
                    currentPdfDgId = dgId;
                    currentPdfDgName = directionGenerale.directionGeneraleName;
                    totalAgentsPdfDG = 0;
                    totalAgentsPdfDGFull = 0;
                    if (!isNoDgSection(dgId, directionGenerale.directionGeneraleName)) {
                        checkPageBreak(15);
                        pdf.setFontSize(16);
                        pdf.setFont(undefined, 'bold');
                        pdf.text(`DIRECTION GÉNÉRALE: ${directionGenerale.directionGeneraleName}`, 20, yPosition);
                        yPosition += 12;
                    }
                }
                
                checkPageBreak(15);
                pdf.setFontSize(14);
                pdf.setFont(undefined, 'bold');
                pdf.text(`DIRECTION: ${direction.directionName}`, 20, yPosition);
                yPosition += 10;
                
                let totalAgentsDirection = 0;
                
                // Agents directs de la direction (sans service ni sous-direction) EN PREMIER
                if (direction.directAgents && direction.directAgents.length > 0) {
                    checkPageBreak(20);
                    
                    // En-têtes pour les agents directs
                    pdf.setFontSize(8);
                    pdf.setFont(undefined, 'bold');
                    let xPosition = 40;
                    const colWidth = (pageWidth - 100) / normalFields.length;
                    
                    normalFields.forEach((field, index) => {
                        pdf.text(field.label.substring(0, 12), xPosition + (index * colWidth), yPosition);
                    });
                    yPosition += 5;
                    
                    // Ligne de séparation
                    pdf.line(40, yPosition, pageWidth - 40, yPosition);
                    yPosition += 3;
                    
                    // Agents directs de la direction
                    pdf.setFont(undefined, 'normal');
                    direction.directAgents.forEach(agent => {
                        checkPageBreak(10);
                        xPosition = 40;
                        normalFields.forEach((field, index) => {
                            const value = agent[field.name] || '-';
                            pdf.text(String(value).substring(0, 15), xPosition + (index * colWidth), yPosition);
                        });
                        yPosition += 5;
                    });
                    
                    totalAgentsDirection += direction.directAgents.length;
                    
                    // Total des agents directs de la direction
                    checkPageBreak(8);
                    pdf.setFont(undefined, 'bold');
                    pdf.setFontSize(10);
                    pdf.text(`Total agents directs direction: ${direction.directAgents.length} agents`, 30, yPosition);
                    yPosition += 12; // Espace après le total
                }
                
                // Services directs de la direction (sans sous-direction)
                if (direction.directServices) {
                    // Filtrer les services pour exclure le service virtuel "Agents sans service spécifique"
                    const realServices = Object.keys(direction.directServices).filter(serviceId => 
                        direction.directServices[serviceId].serviceName !== 'Agents sans service spécifique'
                    );
                    
                    // Trier les services par ordre alphabétique
                    const sortedServiceIds = realServices.sort((a, b) => {
                        const serviceA = direction.directServices[a];
                        const serviceB = direction.directServices[b];
                        return serviceA.serviceName.localeCompare(serviceB.serviceName);
                    });
                    
                    sortedServiceIds.forEach(serviceId => {
                        const service = direction.directServices[serviceId];
                        
                        checkPageBreak(20);
                        
                        // Titre du service direct
                        pdf.setFontSize(11);
                        pdf.setFont(undefined, 'bold');
                        pdf.text(`  SERVICE DIRECT: ${service.serviceName}`, 30, yPosition);
                        yPosition += 6;
                        
                        // En-têtes
                        pdf.setFontSize(8);
                        pdf.setFont(undefined, 'bold');
                        let xPosition = 40;
                        const colWidth = (pageWidth - 100) / normalFields.length;
                        
                        normalFields.forEach((field, index) => {
                            pdf.text(field.label.substring(0, 12), xPosition + (index * colWidth), yPosition);
                        });
                        yPosition += 5;
                        
                        // Ligne de séparation
                        pdf.line(40, yPosition, pageWidth - 40, yPosition);
                        yPosition += 3;
                        
                        // Agents
                        pdf.setFont(undefined, 'normal');
                        service.agents.forEach(agent => {
                            checkPageBreak(10);
                            xPosition = 40;
                            normalFields.forEach((field, index) => {
                                const value = agent[field.name] || '-';
                                pdf.text(String(value).substring(0, 15), xPosition + (index * colWidth), yPosition);
                            });
                            yPosition += 5;
                        });
                        
                        // Total du service direct
                        checkPageBreak(8);
                        pdf.setFont(undefined, 'bold');
                        pdf.text(`  Total Service Direct: ${service.agentCount} agents`, 50, yPosition);
                        yPosition += 10;
                        
                        totalAgentsDirection += service.agentCount;
                    });
                }
                
                // Parcourir les sous-directions
                Object.keys(direction.sousDirections).forEach(sousDirectionId => {
                    const sousDirection = direction.sousDirections[sousDirectionId];
                    
                    checkPageBreak(15);
                    
                    // Titre de la sous-direction
                    pdf.setFontSize(12);
                    pdf.setFont(undefined, 'bold');
                    pdf.text(`  SOUS-DIRECTION: ${sousDirection.sousDirectionName}`, 30, yPosition);
                    yPosition += 8;
                    
                    let totalAgentsSousDirection = 0;
                    
                    // Parcourir les services
                    Object.keys(sousDirection.services).forEach(serviceId => {
                        const service = sousDirection.services[serviceId];
                        
                        checkPageBreak(20);
                        
                        // Titre du service
                        pdf.setFontSize(11);
                        pdf.setFont(undefined, 'bold');
                        pdf.text(`    SERVICE: ${service.serviceName}`, 40, yPosition);
                        yPosition += 6;
                        
                        // En-têtes
                        pdf.setFontSize(8);
                        pdf.setFont(undefined, 'bold');
                        let xPosition = 50;
                        const colWidth = (pageWidth - 100) / normalFields.length;
                        
                        normalFields.forEach((field, index) => {
                            pdf.text(field.label.substring(0, 12), xPosition + (index * colWidth), yPosition);
                        });
                        yPosition += 5;
                        
                        // Ligne de séparation
                        pdf.line(50, yPosition, pageWidth - 50, yPosition);
                        yPosition += 3;
                        
                        // Agents
                        pdf.setFont(undefined, 'normal');
                        service.agents.forEach(agent => {
                            checkPageBreak(10);
                            xPosition = 50;
                            normalFields.forEach((field, index) => {
                                const value = agent[field.name] || '-';
                                pdf.text(String(value).substring(0, 15), xPosition + (index * colWidth), yPosition);
                            });
                            yPosition += 5;
                        });
                        
                        // Total du service
                        checkPageBreak(8);
                        pdf.setFont(undefined, 'bold');
                        pdf.text(`    Total Service: ${service.agentCount} agents`, 60, yPosition);
                        yPosition += 8;
                        
                        totalAgentsSousDirection += service.agentCount;
                    });
                    
                    // Total de la sous-direction
                    checkPageBreak(8);
                    pdf.setFontSize(10);
                    pdf.setFont(undefined, 'bold');
                    pdf.text(`  TOTAL SOUS-DIRECTION: ${totalAgentsSousDirection} agents`, 40, yPosition);
                    yPosition += 10;
                    
                    totalAgentsDirection += totalAgentsSousDirection;
                });
                
                    // Total de la direction (masqué pour la direction CABINET qui inclut la Cellule de passation)
                    if (!shouldHideTotalDirectionRow(currentPdfDgName, direction)) {
                        checkPageBreak(10);
                        pdf.setFontSize(12);
                        pdf.setFont(undefined, 'bold');
                        pdf.text(`TOTAL DIRECTION: ${totalAgentsDirection} agents`, 30, yPosition);
                        yPosition += 15;
                    }
                    
                    totalAgentsPdfDGFull += totalAgentsDirection;
                    if (!shouldExcludeDirectionFromCabinetTotal(currentPdfDgName, direction.directionName)) {
                        totalAgentsPdfDG += totalAgentsDirection;
                    }
            });
            
            if (currentPdfDgId !== null && !isNoDgSection(currentPdfDgId, currentPdfDgName)) {
                checkPageBreak(12);
                pdf.setFontSize(14);
                pdf.setFont(undefined, 'bold');
                pdf.text(`TOTAL DG ${currentPdfDgName}: ${totalAgentsPdfDG} agents`, 20, yPosition);
                yPosition += 15;
                totalAgentsMinistère += totalAgentsPdfDGFull;
            }
            
            // Total général
            checkPageBreak(15);
            pdf.setFontSize(14);
            pdf.setFont(undefined, 'bold');
            pdf.text(`TOTAL GÉNÉRAL DU MINISTÈRE: ${totalAgentsMinistère} agents`, pageWidth / 2, yPosition, { align: 'center' });
            
            // Télécharger le PDF
            const fileName = `${dynamicTitle}_Rapport_Hierarchique_${new Date().toISOString().split('T')[0]}.pdf`;
            pdf.save(fileName);
            
        } catch (error) {
            console.error('Erreur lors de l\'export PDF hiérarchique:', error);
            alert('Erreur lors de la génération du rapport PDF hiérarchique');
        } finally {
            setLoading(false);
        }
    };

    // Nouvelle fonction d'export Word hiérarchique
    const handleExportWordHierarchical = async () => {
        try {
            setLoading(true);
            const dynamicTitle = getDynamicTitle();
            const { normalFields } = getSelectedFieldsForDisplay();
            
            // Grouper les données hiérarchiquement
            const hierarchicalData = await groupAgentsHierarchically(filteredData);
            
            let globalIndex = 1;
            let totalAgentsMinistère = 0;
            
            // Construire le HTML hiérarchique
            let htmlContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>${dynamicTitle} - Rapport Hiérarchique</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; }
                        .title { text-align: center; font-size: 18px; font-weight: bold; margin-bottom: 20px; }
                        .direction { font-size: 16px; font-weight: bold; margin: 15px 0 10px 0; color: #2E5984; }
                        .sous-direction { font-size: 14px; font-weight: bold; margin: 12px 0 8px 20px; color: #366092; }
                        .service { font-size: 12px; font-weight: bold; margin: 10px 0 5px 40px; color: #2F4F4F; }
                        .total { font-weight: bold; background-color: #E8F4FD; padding: 5px; margin: 5px 0; }
                        .grand-total { font-size: 16px; font-weight: bold; background-color: #D4EDDA; padding: 10px; margin: 15px 0; text-align: center; }
                        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
                        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                        th { background-color: #366092; color: white; font-weight: bold; }
                        tr:nth-child(even) { background-color: #f2f2f2; }
                        .agent-count { font-weight: bold; color: #2E5984; }
                    </style>
                </head>
                <body>
                    <div class="title">${dynamicTitle} - Rapport Hiérarchique</div>
                    <div style="text-align: center; margin-bottom: 30px;">Généré le: ${new Date().toLocaleDateString('fr-FR')}</div>
            `;
            
            let currentWordDgId = null;
            let currentWordDgName = null;
            let totalAgentsWordDG = 0;
            let totalAgentsWordDGFull = 0; // total incluant toutes les directions (pour total ministère)
            
            const orderedDirectionsListWord = getOrderedDirectionsListForExport(hierarchicalData);
            orderedDirectionsListWord.forEach(({ dgId, directionGenerale, direction }) => {
                if (currentWordDgId !== dgId) {
                    if (currentWordDgId !== null && !isNoDgSection(currentWordDgId, currentWordDgName)) {
                        htmlContent += `<div class="total" style="font-size: 14px; margin: 15px 0;">TOTAL DG ${currentWordDgName}: <span class="agent-count">${totalAgentsWordDG} agents</span></div>`;
                        totalAgentsMinistère += totalAgentsWordDGFull;
                    }
                    currentWordDgId = dgId;
                    currentWordDgName = directionGenerale.directionGeneraleName;
                    totalAgentsWordDG = 0;
                    totalAgentsWordDGFull = 0;
                    if (!isNoDgSection(dgId, directionGenerale.directionGeneraleName)) {
                        htmlContent += `<div class="direction" style="font-size: 18px; margin-top: 20px;">DIRECTION GÉNÉRALE: ${directionGenerale.directionGeneraleName}</div>`;
                    }
                }
                
                htmlContent += `<div class="direction">DIRECTION: ${direction.directionName}</div>`;
                    
                    let totalAgentsDirection = 0;
                
                // Agents directs de la direction (sans service ni sous-direction) EN PREMIER
                if (direction.directAgents && direction.directAgents.length > 0) {
                    // Tableau des agents directs
                    htmlContent += `
                        <table>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    ${normalFields.map(field => `<th>${field.label}</th>`).join('')}
                                </tr>
                            </thead>
                            <tbody>
                    `;
                    
                    direction.directAgents.forEach(agent => {
                        htmlContent += `<tr><td>${globalIndex++}</td>`;
                        normalFields.forEach(field => {
                            htmlContent += `<td>${agent[field.name] || '-'}</td>`;
                        });
                        htmlContent += '</tr>';
                    });
                    
                    htmlContent += '</tbody></table>';
                    totalAgentsDirection += direction.directAgents.length;
                    
                    // Total des agents directs de la direction
                    htmlContent += `<div class="total">Total agents directs direction: <span class="agent-count">${direction.directAgents.length} agents</span></div>`;
                }
                
                // Services directs de la direction (sans sous-direction)
                if (direction.directServices) {
                    // Filtrer les services pour exclure le service virtuel "Agents sans service spécifique"
                    const realServices = Object.keys(direction.directServices).filter(serviceId => 
                        direction.directServices[serviceId].serviceName !== 'Agents sans service spécifique'
                    );
                    
                    // Trier les services par ordre alphabétique
                    const sortedServiceIds = realServices.sort((a, b) => {
                        const serviceA = direction.directServices[a];
                        const serviceB = direction.directServices[b];
                        return serviceA.serviceName.localeCompare(serviceB.serviceName);
                    });
                    
                    sortedServiceIds.forEach(serviceId => {
                        const service = direction.directServices[serviceId];
                        
                        htmlContent += `<div class="service">SERVICE DIRECT: ${service.serviceName}</div>`;
                        
                        // Tableau des agents
                        if (service.agents.length > 0) {
                            htmlContent += `
                                <table>
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            ${normalFields.map(field => `<th>${field.label}</th>`).join('')}
                                        </tr>
                                    </thead>
                                    <tbody>
                            `;
                            
                            service.agents.forEach(agent => {
                                htmlContent += `<tr><td>${globalIndex++}</td>`;
                                normalFields.forEach(field => {
                                    htmlContent += `<td>${agent[field.name] || '-'}</td>`;
                                });
                                htmlContent += '</tr>';
                            });
                            
                            htmlContent += '</tbody></table>';
                        }
                        
                        // Total du service direct
                        htmlContent += `<div class="total">Total Service Direct: <span class="agent-count">${service.agentCount} agents</span></div>`;
                        
                        totalAgentsDirection += service.agentCount;
                    });
                }
                
                // Parcourir les sous-directions
                Object.keys(direction.sousDirections).forEach(sousDirectionId => {
                    const sousDirection = direction.sousDirections[sousDirectionId];
                    
                    htmlContent += `<div class="sous-direction">SOUS-DIRECTION: ${sousDirection.sousDirectionName}</div>`;
                    
                    let totalAgentsSousDirection = 0;
                    
                    // Parcourir les services
                    Object.keys(sousDirection.services).forEach(serviceId => {
                        const service = sousDirection.services[serviceId];
                        
                        htmlContent += `<div class="service">SERVICE: ${service.serviceName}</div>`;
                        
                        // Tableau des agents
                        if (service.agents.length > 0) {
                            htmlContent += `
                                <table>
                                    <thead>
                                        <tr>
                                            <th>#</th>
                                            ${normalFields.map(field => `<th>${field.label}</th>`).join('')}
                                        </tr>
                                    </thead>
                                    <tbody>
                            `;
                            
                            service.agents.forEach(agent => {
                                htmlContent += `<tr><td>${globalIndex++}</td>`;
                                normalFields.forEach(field => {
                                    htmlContent += `<td>${agent[field.name] || '-'}</td>`;
                                });
                                htmlContent += '</tr>';
                            });
                            
                            htmlContent += '</tbody></table>';
                        }
                        
                        // Total du service
                        htmlContent += `<div class="total">Total Service: <span class="agent-count">${service.agentCount} agents</span></div>`;
                        
                        totalAgentsSousDirection += service.agentCount;
                    });
                    
                    // Total de la sous-direction
                    htmlContent += `<div class="total">TOTAL SOUS-DIRECTION: <span class="agent-count">${totalAgentsSousDirection} agents</span></div>`;
                    
                    totalAgentsDirection += totalAgentsSousDirection;
                });
                
                    // Total de la direction (masqué pour la direction CABINET qui inclut la Cellule de passation)
                    if (!shouldHideTotalDirectionRow(currentWordDgName, direction)) {
                        htmlContent += `<div class="total">TOTAL DIRECTION: <span class="agent-count">${totalAgentsDirection} agents</span></div>`;
                    }
                    
                    totalAgentsWordDGFull += totalAgentsDirection;
                    if (!shouldExcludeDirectionFromCabinetTotal(currentWordDgName, direction.directionName)) {
                        totalAgentsWordDG += totalAgentsDirection;
                    }
            });
            
            if (currentWordDgId !== null && !isNoDgSection(currentWordDgId, currentWordDgName)) {
                htmlContent += `<div class="total" style="font-size: 14px; margin: 15px 0;">TOTAL DG ${currentWordDgName}: <span class="agent-count">${totalAgentsWordDG} agents</span></div>`;
                totalAgentsMinistère += totalAgentsWordDGFull;
            }
            
            // Total général
            htmlContent += `<div class="grand-total">TOTAL GÉNÉRAL DU MINISTÈRE: ${totalAgentsMinistère} agents</div>`;
            
            htmlContent += '</body></html>';
            
            // Créer et télécharger le fichier Word
            const blob = new Blob([htmlContent], { type: 'application/msword' });
            const fileName = `${dynamicTitle}_Rapport_Hierarchique_${new Date().toISOString().split('T')[0]}.doc`;
            saveAs(blob, fileName);
            
        } catch (error) {
            console.error('Erreur lors de l\'export Word hiérarchique:', error);
            alert('Erreur lors de la génération du rapport Word hiérarchique');
        } finally {
            setLoading(false);
        }
    };

    // Fonction d'export Word avec champs sélectionnés
    const executeExportWord = () => {
        const dynamicTitle = getDynamicTitle();
        const { normalFields } = getSelectedFieldsForDisplay();

        // Créer le tableau HTML avec les champs sélectionnés
        const tableHTML = `
            <table style="border-collapse: collapse; width: 100%; margin-top: 20px;">
                <thead>
                    <tr style="background-color: #f2f2f2;">
                        <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">#</th>
                        ${normalFields.map(field => 
                            `<th style="border: 1px solid #ddd; padding: 8px; text-align: left;">${field.label}</th>`
                        ).join('')}
                    </tr>
                </thead>
                <tbody>
                    ${filteredData.map((item, index) => `
                        <tr>
                            <td style="border: 1px solid #ddd; padding: 8px;">${index + 1}</td>
                            ${normalFields.map(field => {
                                let cellValue = '-';
                                if (field.isDirectionCount) {
                                    // Pour les champs de direction, afficher "Oui" si l'agent appartient à cette direction
                                    const belongsToDirection = item.id_direction === field.directionId;
                                    cellValue = belongsToDirection ? 'Oui' : 'Non';
                                } else {
                                    cellValue = formatFieldValue(item[field.name], field.name);
                                }
                                return `<td style="border: 1px solid #ddd; padding: 8px;">${cellValue}</td>`;
                            }).join('')}
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        const htmlContent = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>${dynamicTitle} - ${filteredData.length} agent(s) trouvé(s)</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    table { border-collapse: collapse; width: 100%; margin-top: 20px; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f2f2f2; }
                    h1 { color: #333; margin-bottom: 10px; text-align: center; }
                    .subtitle { color: #666; font-size: 14px; margin-bottom: 20px; text-align: center; }
                </style>
            </head>
            <body>
                <h1>${dynamicTitle}</h1>
                <div class="subtitle">
                    <strong>${filteredData.length} agent(s) trouvé(s)</strong><br>
                    Généré le ${new Date().toLocaleDateString('fr-FR', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    })}
                </div>
                ${tableHTML}
            </body>
            </html>
        `;

        const blob = new Blob([htmlContent], { type: 'application/msword' });
        saveAs(blob, `${title}_${filteredData.length}_agents_${new Date().toISOString().split('T')[0]}.doc`);
        setFieldSelectionModal(false);
        setPendingExportAction(null);
    };

    // Fonction de rafraîchissement
    const handleRefresh = () => {
        if (apiEndpoint === 'agents') {
            loadHierarchicalData();
        } else {
            loadData();
        }
    };

    // Gestion des filtres
    const handleFilterChange = (filterName, value) => {
        setFilterValues(prev => ({
            ...prev,
            [filterName]: value
        }));
        
        // Exécuter la fonction onChange personnalisée si elle existe
        const filter = filters.find(f => f.name === filterName);
        if (filter && filter.onChange) {
            filter.onChange(value);
        }
    };

    // Initialiser les champs disponibles et sélectionnés
    useEffect(() => {
        const allFields = fields.filter(field => field.name !== 'id');
        setAvailableFields(allFields);
        setSelectedFields(allFields.map(field => field.name));
    }, [fields]);

    // Effet pour charger les données
    useEffect(() => {
        if (apiEndpoint === 'agents') {
            // Utiliser la fonction de chargement hiérarchique pour les agents
            loadHierarchicalData();
        } else {
            // Utiliser la fonction de chargement normale pour les autres endpoints
            loadData();
        }
    }, [apiEndpoint, filterValues, hierarchicalExcludeRetirementWithinYears]);

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ height: '70vh' }}>
                <Spinner color="primary" />
            </div>
        );
    }

    if (error) {
        return (
            <Alert color="danger">
                Erreur: {error}
            </Alert>
        );
    }

    return (
        <div className="reports-page">
            <div className="container-fluid">
                {topBanner}
                {/* En-tête */}
                <div className="page-header mb-4">
                    <Row className="align-items-center">
                    <Col>
                        <h1 className="page-title">{title}</h1>
                        {description && <p className="page-description">{description}</p>}
                        {currentMinistereNom && (
                            <p className="text-muted mb-0 mt-1" style={{ fontSize: '0.95rem' }}>
                                <strong>Ministère :</strong> {currentMinistereNom}
                                {isOrdreMTLApplicable() && (
                                    <span className="ms-2 badge bg-success">Ordre MTL appliqué</span>
                                )}
                            </p>
                        )}
                    </Col>
                    <Col className="text-end">
                        <Button
                            color="secondary"
                            outline
                            onClick={() => history.goBack()}
                            className="me-2"
                        >
                            <MdArrowBack className="me-1" />
                            Retour
                        </Button>
                        <Button 
                            color="primary" 
                            onClick={handleRefresh}
                            className="me-2"
                        >
                            <MdRefresh className="me-1" />
                            Actualiser
                        </Button>
                        <Button 
                            color="info" 
                            onClick={() => setFieldSelectionModal(true)}
                            className="me-2"
                            title="Sélectionner les champs à imprimer"
                        >
                            <MdSettings className="me-1" />
                            Champs
                        </Button>
                        <Dropdown isOpen={exportDropdownOpen} toggle={() => setExportDropdownOpen(!exportDropdownOpen)}>
                            <DropdownToggle color="success" caret>
                                <MdFileDownload className="me-1" />
                                Exporter
                            </DropdownToggle>
                            <DropdownMenu>
                                <DropdownItem onClick={handlePrint}>
                                    <MdPrint className="me-2" />
                                    Imprimer
                                </DropdownItem>
                                <DropdownItem onClick={handleExportExcel}>
                                    <MdTableChart className="me-2" />
                                    Excel (.xlsx)
                                </DropdownItem>
                                <DropdownItem onClick={handleExportExcelHierarchical}>
                                    <MdTableChart className="me-2" />
                                    Excel Hiérarchique (.xlsx)
                                </DropdownItem>
                                <DropdownItem onClick={handleExportPDF}>
                                    <MdPictureAsPdf className="me-2" />
                                    PDF (.pdf)
                                </DropdownItem>
                                <DropdownItem onClick={handleExportPDFHierarchical}>
                                    <MdPictureAsPdf className="me-2" />
                                    PDF Hiérarchique (.pdf)
                                </DropdownItem>
                                <DropdownItem onClick={handleExportWord}>
                                    <MdDescription className="me-2" />
                                    Word (.doc)
                                </DropdownItem>
                                <DropdownItem onClick={handleExportWordHierarchical}>
                                    <MdDescription className="me-2" />
                                    Word Hiérarchique (.doc)
                                </DropdownItem>
                            </DropdownMenu>
                        </Dropdown>
                    </Col>
                </Row>
            </div>

            {/* Filtres et recherche */}
            <Card className="mb-4">
                <CardHeader className="py-2 d-flex align-items-center justify-content-between flex-wrap gap-2">
                    <CardTitle tag="div" className="mb-0 d-flex align-items-center">
                        <MdFilterList className="me-2" />
                        Filtres et recherche
                    </CardTitle>
                    <Button
                        color="link"
                        size="sm"
                        className="p-0 text-decoration-none"
                        onClick={() => setFiltersExpanded(!filtersExpanded)}
                    >
                        {filtersExpanded ? 'Réduire les filtres' : 'Afficher les filtres'}
                    </Button>
                </CardHeader>
                <CardBody className="pt-2 pb-3">
                    <Row className="g-2 mb-2">
                        <Col xs={12} md={6} lg={4}>
                            <InputGroup size="sm">
                                <InputGroupAddon addonType="prepend">
                                    <InputGroupText>
                                        <MdSearch />
                                    </InputGroupText>
                                </InputGroupAddon>
                                <Input
                                    type="text"
                                    placeholder="Rechercher..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </InputGroup>
                        </Col>
                    </Row>
                    <Collapse isOpen={filtersExpanded}>
                        <Row className="g-2">
                            {filters.map((filter, index) => (
                                <Col xs={6} sm={6} md={4} lg={3} xl={2} key={index}>
                                    <FormGroup className="mb-0">
                                        <Label className="small mb-1">{filter.label}</Label>
                                        {filter.type === 'date' ? (
                                            <Input
                                                type="date"
                                                size="sm"
                                                value={filterValues[filter.name] || ''}
                                                onChange={(e) => handleFilterChange(filter.name, e.target.value)}
                                            />
                                        ) : (
                                            <Input
                                                type={filter.type || 'select'}
                                                size="sm"
                                                value={filterValues[filter.name] || ''}
                                                onChange={(e) => handleFilterChange(filter.name, e.target.value)}
                                            >
                                                {filter.options && filter.options.map((option, optIndex) => (
                                                    <option key={optIndex} value={option.value}>
                                                        {option.label}
                                                    </option>
                                                ))}
                                            </Input>
                                        )}
                                    </FormGroup>
                                </Col>
                            ))}
                        </Row>
                    </Collapse>
                </CardBody>
            </Card>

            {/* Tableau des données */}
            <Card>
                <CardHeader>
                    <Row className="align-items-center">
                        <Col>
                            <CardTitle>
                                Données ({filteredData.length} éléments)
                            </CardTitle>
                        </Col>
                        <Col className="text-end">
                            <FormGroupCheckbox className="mb-0">
                                <Label className="mb-0">
                                    <CustomInput
                                        type="checkbox"
                                        id="show-only-selected"
                                        checked={showOnlySelectedFields}
                                        onChange={(e) => setShowOnlySelectedFields(e.target.checked)}
                                    />
                                    Afficher seulement les champs sélectionnés pour l'impression
                                </Label>
                            </FormGroupCheckbox>
                        </Col>
                    </Row>
                </CardHeader>
                <CardBody style={{ padding: '15px', width: '100%', overflow: 'hidden' }}>
                    <div className="table-responsive" style={{ 
                        maxWidth: '100%', 
                        overflowX: 'scroll', 
                        overflowY: 'visible',
                        width: '100%',
                        display: 'block',
                        position: 'relative'
                    }}>
                        <Table 
                            hover 
                            id="report-table" 
                            className="table table-bordered table-striped"
                            style={{ 
                                width: '100%', 
                                tableLayout: 'auto',
                                borderCollapse: 'separate',
                                borderSpacing: 0,
                                display: 'table',
                                margin: 0,
                                minWidth: 'max-content'
                            }}
                        >
                            <thead style={{ backgroundColor: '#f8f9fa', position: 'sticky', top: 0, zIndex: 10 }}>
                                <tr>
                                    <th style={{ 
                                        whiteSpace: 'nowrap', 
                                        padding: '6px 4px',
                                        border: 'none',
                                        backgroundColor: '#f8f9fa',
                                        fontWeight: 'bold',
                                        textAlign: 'center',
                                        width: '32px',
                                        minWidth: '32px'
                                    }}>#</th>
                                    {getFieldsToDisplay().map((field, index) => (
                                        <th 
                                            key={index} 
                                            style={{ 
                                                whiteSpace: 'nowrap', 
                                                padding: '10px 8px',
                                                border: '1px solid #dee2e6',
                                                backgroundColor: '#f8f9fa',
                                                fontWeight: 'bold',
                                                textAlign: 'left',
                                                minWidth: '120px'
                                            }}
                                        >
                                            {field.label}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedData.map((item, index) => (
                                    <tr key={startIndex + index} style={{ borderBottom: '1px solid #dee2e6' }}>
                                        <td style={{ 
                                            whiteSpace: 'nowrap', 
                                            padding: '6px 4px',
                                            border: 'none',
                                            textAlign: 'center',
                                            backgroundColor: index % 2 === 0 ? '#fff' : '#f8f9fa',
                                            width: '32px',
                                            minWidth: '32px'
                                        }}>
                                            {startIndex + index + 1}
                                        </td>
                                        {getFieldsToDisplay().map((field, fieldIndex) => (
                                            <td 
                                                key={fieldIndex} 
                                                style={{ 
                                                    whiteSpace: 'normal', 
                                                    wordBreak: 'break-word', 
                                                    overflowWrap: 'break-word',
                                                    padding: '8px',
                                                    border: '1px solid #dee2e6',
                                                    verticalAlign: 'top',
                                                    backgroundColor: index % 2 === 0 ? '#fff' : '#f8f9fa',
                                                    maxWidth: '300px',
                                                    minWidth: '120px'
                                                }}
                                            >
                                                {formatFieldValue(item[field.name], field.name)}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </div>
                    {/* Pagination */}
                    {totalPages > 0 && (
                        <div className="d-flex justify-content-between align-items-center mt-3 flex-wrap gap-2" style={{ width: '100%' }}>
                            <div style={{ flexShrink: 0 }}>
                                <span className="text-muted">
                                    Affichage de {startIndex + 1} à {Math.min(endIndex, filteredData.length)} sur {filteredData.length} agent(s)
                                </span>
                            </div>
                            <div className="d-flex align-items-center gap-2 flex-wrap" style={{ 
                                flex: '1 1 auto', 
                                justifyContent: 'flex-end', 
                                minWidth: 0
                            }}>
                                <div style={{ 
                                    maxWidth: '100%', 
                                    overflowX: 'auto', 
                                    overflowY: 'hidden',
                                    WebkitOverflowScrolling: 'touch',
                                    flexShrink: 1,
                                    minWidth: 0
                                }}>
                                    <nav>
                                        <ul className="pagination pagination-sm mb-0" style={{ 
                                            margin: 0, 
                                            flexWrap: 'nowrap', 
                                            display: 'flex',
                                            width: 'max-content'
                                        }}>
                                            <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`} style={{ flexShrink: 0 }}>
                                                <button
                                                    className="page-link"
                                                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                                    disabled={currentPage === 1}
                                                >
                                                    Précédent
                                                </button>
                                            </li>
                                            
                                            {/* Affichage de toutes les pages */}
                                            {totalPages > 0 ? (
                                                Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                                    <li 
                                                        key={page} 
                                                        className={`page-item ${page === currentPage ? 'active' : ''}`} 
                                                        style={{ flexShrink: 0 }}
                                                    >
                                                        <button
                                                            className="page-link"
                                                            onClick={() => setCurrentPage(page)}
                                                            style={{ 
                                                                minWidth: '40px', 
                                                                cursor: 'pointer'
                                                            }}
                                                        >
                                                            {page}
                                                        </button>
                                                    </li>
                                                ))
                                            ) : (
                                                <li className="page-item active" style={{ flexShrink: 0 }}>
                                                    <span className="page-link">1</span>
                                                </li>
                                            )}
                                            
                                            <li className={`page-item ${currentPage === totalPages || totalPages === 0 ? 'disabled' : ''}`} style={{ flexShrink: 0 }}>
                                                <button
                                                    className="page-link"
                                                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                                    disabled={currentPage === totalPages || totalPages === 0}
                                                >
                                                    Suivant
                                                </button>
                                            </li>
                                        </ul>
                                    </nav>
                                </div>
                            </div>
                        </div>
                    )}
                </CardBody>
            </Card>

            {/* Modal de sélection des champs pour l'impression */}
            <Modal isOpen={fieldSelectionModal} toggle={() => setFieldSelectionModal(false)} size="lg">
                <ModalHeader toggle={() => setFieldSelectionModal(false)}>
                    <MdSettings className="me-2" />
                    {pendingExportAction === 'print' && 'Sélection des champs à imprimer'}
                    {pendingExportAction === 'excel' && 'Sélection des champs pour Excel'}
                    {pendingExportAction === 'pdf' && 'Sélection des champs pour PDF'}
                    {pendingExportAction === 'word' && 'Sélection des champs pour Word'}
                    {!pendingExportAction && 'Sélection des champs'}
                </ModalHeader>
                <ModalBody>
                    <Alert color="info" className="mb-3">
                        <strong>
                            {pendingExportAction === 'print' && 'Sélectionnez les champs que vous souhaitez inclure dans l\'impression :'}
                            {pendingExportAction === 'excel' && 'Sélectionnez les champs que vous souhaitez inclure dans l\'export Excel :'}
                            {pendingExportAction === 'pdf' && 'Sélectionnez les champs que vous souhaitez inclure dans l\'export PDF :'}
                            {pendingExportAction === 'word' && 'Sélectionnez les champs que vous souhaitez inclure dans l\'export Word :'}
                            {!pendingExportAction && 'Sélectionnez les champs que vous souhaitez afficher :'}
                        </strong>
                    </Alert>
                    
                    <Row>
                        <Col md={6}>
                            <FormGroupCheckbox>
                                <Label>
                                    <CustomInput
                                        type="checkbox"
                                        id="select-all"
                                        checked={selectedFields.length === availableFields.length}
                                        onChange={(e) => toggleAllFields(e.target.checked)}
                                    />
                                    <strong>Sélectionner tout</strong>
                                </Label>
                            </FormGroupCheckbox>
                        </Col>
                        <Col md={6} className="text-end">
                            <small className="text-muted">
                                {selectedFields.length} champ(s) sélectionné(s) sur {availableFields.length}
                            </small>
                        </Col>
                    </Row>

                    <hr />

                    <Row>
                        {availableFields.map((field, index) => (
                            <Col md={6} key={index}>
                                <FormGroupCheckbox>
                                    <Label>
                                        <CustomInput
                                            type="checkbox"
                                            id={`field-${field.name}`}
                                            checked={selectedFields.includes(field.name)}
                                            onChange={(e) => handleFieldSelection(field.name, e.target.checked)}
                                        />
                                        {field.label}
                                    </Label>
                                </FormGroupCheckbox>
                            </Col>
                        ))}
                    </Row>

                    {selectedFields.length === 0 && (
                        <Alert color="warning" className="mt-3">
                            <strong>Attention :</strong> Aucun champ n'est sélectionné. Veuillez sélectionner au moins un champ.
                        </Alert>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button 
                        color="success" 
                        onClick={() => {
                            setShowOnlySelectedFields(true);
                            setFieldSelectionModal(false);
                        }}
                        className="me-2"
                        disabled={selectedFields.length === 0}
                    >
                        <MdSettings className="me-1" />
                        Appliquer au tableau
                    </Button>
                    <Button 
                        color="primary" 
                        onClick={executePendingAction}
                        disabled={selectedFields.length === 0}
                        className="me-2"
                    >
                        {pendingExportAction === 'print' && <MdPrint className="me-1" />}
                        {pendingExportAction === 'excel' && <MdTableChart className="me-1" />}
                        {pendingExportAction === 'pdf' && <MdPictureAsPdf className="me-1" />}
                        {pendingExportAction === 'word' && <MdDescription className="me-1" />}
                        {pendingExportAction === 'print' && 'Continuer vers l\'impression'}
                        {pendingExportAction === 'excel' && 'Exporter en Excel'}
                        {pendingExportAction === 'pdf' && 'Exporter en PDF'}
                        {pendingExportAction === 'word' && 'Exporter en Word'}
                    </Button>
                    <Button color="secondary" onClick={() => setFieldSelectionModal(false)}>
                        Annuler
                    </Button>
                </ModalFooter>
            </Modal>

            {/* Modal d'impression */}
            <Modal isOpen={printModal} toggle={() => setPrintModal(false)} size="lg">
                <ModalHeader toggle={() => setPrintModal(false)}>
                    Aperçu avant impression
                </ModalHeader>
                <ModalBody>
                    <div className="print-preview">
                        <h2 style={{ textAlign: 'center' }}>{getDynamicTitle()}</h2>
                        <p style={{ textAlign: 'center' }}><strong>{printData.length} agent(s) trouvé(s)</strong></p>
                        <p style={{ textAlign: 'center' }}>Généré le {new Date().toLocaleDateString('fr-FR', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                        })}</p>
                        <Table hover>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    {getSelectedFieldsForDisplay().normalFields.map((field, index) => (
                                        <th key={index}>{field.label}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {printData.map((item, index) => (
                                    <tr key={index}>
                                        <td>{index + 1}</td>
                                        {getSelectedFieldsForDisplay().normalFields.map((field, fieldIndex) => (
                                            <td key={fieldIndex}>
                                                {formatFieldValue(item[field.name], field.name)}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button color="primary" onClick={() => window.print()}>
                        <MdPrint className="me-1" />
                        Imprimer
                    </Button>
                    <Button color="secondary" onClick={() => setPrintModal(false)}>
                        Fermer
                    </Button>
                </ModalFooter>
            </Modal>

            <style>{`
                .reports-page {
                    padding: 20px;
                    width: 100%;
                    max-width: 100%;
                    box-sizing: border-box;
                    overflow-x: hidden;
                }
                .reports-page .container-fluid {
                    width: 100%;
                    max-width: 100%;
                    padding-left: 15px;
                    padding-right: 15px;
                    box-sizing: border-box;
                    margin: 0 auto;
                }
                .page-title {
                    font-size: 2rem;
                    font-weight: 600;
                    color: #333;
                    margin-bottom: 0.5rem;
                }
                .page-description {
                    color: #666;
                    margin-bottom: 0;
                }
                .print-preview {
                    max-height: 70vh;
                    overflow-y: auto;
                }
                #report-table {
                    width: 100% !important;
                    table-layout: auto !important;
                    border-collapse: separate !important;
                    border-spacing: 0 !important;
                    display: table !important;
                    margin: 0 !important;
                    min-width: max-content !important;
                }
                #report-table thead {
                    display: table-header-group !important;
                }
                #report-table tbody {
                    display: table-row-group !important;
                }
                #report-table tr {
                    display: table-row !important;
                }
                #report-table th,
                #report-table td {
                    display: table-cell !important;
                    padding: 8px !important;
                    vertical-align: top !important;
                    border: 1px solid #dee2e6 !important;
                    box-sizing: border-box !important;
                }
                #report-table th {
                    background-color: #f8f9fa !important;
                    font-weight: bold !important;
                    position: sticky !important;
                    top: 0 !important;
                    z-index: 10 !important;
                }
                .table-responsive {
                    display: block !important;
                    width: 100% !important;
                    overflow-x: scroll !important;
                    -webkit-overflow-scrolling: touch !important;
                }
                .table-responsive::-webkit-scrollbar {
                    height: 12px;
                }
                .table-responsive::-webkit-scrollbar-track {
                    background: #f1f1f1;
                    border-radius: 6px;
                }
                .table-responsive::-webkit-scrollbar-thumb {
                    background: #888;
                    border-radius: 6px;
                }
                .table-responsive::-webkit-scrollbar-thumb:hover {
                    background: #555;
                }
                @media print {
                    .no-print {
                        display: none !important;
                    }
                    .table-responsive {
                        overflow-x: visible !important;
                    }
                }
            `}</style>
            </div>
        </div>
    );
};

export default ReportsPage;
