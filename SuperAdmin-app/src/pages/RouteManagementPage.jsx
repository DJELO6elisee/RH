import React from 'react';
import ManagementPage from 'components/ManagementPage';
import { backendRoutes } from 'config/routes';
import { useLocation } from 'react-router-dom';
import { useAuth } from 'contexts/AuthContext';

const RouteManagementPage = ({ match }) => {
    const location = useLocation();
    const { user } = useAuth();
    const routeId = match.params.routeId || location.pathname.substring(1); // Extraire l'ID de l'URL
    const route = backendRoutes.find(r => r.id === routeId);

    if (!route) {
        return (
            <div className="container mt-4">
                <div className="alert alert-danger">
                    Route non trouvée: {routeId}
                </div>
            </div>
        );
    }

    // Mapper les icônes
    const iconMap = {
        'MdPerson': require('react-icons/md').MdPerson,
        'MdLock': require('react-icons/md').MdAccountCircle,
        'MdTitle': require('react-icons/md').MdTextFields,
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
        'MdPeople': require('react-icons/md').MdPeople,
        'MdSwapHoriz': require('react-icons/md').MdSwapHoriz,
        'MdSecurity': require('react-icons/md').MdSecurity,
        'MdLocationCity': require('react-icons/md').MdBusiness
    };

    const Icon = iconMap[route.icon] || require('react-icons/md').MdSettings;

    // Champs par défaut pour toutes les routes
    const defaultFields = [
        { name: 'code', label: 'Code', type: 'text' },
        { name: 'libele', label: 'Libellé', type: 'text' },
        { name: 'description', label: 'Description', type: 'textarea' }
    ];

    // Champs spécifiques selon le type de route
    const getSpecificFields = (routeId) => {
        const specificFields = {
            'civilites': [
                { name: 'abreviation', label: 'Abréviation', type: 'text' }
            ],
            'nationalites': [
                { name: 'codeIso', label: 'Code ISO', type: 'text' },
                { name: 'pays', label: 'Pays', type: 'text' }
            ],
            'pays': [
                { name: 'libele', label: 'Nom du Pays', type: 'text', required: true, placeholder: 'Saisir le nom du pays' },
                { name: 'nationalite_libele', label: 'Nationalité', type: 'select', dynamicTable: 'nationalites', dynamicField: 'libele', required: true, placeholder: 'Sélectionner la nationalité' }
            ],
            'localites': [
                { name: 'codePostal', label: 'Code postal', type: 'text' },
                { name: 'pays', label: 'Pays', type: 'select', options: ['France', 'Belgique', 'Suisse', 'Canada'] }
            ],
            'langues': [
                { name: 'codeIso', label: 'Code ISO', type: 'text' },
                { name: 'niveau', label: 'Niveau', type: 'select', options: ['Débutant', 'Intermédiaire', 'Avancé', 'Expert', 'Natif'] }
            ],
            'logiciels': [
                { name: 'version', label: 'Version', type: 'text' },
                { name: 'editeur', label: 'Éditeur', type: 'text' },
                { name: 'type', label: 'Type', type: 'select', options: ['Bureautique', 'Développement', 'Graphisme', 'Système', 'Sécurité'] }
            ],
            'type_de_conges': [
                { name: 'dureeMax', label: 'Durée max (jours)', type: 'number' },
                { name: 'paye', label: 'Payé', type: 'checkbox' }
            ],
            'sanctions': [
                { name: 'niveau', label: 'Niveau', type: 'select', options: ['Avertissement', 'Blâme', 'Mise à pied', 'Rétrogradation', 'Licenciement'] },
                { name: 'duree', label: 'Durée', type: 'text' }
            ],
            'niveau_langues': [
                { name: 'niveau', label: 'Niveau', type: 'select', options: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] }
            ],
            'niveau_informatiques': [
                { name: 'niveau', label: 'Niveau', type: 'select', options: ['Débutant', 'Intermédiaire', 'Avancé', 'Expert'] }
            ],
            'type_etablissements': [
                { name: 'type', label: 'Type', type: 'select', options: ['Université', 'École', 'Centre de formation', 'Institut'] }
            ],
            // Tables d'institutions
            'agents-institutions': [
                { name: 'matricule', label: 'Matricule', type: 'text' },
                { name: 'nom', label: 'Nom', type: 'text' },
                { name: 'prenom', label: 'Prénoms', type: 'text' },
                { name: 'date_naissance', label: 'Date de naissance', type: 'date' },
                { name: 'lieu_naissance', label: 'Lieu de naissance', type: 'text' },
                { name: 'telephone', label: 'Téléphone', type: 'tel' },
                { name: 'email', label: 'Email', type: 'email' },
                { name: 'adresse', label: 'Adresse', type: 'textarea' },
                { name: 'id_civilite', label: 'Civilité', type: 'select', dynamicTable: 'civilites', dynamicField: 'libelle' },
                { name: 'id_situation_matrimoniale', label: 'Situation matrimoniale', type: 'select', dynamicTable: 'situation_matrimonials', dynamicField: 'libelle' },
                { name: 'id_nationalite', label: 'Nationalité', type: 'select', dynamicTable: 'nationalites', dynamicField: 'libelle' },
                { name: 'id_type_agent', label: 'Type d\'agent', type: 'select', dynamicTable: 'type_d_agents', dynamicField: 'libelle' },
                { name: 'id_institution', label: 'Institution', type: 'select', dynamicTable: 'institutions', dynamicField: 'nom' },
                { name: 'id_entite', label: 'Entité', type: 'select', dynamicTable: 'entites-institutions', dynamicField: 'nom' }
            ],
            'enfants-institutions': [
                { name: 'nom', label: 'Nom', type: 'text' },
                { name: 'prenom', label: 'Prénoms', type: 'text' },
                { name: 'date_naissance', label: 'Date de naissance', type: 'date' },
                { name: 'lieu_naissance', label: 'Lieu de naissance', type: 'text' },
                { name: 'id_agent', label: 'Agent parent', type: 'select', dynamicTable: 'agents-institutions', dynamicField: 'nom' }
            ],
            'entites-institutions': [
                { name: 'nom', label: 'Nom', type: 'text' },
                { name: 'description', label: 'Description', type: 'textarea' },
                { name: 'id_institution', label: 'Institution', type: 'select', dynamicTable: 'institutions', dynamicField: 'nom' },
                { name: 'id_entite_parent', label: 'Entité parent', type: 'select', dynamicTable: 'entites-institutions', dynamicField: 'nom' }
            ],
            'services-institutions': [
                { name: 'libelle', label: 'Libellé', type: 'text' },
                { name: 'description', label: 'Description', type: 'textarea' },
                { name: 'id_institution', label: 'Institution', type: 'select', dynamicTable: 'institutions', dynamicField: 'nom' }
            ],
            'type-seminaire-institutions': [
                { name: 'libelle', label: 'Libellé', type: 'text' },
                { name: 'description', label: 'Description', type: 'textarea' },
                { name: 'id_institution', label: 'Institution', type: 'select', dynamicTable: 'institutions', dynamicField: 'nom' }
            ],
            'type-documents-institutions': [
                { name: 'libelle', label: 'Libellé', type: 'text' },
                { name: 'id_service', label: 'Service', type: 'select', dynamicTable: 'services-institutions', dynamicField: 'libelle' },
                { name: 'id_institution', label: 'Institution', type: 'select', dynamicTable: 'institutions', dynamicField: 'nom' }
            ],
            'tiers-institutions': [
                { name: 'nom', label: 'Nom', type: 'text' },
                { name: 'prenom', label: 'Prénoms', type: 'text' },
                { name: 'telephone', label: 'Téléphone', type: 'tel' },
                { name: 'adresse', label: 'Adresse', type: 'textarea' },
                { name: 'id_institution', label: 'Institution', type: 'select', dynamicTable: 'institutions', dynamicField: 'nom' }
            ],
            'dossiers-institutions': [
                { name: 'libelle', label: 'Libellé', type: 'text' },
                { name: 'id_institution', label: 'Institution', type: 'select', dynamicTable: 'institutions', dynamicField: 'nom' },
                { name: 'id_entite', label: 'Entité', type: 'select', dynamicTable: 'entites-institutions', dynamicField: 'nom' }
            ],
            'classeurs-institutions': [
                { name: 'libelle', label: 'Libellé', type: 'text' },
                { name: 'id_institution', label: 'Institution', type: 'select', dynamicTable: 'institutions', dynamicField: 'nom' },
                { name: 'id_dossier', label: 'Dossier', type: 'select', dynamicTable: 'dossiers-institutions', dynamicField: 'libelle' }
            ],
            'agents-entites-institutions': [
                { name: 'id_agent', label: 'Agent', type: 'select', dynamicTable: 'agents-institutions', dynamicField: 'nom' },
                { name: 'id_entite', label: 'Entité', type: 'select', dynamicTable: 'entites-institutions', dynamicField: 'nom' },
                { name: 'date_debut', label: 'Date de début', type: 'date' },
                { name: 'date_fin', label: 'Date de fin', type: 'date' },
                { name: 'statut', label: 'Statut', type: 'select', options: ['Actif', 'Inactif', 'Suspendu'] }
            ],
            'affectations-temporaires-institutions': [
                { name: 'id_agent', label: 'Agent', type: 'select', dynamicTable: 'agents-institutions', dynamicField: 'nom' },
                { name: 'id_entite', label: 'Entité', type: 'select', dynamicTable: 'entites-institutions', dynamicField: 'nom' },
                { name: 'date_debut', label: 'Date de début', type: 'date' },
                { name: 'date_fin', label: 'Date de fin', type: 'date' },
                { name: 'motif', label: 'Motif', type: 'textarea' },
                { name: 'statut', label: 'Statut', type: 'select', options: ['En cours', 'Terminé', 'Annulé'] }
            ],
            'permissions-entites-institutions': [
                { name: 'id_agent', label: 'Agent', type: 'select', dynamicTable: 'agents-institutions', dynamicField: 'nom' },
                { name: 'id_entite', label: 'Entité', type: 'select', dynamicTable: 'entites-institutions', dynamicField: 'nom' },
                { name: 'type_permission', label: 'Type de permission', type: 'select', options: ['Lecture', 'Écriture', 'Administration', 'Suppression'] },
                { name: 'date_debut', label: 'Date de début', type: 'date' },
                { name: 'date_fin', label: 'Date de fin', type: 'date' },
                { name: 'statut', label: 'Statut', type: 'select', options: ['Actif', 'Inactif', 'Expiré'] }
            ],
            // Tables géographiques
            'regions': [
                { name: 'code', label: 'Code', type: 'text', placeholder: 'Ex: ABJ, YAM' },
                { name: 'libele', label: 'Libellé', type: 'text', placeholder: 'Nom de la région' },
                { name: 'chef_lieu', label: 'Chef-lieu', type: 'text', placeholder: 'Chef-lieu de la région' },
                { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Description de la région' },
                { name: 'is_active', label: 'Actif', type: 'checkbox' }
            ],
            'departements': [
                { name: 'code', label: 'Code', type: 'text', placeholder: 'Ex: ABJ-01' },
                { name: 'libele', label: 'Libellé', type: 'text', placeholder: 'Nom du département' },
                { name: 'chef_lieu', label: 'Chef-lieu', type: 'text', placeholder: 'Chef-lieu du département' },
                { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Description du département' },
                { name: 'id_region', label: 'Région', type: 'select', dynamicTable: 'regions', dynamicField: 'libele' },
                { name: 'is_active', label: 'Actif', type: 'checkbox' }
            ],
            'localites': [
                { name: 'code', label: 'Code', type: 'text', placeholder: 'Ex: ABJ-01-001' },
                { name: 'libele', label: 'Libellé', type: 'text', placeholder: 'Nom de la localité' },
                { name: 'type_localite', label: 'Type de localité', type: 'select', options: ['commune', 'ville', 'village', 'quartier', 'secteur'] },
                { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Description de la localité' },
                { name: 'id_departement', label: 'Département', type: 'select', dynamicTable: 'departements', dynamicField: 'libele' },
                { name: 'is_active', label: 'Actif', type: 'checkbox' }
            ],
            'services': [
                { name: 'libelle', label: 'Libellé', type: 'text', placeholder: 'Nom du service', required: true },
                { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Description du service' },
                { name: 'responsable_id', label: 'Chef de service', type: 'select', dynamicTable: 'agents', dynamicField: 'nom_complet', required: true }
            ],
            'entites': [
                { name: 'code', label: 'Code', type: 'text', placeholder: 'Code de l\'entité', required: true },
                { name: 'nom', label: 'Nom', type: 'text', placeholder: 'Nom de l\'entité', required: true },
                { name: 'sigle', label: 'Sigle', type: 'text', placeholder: 'Sigle de l\'entité' },
                { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Description de l\'entité' },
                { name: 'type_entite', label: 'Type d\'entité', type: 'select', options: ['direction', 'service', 'bureau', 'division', 'cellule', 'unité'] },
                { name: 'niveau_hierarchique', label: 'Niveau hiérarchique', type: 'number', placeholder: '1-10', min: 1, max: 10 },
                { name: 'adresse', label: 'Adresse', type: 'textarea', placeholder: 'Adresse de l\'entité' },
                { name: 'telephone', label: 'Téléphone', type: 'text', placeholder: 'Numéro de téléphone' },
                { name: 'email', label: 'Email', type: 'email', placeholder: 'Adresse email' },
                { name: 'id_region', label: 'Région', type: 'select', dynamicTable: 'regions', dynamicField: 'libele' },
                { name: 'id_departement', label: 'Département', type: 'select', dynamicTable: 'departements', dynamicField: 'libele' },
                { name: 'id_localite', label: 'Localité', type: 'select', dynamicTable: 'localites', dynamicField: 'libele' },
                { name: 'is_active', label: 'Actif', type: 'checkbox' }
            ]
        };

        return specificFields[routeId] || [];
    };

    // Obtenir les champs spécifiques
    const specificFields = getSpecificFields(routeId);
    
    // Si des champs spécifiques sont définis, les utiliser, sinon utiliser les champs par défaut
    const fields = specificFields.length > 0 ? specificFields : defaultFields;
    
    // Champs de recherche spécifiques selon le type de route
    const getSearchFields = (routeId) => {
        const searchFieldsMap = {
            'agents-institutions': ['matricule', 'nom', 'prenom', 'email'],
            'enfants-institutions': ['nom', 'prenom', 'lieu_naissance'],
            'entites-institutions': ['nom', 'description'],
            'services-institutions': ['libelle', 'description'],
            'type-seminaire-institutions': ['libelle', 'description'],
            'type-documents-institutions': ['libelle'],
            'tiers-institutions': ['nom', 'prenom', 'telephone'],
            'dossiers-institutions': ['libelle'],
            'classeurs-institutions': ['libelle'],
            'agents-entites-institutions': ['statut'],
            'affectations-temporaires-institutions': ['motif', 'statut'],
            'permissions-entites-institutions': ['type_permission', 'statut'],
            // Tables géographiques
            'regions': ['code', 'libele', 'chef_lieu'],
            'departements': ['code', 'libele', 'chef_lieu'],
            'localites': ['code', 'libele', 'type_localite'],
            'pays': ['libele', 'nationalite_libele']
        };
        
        return searchFieldsMap[routeId] || ['code', 'libele', 'description'];
    };
    
    const searchFields = getSearchFields(routeId);

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
            apiEndpoint={`/api/${route.id}`}
            fields={fields}
            searchFields={searchFields}
            user={user}
        />
    );
};

export default RouteManagementPage;
