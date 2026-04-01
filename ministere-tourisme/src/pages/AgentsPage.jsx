import React, { useState, useEffect } from 'react';
import ManagementPage from 'components/ManagementPage';
import MultiStepForm from 'components/MultiStepForm';
import AgentDetails from 'components/AgentDetails';
import SuccessNotification from 'components/SuccessNotification';
import { MdPerson } from 'react-icons/md';
import { useLocation } from 'react-router-dom';

const AgentsPage = () => {
    const [showMultiStepForm, setShowMultiStepForm] = useState(false);
    const [showSuccessNotification, setShowSuccessNotification] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [editingAgent, setEditingAgent] = useState(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const location = useLocation();
    
    // Vérifier si on doit afficher un agent spécifique ou le modifier
    const urlParams = new URLSearchParams(location.search);
    const viewAgentId = urlParams.get('view');
    const editAgentId = urlParams.get('edit');

    // Écouter l'événement personnalisé pour modifier un agent
    useEffect(() => {
        const handleEditAgent = (event) => {
            const { agentId } = event.detail;
            console.log('🔍 Événement editAgent reçu pour agent ID:', agentId);
            loadAgentForEdit(agentId);
            // Le formulaire sera ouvert dans loadAgentForEdit après le chargement des données
        };

        window.addEventListener('editAgent', handleEditAgent);
        
        return () => {
            window.removeEventListener('editAgent', handleEditAgent);
        };
    }, []);

    // Log pour voir quand editingAgent change
    useEffect(() => {
        console.log('🔍 useEffect editingAgent - editingAgent a changé:', editingAgent);
        console.log('🔍 useEffect editingAgent - isEditMode:', isEditMode);
        console.log('🔍 useEffect editingAgent - showMultiStepForm:', showMultiStepForm);
    }, [editingAgent, isEditMode, showMultiStepForm]);

    // Configuration des étapes pour le formulaire multi-étapes
    const agentSteps = [
        {
            title: "Informations Personnelles",
            fields: [
                { name: 'id_civilite', label: 'Civilité', type: 'select', dynamicTable: 'civilites', dynamicField: 'libele', required: true, colSize: 4 },
                { name: 'nom', label: 'Nom', type: 'text', required: true, colSize: 4 },
                { name: 'prenom', label: 'Prénoms', type: 'text', required: true, colSize: 4 },
                { name: 'id_type_d_agent', label: 'Statut Agent', type: 'select', dynamicTable: 'type_d_agents', dynamicField: 'libele', required: true, colSize: 6 },
                { 
                    name: 'matricule', 
                    label: 'Matricule', 
                    type: 'text', 
                    required: false, 
                    colSize: 6, 
                    conditionalDisabled: { field: 'id_type_d_agent', notValue: 1 }, 
                    conditionalRequired: { field: 'id_type_d_agent', value: 1 },
                    placeholder: 'Saisir le matricule', 
                    disabledPlaceholder: 'Généré automatiquement (ex: A000101)' 
                },
                { name: 'date_de_naissance', label: 'Date de naissance', type: 'date', required: true, colSize: 6 },
                { name: 'lieu_de_naissance', label: 'Lieu de naissance', type: 'text', required: true, colSize: 6 },
                { name: 'sexe', label: 'Sexe', type: 'select', options: ['M', 'F'], required: true, colSize: 6 },
                { name: 'id_nationalite', label: 'Nationalité', type: 'select', dynamicTable: 'nationalites', dynamicField: 'libele', required: true, colSize: 6 },
                { name: 'id_pays', label: 'Pays', type: 'select', dynamicTable: 'pays', dynamicField: 'libele', required: true, colSize: 6 },
                { name: 'numero_cnps', label: 'Numéro CNPS', type: 'text', required: false, colSize: 6, conditional: { field: 'id_type_d_agent', notValue: 1 } },
                { name: 'date_declaration_cnps', label: 'Date de déclaration CNPS', type: 'date', required: false, colSize: 6, conditional: { field: 'id_type_d_agent', notValue: 1 } },
                { name: 'date_embauche', label: 'Date de première prise de service', type: 'date', required: true, colSize: 4 },
                { name: 'date_prise_service_au_ministere', label: 'Date de prise de service au ministère', type: 'date', required: true, colSize: 4 },
                { name: 'date_prise_service_dans_la_direction', label: 'Date de prise de service dans la direction', type: 'date', colSize: 4 }
            ]
        },
        {
            title: "Informations Familiales",
            fields: [
                { name: 'nom_de_la_mere', label: 'Nom de la mère', type: 'text', required: true, colSize: 6 },
                { name: 'nom_du_pere', label: 'Nom du père', type: 'text', required: true, colSize: 6 },
                { name: 'id_situation_matrimoniale', label: 'Situation matrimoniale', type: 'select', required: true, options: [
                  { id: 1, label: 'Célibataire' },
                  { id: 2, label: 'Marié(e)' },
                  { id: 3, label: 'Divorcé(e)' },
                  { id: 4, label: 'Veuf/Veuve' }
              ], colSize: 6 },
                { name: 'date_mariage', label: 'Date de mariage', type: 'date', colSize: 6, conditional: { field: 'id_situation_matrimoniale', value: 2 }, conditionalRequired: { field: 'id_situation_matrimoniale', value: 2 } },
                { name: 'numero_et_date_acte_mariage', label: 'Numéro et date de l\'acte de mariage', type: 'acte_mariage_composite', colSize: 12, conditional: { field: 'id_situation_matrimoniale', value: 2 }, conditionalRequired: { field: 'id_situation_matrimoniale', value: 2 }, helpText: 'Numéro : 5 chiffres maximum. Date : sélectionnez avec le calendrier' },
                { name: 'nom_conjointe', label: 'Nom Conjoint(e)', type: 'text', colSize: 6, conditional: { field: 'id_situation_matrimoniale', value: 2 } },
                { name: 'nombre_enfant', label: 'Nombre d\'enfants', type: 'number', min: 0, colSize: 6 },
                { name: 'enfants', label: 'Enfants', type: 'children', conditional: { field: 'nombre_enfant', min: 1 }, colSize: 12 }
            ]
        },
        {
            title: "Contact et Adresses",
            fields: [
                { name: 'telephone1', label: 'Téléphone principal', type: 'tel', required: true, colSize: 6 },
                { name: 'telephone2', label: 'Numéro d\'urgence 1', type: 'tel', required: true, colSize: 6 },
                { name: 'telephone3', label: 'Numéro d\'urgence 2', type: 'tel', required: false, colSize: 6 },
                { name: 'email', label: 'Email', type: 'email', required: false, colSize: 6 },
                { name: 'ad_pro_rue', label: 'Adresse professionnelle - Adresse', type: 'text', required: false, colSize: 12 },
                { name: 'ad_pro_ville', label: 'Adresse professionnelle - Ville', type: 'text', required: true, colSize: 6 },
                { name: 'ad_pro_batiment', label: 'Adresse professionnelle - Commune', type: 'text', required: true, colSize: 6 }
            ]
        },
        {
            title: "Informations Professionnelles",
            fields: [
                { name: 'id_position', label: 'Position', type: 'select', dynamicTable: 'positions', dynamicField: 'libele', colSize: 6, defaultValue: 'PRESENT', defaultLabel: 'Présent' },
                { name: 'id_direction_generale', label: 'Direction Générale', type: 'select', dynamicTable: 'directions-generales', dynamicField: 'libelle', colSize: 6, required: false },
                { name: 'id_direction', label: 'Direction', type: 'select', dynamicTable: 'directions', dynamicField: 'libelle', required: false, colSize: 6, cascadeTrigger: true, conditionalRequired: { field: 'id_direction_generale', isEmpty: true }, helpText: 'Obligatoire si aucune Direction Générale n\'est sélectionnée', dependsOn: 'id_direction_generale' },
                { name: 'id_sous_direction', label: 'Sous-direction', type: 'select', dynamicTable: 'sous_directions', dynamicField: 'libelle', colSize: 6, cascadeTrigger: true, dependsOn: 'id_direction' },
                { name: 'service_id', label: 'Service', type: 'select', dynamicTable: 'services', dynamicField: 'libelle', colSize: 6, dependsOn: ['id_sous_direction', 'id_direction'], cascadeTrigger: true },
                { name: 'statut_emploi', label: 'Statut emploi', type: 'select', options: ['actif', 'inactif', 'retraite', 'demission', 'licencie'], defaultValue: 'actif', colSize: 6 },
                { name: 'date_retraite', label: 'Date de retraite', type: 'date', colSize: 6, disabledInCreate: true, disabledPlaceholder: 'Calculée automatiquement' },
                { name: 'situation_militaire', label: 'Situation militaire', type: 'select', options: ['Exempté', 'Réformé', 'Bon pour le service', 'Dispensé', 'Non concerné'], colSize: 6 },
                { name: 'id_mode_entree', label: 'Mode d\'entrée', type: 'select', dynamicTable: 'mode_d_entrees', dynamicField: 'libele', colSize: 6 },
                { name: 'id_emploi', label: 'Emploi', type: 'select', dynamicTable: 'emplois', dynamicField: 'libele', colSize: 6, conditional: { field: 'id_type_d_agent', value: 1 }, conditionalRequired: { field: 'id_type_d_agent', value: 1 }, helpText: 'Réservé aux agents fonctionnaires' },
                { name: 'id_fonction', label: 'Fonction', type: 'select', dynamicTable: 'fonctions', dynamicField: 'libele', colSize: 6, required: true }
            ]
        },
        {
            title: "Carrière et Grade",
            fields: [
                { 
                    name: 'id_categorie', 
                    label: 'Catégorie', 
                    type: 'select', 
                    dynamicTable: 'categories', 
                    dynamicField: 'libele', 
                    colSize: 6, 
                    conditionalMultiple: [
                        { field: 'id_type_d_agent', value: 1 },
                        { field: 'corps_prefectoral', isEmpty: true }
                    ],
                    conditionalRequired: { field: 'id_type_d_agent', value: 1 } 
                },
                { 
                    name: 'id_grade', 
                    label: 'Grade', 
                    type: 'select', 
                    dynamicTable: 'grades', 
                    dynamicField: 'libele', 
                    colSize: 6, 
                    conditionalMultiple: [
                        { field: 'id_type_d_agent', value: 1 },
                        { field: 'corps_prefectoral', isEmpty: true }
                    ],
                    conditionalRequired: { field: 'id_type_d_agent', value: 1 } 
                },
                { 
                    name: 'id_echelon', 
                    label: 'Échelon', 
                    type: 'select', 
                    dynamicTable: 'echelons', 
                    dynamicField: 'libele', 
                    colSize: 6, 
                    conditionalMultiple: [
                        { field: 'id_type_d_agent', value: 1 },
                        { field: 'corps_prefectoral', isEmpty: true }
                    ]
                },
                { 
                    name: 'corps_prefectoral', 
                    label: 'Corps Préfectoral', 
                    type: 'select', 
                    options: [
                        { id: 'prefet_hors_grade', label: 'Préfet hors grade', grade: 'HG', grade_label: 'Hors grade (HG)' },
                        { id: 'prefet', label: 'Préfet', grade: 'GI', grade_label: 'Grade I (GI)' },
                        { id: 'secretaire_general', label: 'Secrétaire général de préfecture', grade: 'GII', grade_label: 'Grade II (GII)' },
                        { id: 'sous_prefet', label: 'Sous-préfet', grade: 'GIII', grade_label: 'Grade III (GIII)' }
                    ], 
                    colSize: 6,
                    conditional: { field: 'id_type_d_agent', value: 1 }
                },
                { 
                    name: 'grade_prefectoral', 
                    label: 'Grade Préfectoral', 
                    type: 'select', 
                    dynamicTable: 'grades',
                    dynamicField: 'libele',
                    dynamicFilter: { is_prefectoral: true },
                    colSize: 6,
                    conditional: { field: 'corps_prefectoral', notEmpty: true },
                    readOnly: true,
                    disabled: true,
                    placeholder: 'Sélectionné automatiquement'
                },
                { 
                    name: 'echelon_prefectoral', 
                    label: 'Échelon Préfectoral', 
                    type: 'select', 
                    dynamicTable: 'echelons',
                    dynamicField: 'libele',
                    dynamicFilter: { is_prefectoral: true },
                    colSize: 6,
                    conditional: { field: 'corps_prefectoral', notEmpty: true }
                }
            ]
        },
        {
            title: "Formation et Compétences",
            fields: [
                { name: 'id_niveau_informatique', label: 'Niveau informatique', type: 'select', dynamicTable: 'niveau_informatiques', dynamicField: 'libele', colSize: 6 },
                { name: 'agent_langues', label: 'Langues', type: 'agent_langues', colSize: 12 },
                { name: 'agent_logiciels', label: 'Logiciels', type: 'agent_logiciels', colSize: 12 }
            ]
        },
        {
            title: "Santé et Handicaps",
            fields: [
                { name: 'id_handicap', label: 'Handicap', type: 'select', dynamicTable: 'handicaps', dynamicField: 'libele', required: true, colSize: 12 }
            ]
        },
        {
            title: "Documents et Photos",
            fields: [
                { name: 'photo_profil', label: 'Photo de profil', type: 'file', accept: 'image/*', colSize: 12, required: false },
                { name: 'nombre_diplomes', label: 'Nombre de diplômes', type: 'number', min: 0, max: 10, defaultValue: 0, colSize: 6 },
                { name: 'diplomes', label: 'Diplômes', type: 'diplomes', conditional: { field: 'nombre_diplomes', min: 1 }, colSize: 12, firstRequired: true },
                { name: 'documents', label: 'Documents', type: 'dynamic_documents', colSize: 12 }
            ]
        },
    ];

    // Champs pour l'affichage dans le tableau (version simplifiée)
    const displayFields = [
        { name: 'matricule', label: 'Matricule', type: 'text', readOnly: true },
        { 
            name: 'nom_complet', 
            label: 'Nom et Prénoms', 
            type: 'custom', 
            readOnly: true,
            render: (agent) => `${agent.nom || ''} ${agent.prenom || ''}`.trim() || '-'
        },
        { name: 'emploi_actuel_libele', label: 'Emploi', type: 'text', readOnly: true },
        { name: 'fonction_actuelle_libele', label: 'Fonction', type: 'text', readOnly: true },
        { name: 'type_agent_libele', label: 'Statut agent', type: 'text', readOnly: true }
    ];

    const searchFields = ['nom', 'prenom', 'matricule', 'email'];

    const breadcrumbs = [
        { name: 'Dashboard', active: false, link: '/' },
        { name: 'Gestion du Personnel', active: false },
        { name: 'Agents', active: true }
    ];

    // Effet pour gérer l'affichage d'un agent spécifique
    useEffect(() => {
        if (viewAgentId) {
            // Faire défiler vers le haut de la page
            window.scrollTo(0, 0);
            
            // Optionnel: ajouter un indicateur visuel ou un message
            console.log(`Affichage de l'agent avec l'ID: ${viewAgentId}`);
        }
    }, [viewAgentId]);

    const handleAgentSubmit = async (formData) => {
        try {
            // Log du formData reçu depuis MultiStepForm
            console.log('🔍 AgentsPage - handleAgentSubmit - formData reçu depuis MultiStepForm:', {
                hasIdSousDirection: 'id_sous_direction' in formData,
                idSousDirectionValue: formData.id_sous_direction,
                idSousDirectionType: typeof formData.id_sous_direction,
                formDataKeys: Object.keys(formData),
                formDataSample: {
                    id: formData.id,
                    id_direction: formData.id_direction,
                    id_sous_direction: formData.id_sous_direction,
                    service_id: formData.service_id
                },
                formDataComplete: formData
            });
            
            // PRESERVER id_sous_direction AVANT déstructuration pour éviter toute perte
            const preservedIdSousDirection = formData.id_sous_direction !== undefined ? formData.id_sous_direction : null;
            console.log('🔍 AgentsPage - Valeur préservée AVANT déstructuration:', {
                preservedIdSousDirection,
                preservedType: typeof preservedIdSousDirection,
                inFormData: 'id_sous_direction' in formData,
                formDataValue: formData.id_sous_direction
            });
            
            // Séparer les données de l'agent et des enfants
            // IMPORTANT: Préserver nombre_enfant AVANT la déstructuration
            const nombre_enfant = formData.nombre_enfant;
            const { enfants, nombre_enfant: _nombre_enfant, ...agentData } = formData;
            
            // Réinsérer nombre_enfant dans agentData pour qu'il soit traité
            if (nombre_enfant !== undefined) {
                agentData.nombre_enfant = nombre_enfant;
            }
            
            // Log des enfants reçus depuis MultiStepForm
            console.log('🔍 AgentsPage - handleAgentSubmit - Enfants reçus depuis MultiStepForm:', {
                enfants,
                enfantsType: typeof enfants,
                isArray: Array.isArray(enfants),
                enfantsLength: Array.isArray(enfants) ? enfants.length : 0,
                nombre_enfant: nombre_enfant,
                nombre_enfantInAgentData: agentData.nombre_enfant,
                enfantsContent: enfants
            });
            
            // Extraire le numéro et la date de l'acte de mariage (format objet)
            if (agentData.numero_et_date_acte_mariage && typeof agentData.numero_et_date_acte_mariage === 'object') {
                const acteValue = agentData.numero_et_date_acte_mariage;
                agentData.numero_acte_mariage = acteValue.numero || null;
                // La date est déjà au format AAAA-MM-JJ depuis l'input date
                agentData.date_delivrance_acte_mariage = acteValue.date || null;
                console.log('✅ Acte de mariage extrait:', {
                    numero: agentData.numero_acte_mariage,
                    date: agentData.date_delivrance_acte_mariage
                });
                // Supprimer le champ combiné
                delete agentData.numero_et_date_acte_mariage;
            }
            
            // Log après déstructuration
            console.log('🔍 AgentsPage - handleAgentSubmit - agentData APRÈS déstructuration:', {
                hasIdSousDirection: 'id_sous_direction' in agentData,
                idSousDirectionValue: agentData.id_sous_direction,
                idSousDirectionType: typeof agentData.id_sous_direction,
                agentDataKeys: Object.keys(agentData),
                agentDataIdSousDirectionDirect: agentData.id_sous_direction,
                formDataIdSousDirectionDirect: formData.id_sous_direction
            });
            
            // Utiliser la valeur préservée AVANT déstructuration comme source de vérité
            const originalIdSousDirection = preservedIdSousDirection !== undefined && preservedIdSousDirection !== null ? preservedIdSousDirection : (agentData.id_sous_direction !== undefined ? agentData.id_sous_direction : null);
            console.log('🔍 AgentsPage - Valeur finale à utiliser pour id_sous_direction:', {
                preservedIdSousDirection,
                agentDataIdSousDirection: agentData.id_sous_direction,
                originalIdSousDirection,
                originalType: typeof originalIdSousDirection,
                inFormData: 'id_sous_direction' in formData,
                inAgentData: 'id_sous_direction' in agentData
            });
            
            // Liste des champs numériques qui doivent toujours être envoyés, même s'ils sont null ou vides
            const numericFields = ['id_direction_generale', 'id_direction', 'id_sous_direction', 'sous_direction_id', 'service_id', 'id_service', 
                                   'id_pays', 'id_civilite', 'id_nationalite', 'id_type_d_agent', 'id_situation_matrimoniale',
                                   'id_ministere', 'id_entite_principale', 'id_grade', 'id_categorie', 'id_echelon',
                                   'id_position', 'id_handicap', 'id_mode_entree', 'echelon_prefectoral', 'id_fonction', 'id_emploi'];
            
            // Liste des champs du corps préfectoral qui doivent toujours être envoyés
            const prefectoralFields = ['corps_prefectoral', 'grade_prefectoral', 'echelon_prefectoral'];
            
            // Convertir les chaînes vides en null pour les champs numériques
            numericFields.forEach(field => {
                // Si la valeur arrive sous forme de tableau (ex: ["1","1"]), prendre le premier élément
                if (Array.isArray(agentData[field])) {
                    const firstVal = agentData[field][0];
                    agentData[field] = firstVal !== undefined ? firstVal : null;
                    console.log(`🔧 AgentsPage - Normalisation tableau -> scalaire pour ${field}:`, agentData[field]);
                }

                if (agentData[field] === '' || agentData[field] === 'undefined' || agentData[field] === 'null') {
                    // Ne pas écraser id_sous_direction si on a une valeur valide préservée
                    if (field === 'id_sous_direction' && originalIdSousDirection !== null && originalIdSousDirection !== undefined && originalIdSousDirection !== '') {
                        console.log(`⚠️ AgentsPage - Préserver id_sous_direction: ${agentData[field]} -> ${originalIdSousDirection}`);
                        agentData[field] = originalIdSousDirection;
                    } else {
                        agentData[field] = null;
                    }
                }
                // Normaliser aussi les variantes de noms de champs
                if (field === 'id_sous_direction' && agentData['sous_direction_id'] !== undefined) {
                    // Utiliser sous_direction_id seulement si id_sous_direction n'existe pas ou est vide
                    if (!agentData[field] || agentData[field] === null || agentData[field] === '' || agentData[field] === undefined) {
                        agentData[field] = agentData['sous_direction_id'] === '' ? null : agentData['sous_direction_id'];
                        console.log(`🔍 AgentsPage - id_sous_direction mappé depuis sous_direction_id: ${agentData[field]}`);
                    }
                    // Supprimer la variante pour éviter la confusion
                    delete agentData['sous_direction_id'];
                }
                if (field === 'service_id' && agentData['id_service'] !== undefined) {
                    agentData[field] = agentData['id_service'] === '' ? null : agentData['id_service'];
                    // Ne pas supprimer id_service car le backend peut l'utiliser aussi
                }
                // S'assurer que les champs numériques importants sont toujours présents (même null)
                if (field === 'id_sous_direction' && !(field in agentData)) {
                    // Utiliser la valeur préservée si elle existe
                    agentData[field] = originalIdSousDirection !== undefined ? originalIdSousDirection : null;
                    console.log(`⚠️ Champ ${field} manquant, initialisé avec valeur préservée: ${agentData[field]}`);
                }
            });
            
            // S'assurer que id_sous_direction est TOUJOURS présent dans agentData avec la bonne valeur
            // FORCER l'utilisation de la valeur préservée si elle existe et est valide
            if (originalIdSousDirection !== null && originalIdSousDirection !== undefined && originalIdSousDirection !== '' && originalIdSousDirection !== 'null' && originalIdSousDirection !== 'undefined') {
                // FORCER l'utilisation de la valeur préservée, même si agentData.id_sous_direction existe
                // Car elle pourrait avoir été écrasée incorrectement
                const shouldRestore = !agentData.id_sous_direction || 
                                     agentData.id_sous_direction === null || 
                                     agentData.id_sous_direction === '' || 
                                     agentData.id_sous_direction === undefined ||
                                     agentData.id_sous_direction !== originalIdSousDirection;
                
                if (shouldRestore) {
                    agentData.id_sous_direction = originalIdSousDirection;
                    console.log(`✅ AgentsPage - id_sous_direction FORCÉ avec valeur préservée: ${originalIdSousDirection} (était: ${agentData.id_sous_direction === originalIdSousDirection ? 'identique' : agentData.id_sous_direction})`);
                }
            } else if (!('id_sous_direction' in agentData) || agentData.id_sous_direction === null || agentData.id_sous_direction === undefined || agentData.id_sous_direction === '') {
                agentData.id_sous_direction = null;
                console.log('⚠️ AgentsPage - id_sous_direction n\'a pas de valeur valide, initialisé à null');
            }
            
            // Normaliser id_sous_direction : convertir les chaînes vides, 'null', 'undefined' en null
            // MAIS préserver les valeurs numériques valides
            if (agentData.id_sous_direction === '' || agentData.id_sous_direction === 'null' || agentData.id_sous_direction === 'undefined') {
                // Ne pas mettre null si on a une valeur préservée valide
                if (originalIdSousDirection !== null && originalIdSousDirection !== undefined && originalIdSousDirection !== '' && originalIdSousDirection !== 'null' && originalIdSousDirection !== 'undefined') {
                    agentData.id_sous_direction = originalIdSousDirection;
                    console.log(`✅ AgentsPage - id_sous_direction restauré depuis valeur préservée (était vide/null): ${originalIdSousDirection}`);
                } else {
                    agentData.id_sous_direction = null;
                }
            }
            // Convertir en nombre si c'est une chaîne numérique valide
            else if (typeof agentData.id_sous_direction === 'string' && !isNaN(agentData.id_sous_direction) && agentData.id_sous_direction.trim() !== '') {
                agentData.id_sous_direction = Number(agentData.id_sous_direction);
            }
            // S'assurer que c'est un nombre si c'était un nombre dans formData
            else if (originalIdSousDirection !== null && originalIdSousDirection !== undefined && originalIdSousDirection !== '' && typeof originalIdSousDirection === 'number') {
                agentData.id_sous_direction = originalIdSousDirection;
                console.log(`✅ AgentsPage - id_sous_direction restauré comme nombre depuis valeur préservée: ${originalIdSousDirection}`);
            }
            
            // DERNIÈRE VÉRIFICATION FINALE : FORCER l'utilisation de la valeur préservée si elle est valide
            // Peu importe ce qui s'est passé avant, on utilise la valeur préservée depuis formData
            if (preservedIdSousDirection !== null && preservedIdSousDirection !== undefined && preservedIdSousDirection !== '' && preservedIdSousDirection !== 'null' && preservedIdSousDirection !== 'undefined') {
                // FORCER l'utilisation de la valeur préservée depuis formData
                agentData.id_sous_direction = preservedIdSousDirection;
                console.log(`✅ AgentsPage - DERNIÈRE VÉRIFICATION FINALE: id_sous_direction FORCÉ avec valeur préservée: ${preservedIdSousDirection} (était: ${agentData.id_sous_direction === preservedIdSousDirection ? 'identique' : agentData.id_sous_direction})`);
            } else if (originalIdSousDirection !== null && originalIdSousDirection !== undefined && originalIdSousDirection !== '' && originalIdSousDirection !== 'null' && originalIdSousDirection !== 'undefined') {
                // Si preservedIdSousDirection n'est pas valide, utiliser originalIdSousDirection
                if (agentData.id_sous_direction !== originalIdSousDirection) {
                    console.log(`⚠️ AgentsPage - DERNIÈRE VÉRIFICATION: id_sous_direction diffère ! Restauration de ${agentData.id_sous_direction} -> ${originalIdSousDirection}`);
                    agentData.id_sous_direction = originalIdSousDirection;
                }
            }
            
            // Log des champs numériques importants avant envoi
            console.log('🔍 AgentsPage - Champs numériques avant envoi:', {
                id_direction: agentData.id_direction,
                id_sous_direction: agentData.id_sous_direction,
                id_sous_direction_type: typeof agentData.id_sous_direction,
                originalIdSousDirection: originalIdSousDirection,
                originalIdSousDirectionType: typeof originalIdSousDirection,
                valuesMatch: agentData.id_sous_direction === originalIdSousDirection,
                service_id: agentData.service_id,
                allFormDataKeys: Object.keys(formData),
                agentDataKeys: Object.keys(agentData)
            });
            
            // Conserver une copie des données originales avec les fichiers
            const originalDocuments = agentData.documents;
            
            const url = isEditMode ? `https://tourisme.2ise-groupe.com/api/agents/${editingAgent.id}` : 'https://tourisme.2ise-groupe.com/api/agents';
            const method = isEditMode ? 'PUT' : 'POST';
            
            // Vérifier s'il y a des fichiers à envoyer
            const hasFiles = agentData.photo_profil || 
                           (agentData.diplomes && agentData.diplomes.length > 0) ||
                           (agentData.documents && agentData.documents.some(doc => doc.file));
            
            let response;
            
            if (hasFiles) {
                // Utiliser FormData pour les fichiers
                const formDataToSend = new FormData();
                
                // Log des champs numériques importants avant d'ajouter au FormData
                console.log('🔍 AgentsPage - État de agentData AVANT ajout au FormData:', {
                    hasIdSousDirection: 'id_sous_direction' in agentData,
                    idSousDirectionValue: agentData.id_sous_direction,
                    idSousDirectionType: typeof agentData.id_sous_direction,
                    allAgentDataKeys: Object.keys(agentData),
                    numericFieldsInAgentData: numericFields.filter(f => f in agentData).map(f => ({
                        field: f,
                        value: agentData[f],
                        type: typeof agentData[f]
                    }))
                });
                
                // Ajouter toutes les données de l'agent
                // IMPORTANT: enfants et nombre_enfant sont gérés plus bas (pour éviter les doublons dans FormData)
                Object.keys(agentData).forEach(key => {
                    if (key === 'enfants' || key === 'nombre_enfant') {
                        return;
                    }
                    if (key === 'diplomes' && Array.isArray(agentData[key])) {
                        // Convertir l'année en entier pour chaque diplôme
                        const diplomesWithYear = agentData[key].map(diplome => {
                            if (diplome.date_diplome) {
                                const year = diplome.date_diplome.toString().trim();
                                // Si c'est une année (4 chiffres), convertir en entier
                                if (/^\d{4}$/.test(year)) {
                                    return {
                                        ...diplome,
                                        date_diplome: parseInt(year, 10)
                                    };
                                }
                                // Si c'est une date, extraire l'année
                                try {
                                    const date = new Date(diplome.date_diplome);
                                    if (!isNaN(date.getTime())) {
                                        return {
                                            ...diplome,
                                            date_diplome: date.getFullYear()
                                        };
                                    }
                                } catch (error) {
                                    // Ignorer les erreurs de conversion
                                }
                            }
                            return diplome;
                        });
                        formDataToSend.append(key, JSON.stringify(diplomesWithYear));
                    } else if (key === 'documents' && Array.isArray(agentData[key])) {
                        console.log(`🔍 AgentsPage - Préparation des documents:`, agentData[key]);
                        
                        // Séparer les fichiers des données pour éviter la perte lors de JSON.stringify
                        const documentsForSerialization = agentData[key].map(doc => {
                            const { file, ...docWithoutFile } = doc;
                            console.log(`   Document "${doc.name}":`, {
                                ...docWithoutFile,
                                hasFile: !!file,
                                fileType: file ? typeof file : 'null',
                                fileInstanceOfFile: file instanceof File
                            });
                            return docWithoutFile;
                        });
                        
                        formDataToSend.append(key, JSON.stringify(documentsForSerialization));
                        console.log(`📄 Documents dynamiques sérialisés (sans fichiers):`, JSON.stringify(documentsForSerialization));
                    } else if ((key === 'agent_langues' || key === 'agent_logiciels') && Array.isArray(agentData[key])) {
                        // Sérialiser correctement les langues et logiciels
                        console.log(`🔍 AgentsPage - Sérialisation de ${key}:`, agentData[key]);
                        formDataToSend.append(key, JSON.stringify(agentData[key]));
                        console.log(`🔍 AgentsPage - ${key} sérialisé:`, JSON.stringify(agentData[key]));
                    } else if (numericFields.includes(key)) {
                        // Traitement des champs numériques
                        // IMPORTANT: Ne PAS envoyer les champs null/vides dans FormData
                        // car PostgreSQL ne peut pas convertir "" en integer
                        // Le backend utilisera null par défaut pour les champs non fournis
                        console.log(`🔍 AgentsPage - Traitement champ numérique ${key}:`, {
                            valueInAgentData: agentData[key],
                            type: typeof agentData[key],
                            isNull: agentData[key] === null,
                            isUndefined: agentData[key] === undefined,
                            keyInAgentData: key in agentData
                        });
                        
                        // Si la valeur est null/undefined/vide, NE PAS l'ajouter au FormData
                        // Cela évite l'erreur PostgreSQL "invalid input syntax for integer: """
                        if (agentData[key] === null || agentData[key] === undefined || agentData[key] === '' || agentData[key] === 'null' || agentData[key] === 'undefined') {
                            console.log(`⏭️ AgentsPage - Champ numérique ${key} omis du FormData (null/vide)`);
                            return; // Sortir de cette itération sans ajouter le champ
                        }
                        
                        // Convertir les valeurs numériques valides en string pour FormData
                        let value;
                        if (typeof agentData[key] === 'number') {
                            value = String(agentData[key]);
                        } else if (typeof agentData[key] === 'string' && !isNaN(agentData[key]) && agentData[key].trim() !== '') {
                            value = agentData[key].trim();
                        } else {
                            // Si ce n'est ni un nombre ni une chaîne numérique valide, omettre
                            console.log(`⏭️ AgentsPage - Champ numérique ${key} omis du FormData (valeur invalide: ${agentData[key]})`);
                            return;
                        }
                        
                        formDataToSend.append(key, value);
                        console.log(`✅ AgentsPage - Champ numérique ${key} ajouté au FormData:`, value, `(type: ${typeof value})`);
                    } else if (prefectoralFields.includes(key)) {
                        // Traitement des champs du corps préfectoral
                        // Pour grade_prefectoral et echelon_prefectoral (IDs numériques), 
                        // ne PAS envoyer s'ils sont null/vides pour éviter l'erreur PostgreSQL
                        if (agentData[key] === null || agentData[key] === undefined || agentData[key] === '' || agentData[key] === 'null' || agentData[key] === 'undefined') {
                            console.log(`⏭️ AgentsPage - Champ préfectoral ${key} omis du FormData (null/vide)`);
                            return; // Sortir de cette itération sans ajouter le champ
                        }
                        
                        const value = String(agentData[key]);
                        formDataToSend.append(key, value);
                        console.log(`✅ AgentsPage - Champ préfectoral ${key} ajouté au FormData:`, value);
                    } else if (agentData[key] !== null && agentData[key] !== undefined) {
                        formDataToSend.append(key, agentData[key]);
                    }
                });
                
                // Vérification finale et correction pour id_sous_direction
                // S'assurer que id_sous_direction est bien dans le FormData avec la bonne valeur
                const sousDirectionValueInAgentData = agentData.id_sous_direction;
                
                // Forcer l'ajout/mise à jour de id_sous_direction après la boucle
                // pour garantir qu'il est toujours présent avec la bonne valeur
                const correctSousDirectionValue = (sousDirectionValueInAgentData === null || 
                                                   sousDirectionValueInAgentData === undefined || 
                                                   sousDirectionValueInAgentData === '') 
                    ? '' 
                    : String(sousDirectionValueInAgentData);
                
                // Utiliser set() si disponible (remplace la valeur existante), sinon delete + append
                if (typeof formDataToSend.set === 'function') {
                    formDataToSend.set('id_sous_direction', correctSousDirectionValue);
                    console.log(`✅ AgentsPage - id_sous_direction MIS À JOUR dans FormData avec set(): ${correctSousDirectionValue || 'null (chaîne vide)'}`);
                } else {
                    // Supprimer toutes les occurrences de id_sous_direction
                    // Note: FormData.delete() supprime toutes les valeurs pour cette clé
                    if (formDataToSend.has('id_sous_direction')) {
                        formDataToSend.delete('id_sous_direction');
                    }
                    // Ajouter la bonne valeur
                    formDataToSend.append('id_sous_direction', correctSousDirectionValue);
                    console.log(`✅ AgentsPage - id_sous_direction FORCÉ dans FormData avec append(): ${correctSousDirectionValue || 'null (chaîne vide)'}`);
                }
                
                // Vérification finale
                const finalCheck = formDataToSend.has('id_sous_direction');
                const finalValue = finalCheck ? formDataToSend.get('id_sous_direction') : null;
                console.log('🔍 AgentsPage - Vérification FINALE id_sous_direction dans FormData:', {
                    inFormData: finalCheck,
                    valueInFormData: finalValue,
                    valueInAgentData: sousDirectionValueInAgentData,
                    valuesMatch: String(finalValue) === correctSousDirectionValue
                });
                
                // Forcer id_direction et id_direction_generale dans FormData quand ils sont vides ("Aucune"),
                // sinon le backend ne les reçoit pas et ne met pas à jour la base (l'ancienne valeur reste).
                const directionGeneraleValue = (agentData.id_direction_generale === null || agentData.id_direction_generale === undefined || agentData.id_direction_generale === '')
                    ? '' : String(agentData.id_direction_generale);
                const directionValue = (agentData.id_direction === null || agentData.id_direction === undefined || agentData.id_direction === '')
                    ? '' : String(agentData.id_direction);
                if (typeof formDataToSend.set === 'function') {
                    formDataToSend.set('id_direction_generale', directionGeneraleValue);
                    formDataToSend.set('id_direction', directionValue);
                } else {
                    if (formDataToSend.has('id_direction_generale')) formDataToSend.delete('id_direction_generale');
                    if (formDataToSend.has('id_direction')) formDataToSend.delete('id_direction');
                    formDataToSend.append('id_direction_generale', directionGeneraleValue);
                    formDataToSend.append('id_direction', directionValue);
                }
                
                // Ajouter les enfants si présents
                // IMPORTANT: Normaliser les enfants avant de les envoyer
                let enfantsToSend = enfants;
                
                if (enfantsToSend && Array.isArray(enfantsToSend)) {
                    // Normaliser les enfants pour s'assurer qu'ils ont le bon format
                    const normalizedEnfants = enfantsToSend
                        .filter(enfant => enfant !== null && enfant !== undefined) // Filtrer les enfants null/undefined
                        .map(enfant => {
                            // Inclure l'ID de l'enfant s'il existe (pour les mises à jour)
                            const normalizedEnfant = {
                                nom: (enfant.nom || '').trim(),
                                prenom: (enfant.prenom || '').trim(),
                                sexe: enfant.sexe || '',
                                date_de_naissance: enfant.date_de_naissance || '',
                                scolarise: enfant.scolarise !== null && enfant.scolarise !== undefined ? Boolean(enfant.scolarise) : false,
                                ayant_droit: enfant.ayant_droit !== null && enfant.ayant_droit !== undefined ? Boolean(enfant.ayant_droit) : false
                            };
                            
                            // Inclure l'ID si l'enfant existe déjà dans la base de données
                            if (enfant.id) {
                                normalizedEnfant.id = enfant.id;
                            }
                            
                            return normalizedEnfant;
                        });
                    
                    console.log('🔍 AgentsPage - Enfants normalisés à envoyer (FormData):', {
                        nombreOriginal: enfantsToSend.length,
                        nombreNormalise: normalizedEnfants.length,
                        normalizedEnfants
                    });
                    
                    const finalNombreEnfant = String(nombre_enfant || normalizedEnfants.length || 0);
                    if (typeof formDataToSend.set === 'function') {
                        formDataToSend.set('enfants', JSON.stringify(normalizedEnfants));
                        formDataToSend.set('nombre_enfant', finalNombreEnfant);
                    } else {
                        formDataToSend.delete('enfants');
                        formDataToSend.delete('nombre_enfant');
                        formDataToSend.append('enfants', JSON.stringify(normalizedEnfants));
                        formDataToSend.append('nombre_enfant', finalNombreEnfant);
                    }
                } else if (nombre_enfant && nombre_enfant > 0) {
                    // Si nombre_enfant > 0 mais pas d'enfants, envoyer un tableau vide
                    // Le backend gérera la mise à jour du nombre_enfant
                    console.log('⚠️ AgentsPage - nombre_enfant > 0 mais pas d\'enfants dans formData, envoi tableau vide');
                    const finalNombreEnfant = String(nombre_enfant);
                    if (typeof formDataToSend.set === 'function') {
                        formDataToSend.set('enfants', JSON.stringify([]));
                        formDataToSend.set('nombre_enfant', finalNombreEnfant);
                    } else {
                        formDataToSend.delete('enfants');
                        formDataToSend.delete('nombre_enfant');
                        formDataToSend.append('enfants', JSON.stringify([]));
                        formDataToSend.append('nombre_enfant', finalNombreEnfant);
                    }
                } else {
                    // Si pas d'enfants et nombre_enfant = 0, envoyer quand même pour permettre la suppression
                    console.log('🔍 AgentsPage - Pas d\'enfants, envoi tableau vide');
                    const finalNombreEnfant = String(nombre_enfant || 0);
                    if (typeof formDataToSend.set === 'function') {
                        formDataToSend.set('enfants', JSON.stringify([]));
                        formDataToSend.set('nombre_enfant', finalNombreEnfant);
                    } else {
                        formDataToSend.delete('enfants');
                        formDataToSend.delete('nombre_enfant');
                        formDataToSend.append('enfants', JSON.stringify([]));
                        formDataToSend.append('nombre_enfant', finalNombreEnfant);
                    }
                }
                
                // Ajouter les fichiers de diplômes
                if (agentData.diplomes && Array.isArray(agentData.diplomes)) {
                    agentData.diplomes.forEach((diplome, index) => {
                        // Si "Autre" est sélectionné, utiliser diplome_autre comme valeur du diplôme
                        if (diplome.diplome === 'Autre' && diplome.diplome_autre) {
                            diplome.diplome = diplome.diplome_autre;
                        }
                        if (diplome.document && diplome.document instanceof File) {
                            formDataToSend.append(`diplome_documents`, diplome.document);
                            console.log(`📄 Fichier de diplôme ${index + 1} ajouté:`, diplome.document.name);
                        }
                    });
                }
                
                // Ajouter les fichiers de documents dynamiques dans l'ordre correct
                if (originalDocuments && Array.isArray(originalDocuments)) {
                    console.log(`🔍 Ajout des fichiers de documents dynamiques:`, originalDocuments.length, 'documents');
                    
                    // Ajouter les fichiers dans l'ordre séquentiel pour les nouveaux documents
                    originalDocuments.forEach((document, index) => {
                        const isNewDocument = document.id && typeof document.id === 'string' && document.id.startsWith('new_');
                        const hasFile = document.file && document.file instanceof File;
                        
                        console.log(`🔍 Document ${index + 1} "${document.name}":`, {
                            isNewDocument,
                            hasFile,
                            fileType: document.file ? typeof document.file : 'null'
                        });
                        
                        // Ajouter seulement les fichiers des nouveaux documents
                        if (isNewDocument && hasFile) {
                            formDataToSend.append(`dynamic_documents`, document.file);
                            console.log(`✅ Nouveau document avec fichier ${index + 1} ajouté:`, document.file.name, `(Nom: ${document.name})`);
                        } else if (isNewDocument && !hasFile) {
                            console.log(`📄 Nouveau document sans fichier ${index + 1}:`, document.name);
                        } else {
                            console.log(`📄 Document existant ${index + 1}:`, document.name);
                        }
                    });
                }
                
                console.log('🔍 FormData créé, envoi de la requête...');
                
                // Vérifier spécifiquement que id_sous_direction est inclus
                const sousDirectionInFormData = formDataToSend.has('id_sous_direction');
                console.log(`🔍 Vérification id_sous_direction dans FormData:`, sousDirectionInFormData);
                if (sousDirectionInFormData) {
                    const sousDirectionValue = formDataToSend.get('id_sous_direction');
                    console.log(`   Valeur de id_sous_direction:`, sousDirectionValue);
                } else {
                    console.warn(`⚠️ id_sous_direction n'est PAS dans le FormData !`);
                    // Forcer l'ajout de id_sous_direction s'il manque
                    const sousDirectionValue = agentData.id_sous_direction === null || agentData.id_sous_direction === undefined 
                        ? '' 
                        : String(agentData.id_sous_direction);
                    formDataToSend.append('id_sous_direction', sousDirectionValue);
                    console.log(`   ✅ id_sous_direction FORCÉ dans FormData avec la valeur: ${sousDirectionValue || 'null (chaîne vide)'}`);
                }
                
                // Debug: Afficher le contenu du FormData
                console.log('🔍 Contenu du FormData:');
                for (let [key, value] of formDataToSend.entries()) {
                    if (value instanceof File) {
                        console.log(`   ${key}: File(${value.name}, ${value.size} bytes, ${value.type})`);
                    } else {
                        console.log(`   ${key}: ${value}`);
                    }
                }
                
                response = await fetch(url, {
                    method: method,
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: formDataToSend
                });
            } else {
                // Utiliser JSON pour les données sans fichiers
                // Vérifier spécifiquement que id_sous_direction est inclus
                console.log(`🔍 Vérification id_sous_direction dans agentData (JSON):`, {
                    hasIdSousDirection: 'id_sous_direction' in agentData,
                    hasSousDirectionId: 'sous_direction_id' in agentData,
                    idSousDirectionValue: agentData.id_sous_direction,
                    sousDirectionIdValue: agentData.sous_direction_id,
                    allNumericFields: numericFields.filter(field => field in agentData).map(field => ({
                        field,
                        value: agentData[field]
                    }))
                });
                
                // S'assurer que les champs du corps préfectoral sont inclus dans agentData
                prefectoralFields.forEach(field => {
                    if (!(field in agentData)) {
                        agentData[field] = null;
                        console.log(`⚠️ AgentsPage - Champ préfectoral ${field} manquant, initialisé à null`);
                    }
                });
                
                // Normaliser les enfants pour l'envoi JSON
                let enfantsToSend = enfants;
                if (enfantsToSend && Array.isArray(enfantsToSend)) {
                    const normalizedEnfants = enfantsToSend
                        .filter(enfant => enfant !== null && enfant !== undefined)
                        .map(enfant => {
                            const normalizedEnfant = {
                                nom: (enfant.nom || '').trim(),
                                prenom: (enfant.prenom || '').trim(),
                                sexe: enfant.sexe || '',
                                date_de_naissance: enfant.date_de_naissance || '',
                                scolarise: enfant.scolarise !== null && enfant.scolarise !== undefined ? Boolean(enfant.scolarise) : false,
                                ayant_droit: enfant.ayant_droit !== null && enfant.ayant_droit !== undefined ? Boolean(enfant.ayant_droit) : false
                            };
                            
                            if (enfant.id) {
                                normalizedEnfant.id = enfant.id;
                            }
                            
                            return normalizedEnfant;
                        });
                    
                    agentData.enfants = normalizedEnfants;
                    console.log('🔍 AgentsPage - Enfants normalisés pour JSON:', normalizedEnfants);
                } else {
                    agentData.enfants = [];
                }
                
                // S'assurer que nombre_enfant est inclus
                if (!('nombre_enfant' in agentData)) {
                    agentData.nombre_enfant = nombre_enfant || 0;
                }
                
                console.log('🔍 AgentsPage - Champs préfectoraux avant envoi JSON:', {
                    corps_prefectoral: agentData.corps_prefectoral,
                    grade_prefectoral: agentData.grade_prefectoral,
                    echelon_prefectoral: agentData.echelon_prefectoral
                });
                
                // Convertir l'année en entier pour les diplômes si présents
                if (agentData.diplomes && Array.isArray(agentData.diplomes)) {
                    agentData.diplomes = agentData.diplomes.map(diplome => {
                        if (diplome.date_diplome) {
                            const year = diplome.date_diplome.toString().trim();
                            // Si c'est une année (4 chiffres), convertir en entier
                            if (/^\d{4}$/.test(year)) {
                                return {
                                    ...diplome,
                                    date_diplome: parseInt(year, 10)
                                };
                            }
                            // Si c'est une date, extraire l'année
                            try {
                                const date = new Date(diplome.date_diplome);
                                if (!isNaN(date.getTime())) {
                                    return {
                                        ...diplome,
                                        date_diplome: date.getFullYear()
                                    };
                                }
                            } catch (error) {
                                // Ignorer les erreurs de conversion
                            }
                        }
                        return diplome;
                    });
                }
                
                response = await fetch(url, {
                    method: method,
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify(agentData)
                });
            }

            const result = await response.json();
            
            if (result.id || result.success) {
                const agentId = result.id || editingAgent.id;
                
                // NOTE: Les enfants sont maintenant gérés directement dans le backend lors de la création/modification de l'agent
                // Plus besoin de les gérer séparément ici - le backend fait UPDATE/INSERT/DELETE automatiquement
                console.log('✅ Enfants gérés directement par le backend lors de la création/modification de l\'agent');
                
                // Message de succès stylisé
                const successMessage = `🎉 Agent ${result.nom || agentData.nom} ${result.prenom || agentData.prenom} ${isEditMode ? 'modifié' : 'créé'} avec succès !`;
                
                setSuccessMessage(successMessage);
                setShowSuccessNotification(true);
                
                setShowMultiStepForm(false);
                setIsEditMode(false);
                setEditingAgent(null);
                
                // Logs de confirmation après modification
                console.log('✅ AgentsPage - Agent modifié avec succès:', {
                    agentId: agentId,
                    result: result,
                    agentData: agentData
                });
                
                // Recharger la page pour afficher les modifications avec un délai plus long
                // pour permettre de voir les logs de débogage
                // TODO: À désactiver temporairement pour le débogage
                const RELOAD_DELAY = 10000; // 30 secondes pour permettre de voir les logs
                // Décommentez la ligne ci-dessous pour désactiver complètement le rechargement
                // const RELOAD_DELAY = null;
                
                if (RELOAD_DELAY) {
                    console.log(`⏰ AgentsPage - La page se rechargera dans ${RELOAD_DELAY / 1000} secondes pour afficher les modifications...`);
                    setTimeout(() => {
                        window.location.reload();
                    }, RELOAD_DELAY);
                } else {
                    console.log('ℹ️ AgentsPage - Rechargement automatique désactivé. Rechargez manuellement la page pour voir les modifications.');
                }
            } else {
                // En cas d'erreur métier (ex: matricule déjà utilisé), ne pas vider le formulaire.
                // Renvoyer l'erreur au MultiStepForm qui l'affichera dans l'alerte rouge en haut.
                console.warn('⚠️ AgentsPage - Erreur lors de la soumission (success=false):', result);
                return {
                    success: false,
                    message: result.error || result.message || `Erreur lors de la ${isEditMode ? 'modification' : 'création'} de l'agent.`
                };
            }
        } catch (error) {
            console.error('❌ ===== ERREUR MISE À JOUR AGENT =====');
            console.error('❌ Erreur lors de la mise à jour de l\'agent:', error);
            console.error('❌ Stack trace:', error.stack);
            console.error('❌ Agent ID:', editingAgent?.id);
            console.error('❌ Données reçues:', formData);
            
            // Afficher l'erreur réelle au lieu du message générique
            const errorMessage = error.message || 'Erreur inconnue';
            // Ne pas utiliser alert() pour ne pas fermer/réinitialiser le formulaire
            return {
                success: false,
                message: `Erreur lors de la ${isEditMode ? 'modification' : 'création'} de l'agent: ${errorMessage}`
            };
        }
    };

    // Charger les données de l'agent à modifier
    useEffect(() => {
        if (editAgentId) {
            loadAgentForEdit(editAgentId);
        }
    }, [editAgentId]);

    const loadAgentForEdit = async (agentId) => {
        try {
            console.log('🔍 Chargement de l\'agent pour modification:', agentId);
            console.log('🔍 État actuel - showMultiStepForm:', showMultiStepForm);
            console.log('🔍 État actuel - isEditMode:', isEditMode);
            console.log('🔍 État actuel - editingAgent:', editingAgent);
            
            const response = await fetch(`https://tourisme.2ise-groupe.com/api/agents/${agentId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            const result = await response.json();
            console.log('🔍 Réponse API pour modification:', result);
            console.log('🔍 Status de la réponse:', response.status);
            console.log('🔍 Headers de la réponse:', response.headers);
            
            console.log('🔍 Vérification result.success:', result.success);
            console.log('🔍 Vérification result.data:', result.data);
            console.log('🔍 Type de result.data:', typeof result.data);
            
            if (result.success && result.data) {
                console.log('🔍 Données de l\'agent chargées:', result.data);
                console.log('🔍 ID de l\'agent:', result.data.id);
                console.log('🔍 Nom de l\'agent:', result.data.nom);
                console.log('🔍 Prénoms de l\'agent:', result.data.prenom);
                console.log('🔍 Numéro acte mariage:', result.data.numero_acte_mariage);
                console.log('🔍 Date délivrance acte mariage:', result.data.date_delivrance_acte_mariage);
                
                // Transformer les dates pour les champs HTML type="date" (éviter les décalages de fuseau horaire)
                const formatDateForInput = (dateString) => {
                    if (!dateString) return '';
                    // Si c'est déjà au format YYYY-MM-DD, on le retourne tel quel
                    if (typeof dateString === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
                        return dateString;
                    }
                    // Si c'est une date avec timestamp, on extrait juste la partie date
                    if (typeof dateString === 'string' && dateString.includes('T')) {
                        return dateString.split('T')[0];
                    }
                    // Sinon, on parse la date en utilisant UTC pour éviter les décalages de fuseau horaire
                    const date = new Date(dateString);
                    // Vérifier si la date est valide
                    if (isNaN(date.getTime())) {
                        return '';
                    }
                    // Utiliser les méthodes UTC pour éviter le décalage d'un jour
                    const year = date.getUTCFullYear();
                    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
                    const day = String(date.getUTCDate()).padStart(2, '0');
                    return `${year}-${month}-${day}`;
                };

                // Gérer les fichiers existants pour l'édition
                const allDocuments = result.data.documents?.filter(doc => doc.document_type !== 'diplome') || [];
                console.log('📄 Tous les documents récupérés:', allDocuments);
                console.log('📄 Acte de mariage trouvé:', allDocuments.find(doc => doc.document_type === 'acte_mariage'));
                
                const existingFiles = {
                    photo_profil: result.data.photos?.find(photo => photo.is_profile_photo) || null,
                    documents: allDocuments,
                    diplomes: result.data.diplomes || [],
                    // Ajouter l'acte de mariage directement pour faciliter l'accès dans le formulaire
                    acte_mariage: allDocuments.find(doc => doc.document_type === 'acte_mariage') || null,
                    certificat_travail: allDocuments.find(doc => doc.document_type === 'certificat_travail') || null,
                    attestation_formation: allDocuments.find(doc => doc.document_type === 'attestation_formation') || null
                };
                
                console.log('📄 ExistingFiles configuré:', existingFiles);

                // Extraire l'année uniquement pour date_diplome (éviter new Date(1995) → 1970)
                const formatYearForDiplome = (v) => {
                    if (v == null || v === '') return '';
                    if (typeof v === 'number' && v >= 1900 && v <= 2100) return String(v);
                    const s = String(v).trim();
                    if (/^\d{4}$/.test(s)) return s;
                    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 4);
                    const d = new Date(v);
                    if (!isNaN(d.getTime())) return String(d.getUTCFullYear());
                    return '';
                };
                // Formater les diplômes pour le formulaire
                const formattedDiplomes = result.data.diplomes?.map((diplome, index) => ({
                    options: diplome.options || '',
                    diplome: diplome.diplome || '',
                    date_diplome: formatYearForDiplome(diplome.date_diplome) || '',
                    ecole: diplome.ecole || '',
                    ville: diplome.ville || '',
                    pays: diplome.pays || '',
                    document: null, // Pas de nouveau fichier
                    existingDocument: diplome.document_name ? {
                        name: diplome.document_name,
                        size: diplome.document_size,
                        url: diplome.document_url
                    } : null
                })) || [];

                console.log('🔍 Diplômes formatés pour le formulaire:', formattedDiplomes);
                console.log('🔍 Nombre de diplômes:', formattedDiplomes.length);

                const transformedData = {
                    ...result.data,
                    // Mapper explicitement les champs familiaux pour s'assurer qu'ils sont présents
                    nom_de_la_mere: result.data.nom_de_la_mere || '',
                    nom_du_pere: result.data.nom_du_pere || '',
                    id_pays: result.data.id_pays || null,
                    // Mapper explicitement direction générale, direction et sous-direction (null si "Aucune")
                    id_direction_generale: result.data.id_direction_generale ?? null,
                    id_direction: result.data.id_direction ?? null,
                    id_sous_direction: result.data.id_sous_direction ?? null,
                    service_id: result.data.id_service || null,
                    // Mapper le libellé de la direction pour l'affichage si la direction n'est pas dans les options
                    direction_libelle: result.data.direction_libelle || null,
                    // Mapper les champs du corps préfectoral
                    corps_prefectoral: result.data.corps_prefectoral || null,
                    // Le grade préfectoral est maintenant un ID depuis la base de données
                    // Si c'est encore une abréviation (anciennes données), on la garde temporairement
                    // Le MultiStepForm se chargera de trouver l'ID correspondant lors du chargement
                    grade_prefectoral: result.data.grade_prefectoral || result.data.id_grade_prefectoral || null,
                    echelon_prefectoral: result.data.echelon_prefectoral || null,
                    // Mapper le 3ème numéro de téléphone
                    telephone3: result.data.telephone3 || '',
                    // Mapper explicitement les champs d'adresse professionnelle pour s'assurer qu'ils sont présents
                    ad_pro_ville: result.data.ad_pro_ville || '',
                    ad_pro_batiment: result.data.ad_pro_batiment || '',
                    // Combiner le numéro et la date de l'acte de mariage en un objet
                    numero_et_date_acte_mariage: (() => {
                        const numero = result.data.numero_acte_mariage;
                        const date = result.data.date_delivrance_acte_mariage;
                        console.log('🔍 Acte de mariage - Numéro brut:', numero, 'Type:', typeof numero);
                        console.log('🔍 Acte de mariage - Date brute:', date, 'Type:', typeof date);
                        return {
                            numero: (numero !== null && numero !== undefined && numero !== '') ? String(numero) : '',
                            date: formatDateForInput(date) || ''
                        };
                    })(),
                    // Formater les dates
                    date_de_naissance: formatDateForInput(result.data.date_de_naissance),
                    date_embauche: formatDateForInput(result.data.date_embauche),
                    date_retraite: formatDateForInput(result.data.date_retraite),
                    date_mariage: formatDateForInput(result.data.date_mariage),
                    date_declaration_cnps: formatDateForInput(result.data.date_declaration_cnps),
                    // Ajouter les fichiers existants
                    existingFiles: existingFiles,
                    nombre_diplomes: result.data.diplomes?.length || 0,
                    // Ajouter les diplômes formatés directement dans formData
                    diplomes: formattedDiplomes,
                    // Ajouter les langues et logiciels existants
                    agent_langues: result.data.langues || [],
                    agent_logiciels: result.data.logiciels || [],
                    // Formater les enfants pour le formulaire
                    // TOUJOURS utiliser nombre_enfant depuis la base de données (valeur saisi par l'utilisateur)
                    // et non enfants.length (nombre d'enfants créés dans la table enfants)
                    nombre_enfant: result.data.nombre_enfant !== undefined && result.data.nombre_enfant !== null 
                        ? result.data.nombre_enfant 
                        : (result.data.enfants?.length || 0),
                    enfants: (result.data.enfants || []).map((enfant) => {
                        const formattedEnfant = {
                            id: enfant.id,
                            nom: enfant.nom || '',
                            prenom: enfant.prenom || '',
                            sexe: enfant.sexe || '',
                            date_de_naissance: formatDateForInput(enfant.date_de_naissance) || '',
                            lieu_de_naissance: enfant.lieu_de_naissance || '',
                            scolarise: enfant.scolarise !== null && enfant.scolarise !== undefined ? Boolean(enfant.scolarise) : false,
                            ayant_droit: enfant.ayant_droit !== null && enfant.ayant_droit !== undefined ? Boolean(enfant.ayant_droit) : false
                        };
                        return formattedEnfant;
                    }) || []
                };
                
                console.log('🔍 Vérification des champs familiaux et direction:', {
                    nom_de_la_mere: transformedData.nom_de_la_mere,
                    nom_du_pere: transformedData.nom_du_pere,
                    id_pays: transformedData.id_pays,
                    id_direction: transformedData.id_direction,
                    id_direction_type: typeof transformedData.id_direction,
                    id_sous_direction: transformedData.id_sous_direction,
                    service_id: transformedData.service_id,
                    nombre_enfant: transformedData.nombre_enfant,
                    enfants: transformedData.enfants,
                    nombre_enfants_charge: transformedData.enfants?.length
                });
                
                console.log('🔍 Vérification des champs corps préfectoral et téléphones:', {
                    corps_prefectoral: transformedData.corps_prefectoral,
                    grade_prefectoral: transformedData.grade_prefectoral,
                    echelon_prefectoral: transformedData.echelon_prefectoral,
                    telephone1: transformedData.telephone1,
                    telephone2: transformedData.telephone2,
                    telephone3: transformedData.telephone3
                });
                
                console.log('🔍 Données transformées pour les dates:', transformedData);
                console.log('🔍 AVANT setEditingAgent - editingAgent actuel:', editingAgent);
                console.log('🔍 AVANT setIsEditMode - isEditMode actuel:', isEditMode);
                console.log('🔍 AVANT setShowMultiStepForm - showMultiStepForm actuel:', showMultiStepForm);
                
                // Mettre à jour les états dans l'ordre correct
                setEditingAgent(transformedData);
                setIsEditMode(true);
                
                // Attendre un tick pour s'assurer que les états sont mis à jour
                setTimeout(() => {
                    setShowMultiStepForm(true);
                    console.log('🔍 Formulaire ouvert après chargement des données');
                }, 100);
                
                console.log('🔍 APRÈS setEditingAgent - transformedData:', transformedData);
                console.log('🔍 APRÈS setIsEditMode - isEditMode:', true);
                console.log('🔍 APRÈS setShowMultiStepForm - showMultiStepForm:', true);
                console.log('🔍 États mis à jour - editingAgent:', transformedData, 'isEditMode:', true, 'showMultiStepForm:', true);
            } else {
                console.error('❌ Erreur dans la réponse API:', result);
            }
        } catch (error) {
            console.error('❌ ===== ERREUR CHARGEMENT AGENT =====');
            console.error('❌ Erreur lors du chargement de l\'agent:', error);
            console.error('❌ Agent ID:', agentId);
            console.error('❌ Stack trace:', error.stack);
            
            // Afficher l'erreur réelle
            const errorMessage = error.message || 'Erreur inconnue';
            alert(`Erreur lors du chargement de l'agent: ${errorMessage}`);
        }
    };

    // Si on doit afficher les détails d'un agent spécifique
    if (viewAgentId) {
        return (
            <>
                <AgentDetails agentId={viewAgentId} />
                <MultiStepForm
                    isOpen={showMultiStepForm}
                    toggle={() => setShowMultiStepForm(false)}
                    title="Création d'un Nouvel Agent"
                    steps={agentSteps}
                    onSubmit={handleAgentSubmit}
                    submitText="Créer l'Agent"
                />
            </>
        );
    }

    return (
        <>
        <ManagementPage
            title="Agents"
            description="Gestion complète des agents et employés du Ministère du Tourisme et des Loisirs"
            icon={MdPerson}
            apiEndpoint="/api/agents"
                fields={displayFields}
            searchFields={searchFields}
            breadcrumbs={breadcrumbs}
                customAddButton={{
                    onClick: () => setShowMultiStepForm(true),
                    text: "Nouvel Agent"
                }}
                onEditAgent={(agentId) => {
                    console.log('🔍 Callback onEditAgent appelé avec agentId:', agentId);
                    loadAgentForEdit(agentId);
                    // Le formulaire sera ouvert dans loadAgentForEdit après le chargement des données
                }}
            />
            
            <MultiStepForm
                isOpen={showMultiStepForm}
                toggle={() => {
                    setShowMultiStepForm(false);
                    setIsEditMode(false);
                    setEditingAgent(null);
                }}
                title={isEditMode ? "Modification de l'Agent" : "Création d'un Nouvel Agent"}
                steps={agentSteps.map(step => ({
                    ...step,
                    fields: step.fields.filter(field => {
                        // En mode modification, exclure les champs fonction, emploi, grade et échelon
                        if (isEditMode && ['id_fonction', 'id_emploi', 'id_grade', 'id_echelon'].includes(field.name)) {
                            return false;
                        }
                        return true;
                    }).map(field => {
                        // En mode modification, désactiver le champ date_retraite
                        if (isEditMode && field.name === 'date_retraite') {
                            return { ...field, disabled: true, readOnly: true };
                        }
                        // En mode modification, désactiver tous les champs obligatoires
                        if (isEditMode && field.required) {
                            return { ...field, required: false };
                        }
                        // Gérer aussi conditionalRequired
                        if (isEditMode && field.conditionalRequired) {
                            return { ...field, conditionalRequired: undefined };
                        }
                        return field;
                    })
                }))}
                onSubmit={handleAgentSubmit}
                submitText={isEditMode ? "Sauvegarder les Modifications" : "Créer l'Agent"}
                initialData={editingAgent}
                key={editingAgent?.id || 'new'} // ✅ Force le re-render quand editingAgent change
            />
            
            {/* Notification de succès stylisée */}
            <SuccessNotification
                message={successMessage}
                isVisible={showSuccessNotification}
                onClose={() => setShowSuccessNotification(false)}
                duration={5000}
            />
        </>
    );
};

export default AgentsPage;
