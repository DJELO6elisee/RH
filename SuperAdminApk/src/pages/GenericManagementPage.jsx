import React from 'react';
import { useLocation } from 'react-router-dom';
import ManagementPage from 'components/ManagementPage';
import { backendRoutes } from 'config/routes';

const GenericManagementPage = ({ match }) => {
    const location = useLocation();
    const currentPath = location.pathname;
    const route = backendRoutes.find(r => r.path === currentPath);

    if (!route) {
        return (
            <div className="container mt-4">
                <div className="alert alert-danger">
                    Route non trouvée: {currentPath}
                </div>
            </div>
        );
    }

    // Mapper les icônes
    const iconMap = {
        'MdPerson': require('react-icons/md').MdPerson,
        'MdLock': require('react-icons/md').MdLock,
        'MdTitle': require('react-icons/md').MdTitle,
        'MdBusiness': require('react-icons/md').MdBusiness,
        'MdStar': require('react-icons/md').MdStar,
        'MdAccountBalance': require('react-icons/md').MdAccountBalance,
        'MdWork': require('react-icons/md').MdWork,
        'MdAssignment': require('react-icons/md').MdAssignment,
        'MdBusinessCenter': require('react-icons/md').MdBusinessCenter,
        'MdPlace': require('react-icons/md').MdPlace,
        'MdTrendingUp': require('react-icons/md').MdTrendingUp,
        'MdGroup': require('react-icons/md').MdGroup,
        'MdCategory': require('react-icons/md').MdCategory,
        'MdSchool': require('react-icons/md').MdSchool,
        'MdEmojiEvents': require('react-icons/md').MdEmojiEvents,
        'MdScience': require('react-icons/md').MdScience,
        'MdLanguage': require('react-icons/md').MdLanguage,
        'MdTranslate': require('react-icons/md').MdTranslate,
        'MdComputer': require('react-icons/md').MdComputer,
        'MdCode': require('react-icons/md').MdCode,
        'MdEvent': require('react-icons/md').MdEvent,
        'MdEventBusy': require('react-icons/md').MdEventBusy,
        'MdInput': require('react-icons/md').MdInput,
        'MdExitToApp': require('react-icons/md').MdExitToApp,
        'MdRetirement': require('react-icons/md').MdWork,
        'MdFavorite': require('react-icons/md').MdFavorite,
        'MdPublic': require('react-icons/md').MdPublic,
        'MdMap': require('react-icons/md').MdMap,
        'MdLocationOn': require('react-icons/md').MdLocationOn,
        'MdChildCare': require('react-icons/md').MdChildCare,
        'MdAccessibility': require('react-icons/md').MdAccessibility,
        'MdHealthAndSafety': require('react-icons/md').MdHealthAndSafety,
        'MdWarning': require('react-icons/md').MdWarning,
        'MdGavel': require('react-icons/md').MdGavel,
        'MdDescription': require('react-icons/md').MdDescription,
        'MdMail': require('react-icons/md').MdMail,
        'MdSend': require('react-icons/md').MdSend,
        'MdBuild': require('react-icons/md').MdBuild,
        'MdEventNote': require('react-icons/md').MdEventNote,
        'MdAccountTree': require('react-icons/md').MdAccountTree,
        'MdGroupWork': require('react-icons/md').MdGroupWork,
        'MdFolder': require('react-icons/md').MdFolder,
        'MdFolderOpen': require('react-icons/md').MdFolderOpen,
        'MdPeople': require('react-icons/md').MdPeople
    };

    const Icon = iconMap[route.icon] || require('react-icons/md').MdSettings;

    // Champs adaptatifs selon le type de route
    const getFieldsForRoute = (routeId) => {
        const baseFields = [
            { name: 'code', label: 'Code', type: 'text' },
            { name: 'description', label: 'Description', type: 'textarea' }
        ];

        // Champs spécifiques pour certaines routes basés sur la structure réelle des données
        const specificFields = {
            'grades': [
                { name: 'id', label: 'ID', type: 'text', readOnly: true },
                { name: 'libele', label: 'Libellé', type: 'text', required: true },
                { name: 'numero_ordre', label: 'Numéro d\'ordre', type: 'number', required: true },
                { name: 'age_de_retraite', label: 'Âge de retraite', type: 'number', required: true },
                { name: 'categorie_libele', label: 'Catégorie', type: 'text', readOnly: true },
                { name: 'id_categorie', label: 'ID Catégorie', type: 'number', required: true }
            ],
            'fonctions': [
                { name: 'id', label: 'ID', type: 'text', readOnly: true },
                { name: 'libele', label: 'Libellé', type: 'text', required: true },
                { name: 'nbr_agent', label: 'Nombre d\'agents', type: 'number' }
            ],
            'situation_matrimonials': [
                { name: 'id', label: 'ID', type: 'text', readOnly: true },
                { name: 'libele', label: 'Libellé', type: 'text', required: true }
            ],
            'categories': [
                { name: 'id', label: 'ID', type: 'text', readOnly: true },
                { name: 'libele', label: 'Libellé', type: 'text', required: true }
            ],
            'civilites': [
                { name: 'id', label: 'ID', type: 'text', readOnly: true },
                { name: 'libele', label: 'Libellé', type: 'text', required: true }
            ],
            'nationalites': [
                { name: 'id', label: 'ID', type: 'text', readOnly: true },
                { name: 'libele', label: 'Libellé', type: 'text', required: true }
            ],
            'positions': [
                { name: 'id', label: 'ID', type: 'text', readOnly: true },
                { name: 'libele', label: 'Libellé', type: 'text', required: true }
            ],
            'pays': [
                { name: 'libele', label: 'Nom du Pays', type: 'text', required: true, placeholder: 'Saisir le nom du pays' },
                { name: 'nationalite_libele', label: 'Nationalité', type: 'select', dynamicTable: 'nationalites', dynamicField: 'libele', required: true, placeholder: 'Sélectionner la nationalité' }
            ],
            'localites': [
                { name: 'id', label: 'ID', type: 'text', readOnly: true },
                { name: 'libele', label: 'Libellé', type: 'text', required: true }
            ],
            'handicaps': [
                { name: 'id', label: 'ID', type: 'text', readOnly: true },
                { name: 'libele', label: 'Libellé', type: 'text', required: true }
            ],
            'type_de_seminaire_de_formation': [
                { name: 'libele', label: 'Saisir la formation', type: 'text', required: true, placeholder: 'SAISIR LA FORMATION' }
            ],
            'type_etablissements': [
                { name: 'id', label: 'ID', type: 'text', readOnly: true },
                { name: 'libele', label: 'Libellé', type: 'text', required: true }
            ],
            'unite_administratives': [
                { name: 'id', label: 'ID', type: 'text', readOnly: true },
                { name: 'libele', label: 'Libellé', type: 'text', required: true }
            ],
            'diplomes': [
                { name: 'id', label: 'ID', type: 'text', readOnly: true },
                { name: 'libele', label: 'Libellé', type: 'text', required: true },
                { name: 'type_de_diplome', label: 'Type de Diplôme', type: 'text', required: true }
            ],
            'emplois': [
                { name: 'id', label: 'ID', type: 'text', readOnly: true },
                { name: 'libele', label: 'Libellé', type: 'text', required: true },
                { name: 'libele_court', label: 'Libellé Court', type: 'text', required: true }
            ],
            'services': [
                { name: 'id', label: 'ID', type: 'text', readOnly: true },
                { name: 'libelle', label: 'Libellé', type: 'text', required: true },
                { name: 'ministere_nom', label: 'Ministère', type: 'text', readOnly: true },
                { name: 'type_service', label: 'Type de Service', type: 'text', readOnly: true },
                { name: 'is_active', label: 'Actif', type: 'checkbox', defaultValue: true }
            ],
            'services-entites-ministres': [
                { name: 'id', label: 'ID', type: 'text', readOnly: true },
                { name: 'libelle', label: 'Libellé', type: 'text', required: true },
                { name: 'description', label: 'Description', type: 'textarea' },
                { name: 'code', label: 'Code', type: 'text' },
                { name: 'entite_nom', label: 'Nom de l\'Entité', type: 'text', readOnly: true },
                { name: 'type_entite', label: 'Type d\'Entité', type: 'text', readOnly: true },
                { name: 'ministere_nom', label: 'Ministère', type: 'text', readOnly: true },
                { name: 'responsable_nom', label: 'Nom du Responsable', type: 'text', readOnly: true },
                { name: 'is_active', label: 'Actif', type: 'checkbox', defaultValue: true }
            ],
            'distinctions': [
                { name: 'id', label: 'ID', type: 'text', readOnly: true },
                { name: 'libele', label: 'Libellé', type: 'text', required: true },
                { name: 'nature', label: 'Nature', type: 'text', required: true }
            ],
            'specialites': [
                { name: 'id', label: 'ID', type: 'text', readOnly: true },
                { name: 'libele', label: 'Libellé', type: 'text', required: true }
            ],
            'langues': [
                { name: 'id', label: 'ID', type: 'text', readOnly: true },
                { name: 'libele', label: 'Libellé', type: 'text', required: true }
            ],
            'niveau_langues': [
                { name: 'id', label: 'ID', type: 'text', readOnly: true },
                { name: 'libele', label: 'Libellé', type: 'text', required: true }
            ],
            'logiciels': [
                { name: 'id', label: 'ID', type: 'text', readOnly: true },
                { name: 'libele', label: 'Libellé', type: 'text', required: true }
            ],
            'niveau_informatiques': [
                { name: 'id', label: 'ID', type: 'text', readOnly: true },
                { name: 'libele', label: 'Libellé', type: 'text', required: true }
            ],
            'type_de_conges': [
                { name: 'id', label: 'ID', type: 'text', readOnly: true },
                { name: 'libele', label: 'Libellé', type: 'text', required: true }
            ],
            'autre_absences': [
                { name: 'id', label: 'ID', type: 'text', readOnly: true },
                { name: 'libele', label: 'Libellé', type: 'text', required: true }
            ],
            'mode_d_entrees': [
                { name: 'id', label: 'ID', type: 'text', readOnly: true },
                { name: 'libele', label: 'Libellé', type: 'text', required: true }
            ],
            'motif_de_departs': [
                { name: 'id', label: 'ID', type: 'text', readOnly: true },
                { name: 'libele', label: 'Libellé', type: 'text', required: true }
            ],
            'type_de_retraites': [
                { name: 'id', label: 'ID', type: 'text', readOnly: true },
                { name: 'libele', label: 'Libellé', type: 'text', required: true }
            ],
            'enfants': [
                { name: 'id', label: 'ID', type: 'text', readOnly: true },
                { name: 'libele', label: 'Libellé', type: 'text', required: true }
            ],
            'pathologies': [
                { name: 'id', label: 'ID', type: 'text', readOnly: true },
                { name: 'libele', label: 'Libellé', type: 'text', required: true }
            ],
            'nature_d_accidents': [
                { name: 'id', label: 'ID', type: 'text', readOnly: true },
                { name: 'libele', label: 'Libellé', type: 'text', required: true }
            ],
            'sanctions': [
                { name: 'id', label: 'ID', type: 'text', readOnly: true },
                { name: 'libele', label: 'Libellé', type: 'text', required: true }
            ],
            'nature_actes': [
                { name: 'id', label: 'ID', type: 'text', readOnly: true },
                { name: 'libele', label: 'Libellé', type: 'text', required: true }
            ],
            'type_de_documents': [
                { name: 'id', label: 'ID', type: 'text', readOnly: true },
                { name: 'libele', label: 'Libellé', type: 'text', required: true }
            ],
            'type_de_couriers': [
                { name: 'id', label: 'ID', type: 'text', readOnly: true },
                { name: 'libele', label: 'Libellé', type: 'text', required: true }
            ],
            'type_de_destinations': [
                { name: 'id', label: 'ID', type: 'text', readOnly: true },
                { name: 'libele', label: 'Libellé', type: 'text', required: true }
            ],
            'type_de_materiels': [
                { name: 'id', label: 'ID', type: 'text', readOnly: true },
                { name: 'libele', label: 'Libellé', type: 'text', required: true }
            ],
            'sindicats': [
                { name: 'id', label: 'ID', type: 'text', readOnly: true },
                { name: 'libele', label: 'Libellé', type: 'text', required: true }
            ],
            'dossiers': [
                { name: 'id', label: 'ID', type: 'text', readOnly: true },
                { name: 'libele', label: 'Libellé', type: 'text', required: true }
            ],
            'classeurs': [
                { name: 'id', label: 'ID', type: 'text', readOnly: true },
                { name: 'libele', label: 'Libellé', type: 'text', required: true }
            ],
            'tiers': [
                { name: 'id', label: 'ID', type: 'text', readOnly: true },
                { name: 'libele', label: 'Libellé', type: 'text', required: true }
            ],
            'auth': [
                { name: 'id', label: 'ID', type: 'text', readOnly: true },
                { name: 'username', label: 'Nom d\'utilisateur', type: 'text', required: true, placeholder: 'Saisir le nom d\'utilisateur' },
                { name: 'email', label: 'Email', type: 'email', required: true, placeholder: 'Saisir l\'email' },
                { name: 'password', label: 'Mot de passe', type: 'password', required: false, placeholder: 'Laisser vide pour générer automatiquement' },
                { name: 'id_role', label: 'Rôle', type: 'select', dynamicEndpoint: '/api/user-accounts/roles', dynamicField: 'nom', dynamicValue: 'id', required: true, placeholder: 'Sélectionner le rôle' },
                { name: 'id_agent', label: 'Agent', type: 'select', dynamicEndpoint: '/api/user-accounts/available-agents', dynamicField: 'nom', dynamicValue: 'id', required: true, placeholder: 'Sélectionner l\'agent', customLabel: (item) => `${item.nom || ''} ${item.prenom || ''} (${item.matricule || ''})`.trim() },
                { name: 'is_active', label: 'Actif', type: 'checkbox', defaultValue: true },
                { name: 'role_nom', label: 'Rôle', type: 'text', readOnly: true },
                { name: 'agent_nom', label: 'Nom Agent', type: 'text', readOnly: true },
                { name: 'agent_prenom', label: 'Prénom Agent', type: 'text', readOnly: true },
                { name: 'matricule', label: 'Matricule', type: 'text', readOnly: true },
                { name: 'ministere_nom', label: 'Ministère', type: 'text', readOnly: true }
            ]
        };

        const result = specificFields[routeId] || baseFields;
        if (routeId === 'grades') {
            console.log('DEBUG grades - routeId:', routeId);
            console.log('DEBUG grades - specificFields[routeId]:', specificFields[routeId]);
            console.log('DEBUG grades - baseFields:', baseFields);
            console.log('DEBUG grades - result:', result);
        }
        return result;
    };

    const fields = getFieldsForRoute(route.id);
    const searchFields = fields.map(f => f.name).filter(name => !name.includes('id'));

    // Configuration des colonnes à afficher pour la route 'auth'
    const getDisplayColumns = (routeId) => {
        if (routeId === 'auth') {
            return [
                { name: 'agent_nom', label: 'Nom' },
                { name: 'agent_prenom', label: 'Prénom' },
                { name: 'username', label: 'Nom utilisateur' },
                { name: 'email', label: 'Email' },
                { name: 'role_nom', label: 'Rôle' }
            ];
        }
        return null;
    };

    const displayColumns = getDisplayColumns(route.id);

    const breadcrumbs = [
        { name: 'Dashboard', active: false, link: '/' },
        { name: route.category, active: false },
        { name: route.name, active: true }
    ];

    return (
        <ManagementPage
            title={route.name}
            description={route.description}
            icon={Icon}
            apiEndpoint={route.customEndpoint || `/api/${route.id}`}
            fields={fields}
            searchFields={searchFields}
            breadcrumbs={breadcrumbs}
            displayColumns={displayColumns}
        />
    );
};

export default GenericManagementPage;
