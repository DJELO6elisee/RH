// Configuration des routes basée sur le backend
export const backendRoutes = [
    /*
    // Tableau de bord pour les agents
    {
        id: 'agent-dashboard',
        name: 'Tableau de bord',
        path: '/agent-dashboard',
        icon: 'MdDashboard',
        description: 'Tableau de bord personnel de l\'agent',
        category: 'Tableau de bord'
    },
    // Tableau de bord pour le DRH
    {
        id: 'drh-dashboard',
        name: 'Espace Personnel DRH',
        path: '/drh-dashboard',
        icon: 'MdAssignment',
        description: 'Espace personnel du Directeur des Ressources Humaines - Demandes et Documents',
        category: 'Tableau de bord',
        isAgentRoute: false,
        roles: ['drh', 'DRH']
    },
    */
    // Gestion des agents

    {
        id: 'fiche-signaletique',
        name: 'Fiche Signalétique',
        path: '/fiche-signaletique',
        icon: 'MdDescription',
        description: 'Génération et consultation des fiches signalétiques',
        category: 'États et Rapports'
    },
    {
        id: 'agents_reports',
        name: 'États des Agents',
        path: '/agents-reports',
        icon: 'MdAssessment',
        description: 'États et rapports sur les agents',
        category: 'États et Rapports'
    },
    {
        id: 'projections_retraites',
        name: 'Projections des retraites',
        path: '/projections-retraites',
        icon: 'MdDateRange',
        description: 'Rapport hiérarchique en excluant les départs à la retraite dans les prochaines années',
        category: 'États et Rapports'
    },
    {
        id: 'agents_by_type_report',
        name: 'Agents par Type',
        path: '/agents-by-type-report',
        icon: 'MdPieChart',
        description: 'Répartition des agents par type',
        category: 'États et Rapports'
    },
    {
        id: 'agents_by_service_report',
        name: 'Agents par Direction',
        path: '/agents-by-direction-report',
        icon: 'MdBarChart',
        description: 'Répartition des agents par direction',
        category: 'États et Rapports'
    },
    {
        id: 'drh-parametres',
        name: 'Paramètres du compte',
        path: '/drh-parametres',
        icon: 'MdSettings',
        description: 'Paramètres du compte DRH (mot de passe, langue)',
        category: 'Paramètres',
        roles: ['drh', 'DRH']
    },
    // {
    //     id: 'auth',
    //     name: 'Authentification',
    //     path: '/auth',
    //     icon: 'MdLock',
    //     description: 'Gestion des authentifications',
    //     category: 'Paramètres',
    //     customEndpoint: '/api/user-accounts'
    // },
    /*
    {
        id: 'civilites',
        name: 'Civilités',
        path: '/civilites',
        icon: 'MdTitle',
        description: 'Gestion des civilités',
        category: 'Identité'
    },
    {
        id: 'nationalites',
        name: 'Nationalités',
        path: '/nationalites',
        icon: 'MdPublic',
        description: 'Gestion des nationalités',
        category: 'Identité'
    },
    {
        id: 'situation_matrimonials',
        name: 'Situations Matrimoniales',
        path: '/situation-matrimoniale',
        icon: 'MdFavorite',
        description: 'Gestion des situations matrimoniales',
        category: 'Identité'
    },
    // {
    //     id: 'type-d-agents',
    //     name: 'Types d\'Agents',
    //     path: '/type-d-agents',
    //     icon: 'MdGroup',
    //     description: 'Gestion des types d\'agents',
    //     category: 'Identité'
    // },
    {
        id: 'categories',
        name: 'Catégories',
        path: '/categories',
        icon: 'MdCategory',
        description: 'Gestion des catégories de personnel',
        category: 'ELEMENTS DU PROFIL DE CARRIERE'
    },
    {
        id: 'grades',
        name: 'Grades',
        path: '/grades',
        icon: 'MdStar',
        description: 'Gestion des grades',
        category: 'ELEMENTS DU PROFIL DE CARRIERE'
    },
    {
        id: 'echelons',
        name: 'Échelons',
        path: '/echelons',
        icon: 'MdTrendingUp',
        description: 'Gestion des échelons et indices',
        category: 'ELEMENTS DU PROFIL DE CARRIERE'
    },
    {
        id: 'emplois',
        name: 'creations des emplois',
        path: '/emplois',
        icon: 'MdAssignment',
        description: 'Gestion des emplois',
        category: 'ELEMENTS DU PROFIL DE CARRIERE'
    },
    */
    {
        id: 'ministeres',
        name: 'Ministères',
        path: '/ministeres',
        icon: 'MdAccountBalance',
        description: 'Gestion des ministères',
        category: 'Organisation'
    },
    {
        id: 'entites',
        name: 'Entités',
        path: '/entites',
        icon: 'MdBusiness',
        description: 'Gestion des entités organisationnelles',
        category: 'Organisation'
    },
    {
        id: 'institutions',
        name: 'Institutions',
        path: '/institutions',
        icon: 'MdBusiness',
        description: 'Gestion des institutions',
        category: 'Organisation'
    },
    {
        id: 'agents-institutions',
        name: 'Agents Institutions',
        path: '/agents-institutions',
        icon: 'MdPerson',
        description: 'Gestion des agents des institutions',
        category: 'Institutions'
    },
    {
        id: 'enfants-institutions',
        name: 'Enfants Institutions',
        path: '/enfants-institutions',
        icon: 'MdChildCare',
        description: 'Gestion des enfants des agents institutions',
        category: 'Institutions'
    },
    {
        id: 'entites-institutions',
        name: 'Entités Institutions',
        path: '/entites-institutions',
        icon: 'MdAccountTree',
        description: 'Gestion des entités des institutions',
        category: 'Institutions'
    },
    {
        id: 'services-institutions',
        name: 'Services Institutions',
        path: '/services-institutions',
        icon: 'MdWork',
        description: 'Gestion des services des institutions',
        category: 'Institutions'
    },
    {
        id: 'type-seminaire-institutions',
        name: 'Types Séminaires Institutions',
        path: '/type-seminaire-institutions',
        icon: 'MdEventNote',
        description: 'Gestion des types de séminaires des institutions',
        category: 'Institutions'
    },
    {
        id: 'type-documents-institutions',
        name: 'Types Documents Institutions',
        path: '/type-documents-institutions',
        icon: 'MdDescription',
        description: 'Gestion des types de documents des institutions',
        category: 'Institutions'
    },
    {
        id: 'tiers-institutions',
        name: 'Tiers Institutions',
        path: '/tiers-institutions',
        icon: 'MdPeople',
        description: 'Gestion des tiers des institutions',
        category: 'Institutions'
    },
    {
        id: 'dossiers-institutions',
        name: 'Dossiers Institutions',
        path: '/dossiers-institutions',
        icon: 'MdFolder',
        description: 'Gestion des dossiers des institutions',
        category: 'Institutions'
    },
    {
        id: 'classeurs-institutions',
        name: 'Classeurs Institutions',
        path: '/classeurs-institutions',
        icon: 'MdFolderOpen',
        description: 'Gestion des classeurs des institutions',
        category: 'Institutions'
    },
    {
        id: 'agents-entites-institutions',
        name: 'Agents Entités Institutions',
        path: '/agents-entites-institutions',
        icon: 'MdGroup',
        description: 'Gestion des affectations agents-entités institutions',
        category: 'Institutions'
    },
    {
        id: 'affectations-temporaires-institutions',
        name: 'Affectations Temporaires Institutions',
        path: '/affectations-temporaires-institutions',
        icon: 'MdSwapHoriz',
        description: 'Gestion des affectations temporaires institutions',
        category: 'Institutions'
    },
    {
        id: 'permissions-entites-institutions',
        name: 'Permissions Entités Institutions',
        path: '/permissions-entites-institutions',
        icon: 'MdSecurity',
        description: 'Gestion des permissions entités institutions',
        category: 'Institutions'
    },
    {
        id: 'directions-generales',
        name: 'Directions générales',
        path: '/directions-generales',
        icon: 'MdAccountBalance',
        description: 'Gestion des directions générales du ministère',
        category: 'Organisation'
    },
    {
        id: 'directions',
        name: 'Directions',
        path: '/directions',
        icon: 'MdWork',
        description: 'Gestion des directions du ministère',
        category: 'Organisation'
    },

    {
        id: 'sous-directions',
        name: 'Sous-directions',
        path: '/sous-directions',
        icon: 'MdAccountTree',
        description: 'Gestion des sous-directions du ministère',
        category: 'Organisation'
    },
    {
        id: 'services',
        name: 'Services',
        path: '/services',
        icon: 'MdBusiness',
        description: 'Gestion des services directs du ministère',
        category: 'Organisation'
    },
    {
        id: 'services-entites-ministres',
        name: 'Services des Entités',
        path: '/services-entites-ministres',
        icon: 'MdAccountTree',
        description: 'Gestion des services des entités rattachées au ministère',
        category: 'Organisation'
    },
    /*
    {
        id: 'fonctions',
        name: 'Creation des fonctions',
        path: '/fonctions',
        icon: 'MdBusinessCenter',
        description: 'Gestion des fonctions',
        category: 'ELEMENTS DU PROFIL DE CARRIERE'
    },
    */

    // {
    //     id: 'echelons',
    //     name: 'Échelons',
    //     path: '/echelons',
    //     icon: 'MdTrendingUp',
    //     description: 'Gestion des échelons',
    //     category: 'Carrière'
    // },
    // {
    //     id: 'type_d_agents',
    //     name: 'Types d\'Agents',
    //     path: '/type-d-agents',
    //     icon: 'MdGroup',
    //     description: 'Gestion des types d\'agents',
    //     category: 'Gestion du Personnel'
    // },
    {
        id: 'agents',
        name: 'Agents',
        path: '/agents',
        icon: 'MdPerson',
        description: 'Gestion des agents et employés',
        category: 'Gestion du Personnel'
    },
    {
        id: 'positions-agents',
        name: 'Positions actuelles des agents',
        path: '/positions-agents',
        icon: 'MdPlace',
        description: 'Consultation de la position actuelle de chaque agent',
        category: 'Gestion du Personnel'
    },
    // {
    //     id: 'retraites',
    //     name: 'Retraites',
    //     path: '/retraites',
    //     icon: 'MdExitToApp',
    //     description: 'Gestion des agents à la retraite',
    //     category: 'Gestion du Personnel'
    // },
    {
        id: 'verification-retraite',
        name: 'Vérification de Retraite',
        path: '/verification-retraite',
        icon: 'MdVisibility',
        description: 'Contrôle des retraites par direction, service et agent',
        category: 'Gestion du Personnel'
    },
    // {
    //     id: 'prolongement-retraite',
    //     name: 'Prolongement Retraite',
    //     path: '/prolongement-retraite',
    //     icon: 'MdTrendingUp',
    //     description: 'Gestion des prolongements individuels de retraite',
    //     category: 'Gestion du Personnel'
    // },
    // {
    //     id: 'jours-conges',
    //     name: 'Jours de congés',
    //     path: '/jours-conges',
    //     icon: 'MdEvent',
    //     description: 'Gestion des jours de congés des agents',
    //     category: 'Gestion du Personnel'
    // },
    // {
    //     id: 'planning-previsionnel-conges',
    //     name: 'Planning prévisionnel des Départs en congés',
    //     path: '/planning-previsionnel-conges',
    //     icon: 'MdEventNote',
    //     description: 'Planning prévisionnel des Départs en congés',
    //     category: 'Gestion du Personnel'
    // },



    // {
    //     id: 'gestion-mariages',
    //     name: 'Gestion des mariages',
    //     path: '/gestion-mariages',
    //     icon: 'MdFavorite',
    //     description: 'Gestion des mariages des agents',
    //     category: 'Gestion du Personnel'
    // },
    {
        id: 'historique-des-agents',
        name: 'Historique des Agents',
        path: '/historique-des-agents',
        icon: 'MdHistory',
        description: 'Historique et suivi des agents',
        category: 'Gestion du Personnel'
    },
    {
        id: 'agents-mise-a-disposition',
        name: 'Agents Mise à Disposition',
        path: '/agents-mise-a-disposition',
        icon: 'MdSwapHoriz',
        description: 'Liste des agents retirés avec le motif Mise à disposition',
        category: 'Gestion du Personnel'
    },
    // {
    //     id: 'besoins-en-agents',
    //     name: 'Besoins en personnel',
    //     path: '/besoins-en-agents',
    //     icon: 'MdPersonAdd',
    //     description: 'Gestion et validation des besoins en personnel (DRH)',
    //     category: 'Gestion du Personnel',
    //     // roles: ['drh', 'DRH']
    // },
    {
        id: 'agent-user-accounts',
        name: 'Gestion des comptes utilisateur des agents',
        path: '/agent-user-accounts',
        icon: 'MdSecurity',
        description: 'Création, gestion et réinitialisation des comptes agents',
        category: 'Paramètres'
    },
    {
        id: 'attribution-taches-agents',
        name: 'Attribution des Tâches aux agents',
        path: '/attribution-taches-agents',
        icon: 'MdAssignment',
        description: 'Gestion et attribution des tâches aux agents',
        category: 'Paramètres'
    },
    /*
    {
        id: 'categories',
        name: 'Catégories',
        path: '/categories',
        icon: 'MdCategory',
        description: 'Gestion des catégories',
        category: 'Identité'
    },
    {
        id: 'diplomes',
        name: 'Diplômes',
        path: '/diplomes',
        icon: 'MdSchool',
        description: 'Gestion des diplômes',
        category: 'Formation'
    },
    {
        id: 'distinctions',
        name: 'Distinctions',
        path: '/distinctions',
        icon: 'MdEmojiEvents',
        description: 'Gestion des distinctions',
        category: 'Récompenses'
    },
    {
        id: 'specialites',
        name: 'Spécialités',
        path: '/specialites',
        icon: 'MdScience',
        description: 'Gestion des spécialités',
        category: 'Compétences'
    },
    {
        id: 'langues',
        name: 'Langues',
        path: '/langues',
        icon: 'MdLanguage',
        description: 'Gestion des langues',
        category: 'Compétences'
    },
    {
        id: 'niveau_langues',
        name: 'Niveaux de Langues',
        path: '/niveau-langues',
        icon: 'MdTranslate',
        description: 'Gestion des niveaux de langues',
        category: 'Compétences'
    },
    {
        id: 'logiciels',
        name: 'Logiciels',
        path: '/logiciels',
        icon: 'MdComputer',
        description: 'Gestion des logiciels',
        category: 'Compétences'
    },
    {
        id: 'niveau_informatiques',
        name: 'Niveaux Informatiques',
        path: '/niveau-informatiques',
        icon: 'MdCode',
        description: 'Gestion des niveaux informatiques',
        category: 'Compétences'
    },
    */
    // {
    //     id: 'positions',
    //     name: 'Types de Positions',
    //     path: '/positions',
    //     icon: 'MdPlace',
    //     description: 'Gestion des positions',
    //     category: 'Positions'
    // },
    // {
    //     id: 'type_de_conges',
    //     name: 'Types de Congés',
    //     path: '/type-conges',
    //     icon: 'MdEvent',
    //     description: 'Gestion des types de congés',
    //     category: 'Positions'
    // },
    // {
    //     id: 'autre_absences',
    //     name: 'Autres Absences',
    //     path: '/autre-absences',
    //     icon: 'MdEventBusy',
    //     description: 'Gestion des autres absences',
    //     category: 'Positions'
    // },
    // {
    //     id: 'mode_d_entrees',
    //     name: 'Modes d\'Entrée',
    //     path: '/mode-entrees',
    //     icon: 'MdInput',
    //     description: 'Gestion des modes d\'entrée',
    //     category: 'Recrutement'
    // },
    // {
    //     id: 'motif_de_departs',
    //     name: 'Motifs de Départ',
    //     path: '/motif-departs',
    //     icon: 'MdExitToApp',
    //     description: 'Gestion des motifs de départ',
    //     category: 'Départ'
    // },
    // {
    //     id: 'type_de_retraites',
    //     name: 'Types de Retraite',
    //     path: '/type-retraites',
    //     icon: 'MdWork',
    //     description: 'Gestion des types de retraite',
    //     category: 'Départ'
    // },
    /*
    {
        id: 'nationalites',
        name: 'Nationalités',
        path: '/nationalites',
        icon: 'MdPublic',
        description: 'Gestion des nationalités',
        category: 'Identité'
    },
    {
        id: 'pays',
        name: 'Pays',
        path: '/pays',
        icon: 'MdMap',
        description: 'Gestion des pays',
        category: 'Identité'
    },
    */
    {
        id: 'regions',
        name: 'Régions',
        path: '/regions',
        icon: 'MdMap',
        description: 'Gestion des régions administratives',
        category: 'Découpage administratif'
    },
    {
        id: 'departements',
        name: 'Départements',
        path: '/departements',
        icon: 'MdBusiness',
        description: 'Gestion des départements',
        category: 'Découpage administratif'
    },
    {
        id: 'localites',
        name: 'Localités',
        path: '/localites',
        icon: 'MdLocationOn',
        description: 'Gestion des localités',
        category: 'Découpage administratif'
    },
    /*
    {
        id: 'enfants',
        name: 'Enfants',
        path: '/enfants',
        icon: 'MdChildCare',
        description: 'Gestion des enfants',
        category: 'Famille'
    },
    {
        id: 'handicaps',
        name: 'Handicaps',
        path: '/handicaps',
        icon: 'MdAccessibility',
        description: 'Gestion des handicaps',
        category: 'Etats de Santé Physique'
    },
    {
        id: 'pathologies',
        name: 'Pathologies',
        path: '/pathologies',
        icon: 'MdHealthAndSafety',
        description: 'Gestion des pathologies',
        category: 'Etats de Santé Physique'
    },
    {
        id: 'nature_d_accidents',
        name: 'Nature d\'Accidents',
        path: '/nature-accidents',
        icon: 'MdWarning',
        description: 'Gestion des natures d\'accidents',
        category: 'Etats de Santé Physique'
    },
    {
        id: 'sanctions',
        name: 'Sanctions',
        path: '/sanctions',
        icon: 'MdGavel',
        description: 'Gestion des sanctions',
        category: 'Discipline'
    },
    */
    // {
    //     id: 'nature_actes',
    //     name: 'Nature d\'Actes',
    //     path: '/nature-actes',
    //     icon: 'MdDescription',
    //     description: 'Gestion des natures d\'actes',
    //     category: 'Documents'
    // },
    // {
    //     id: 'type_de_documents',
    //     name: 'Types de Documents',
    //     path: '/type-documents',
    //     icon: 'MdDescription',
    //     description: 'Gestion des types de documents',
    //     category: 'Documents'
    // },
    // {
    //     id: 'type_de_couriers',
    //     name: 'Types de Courriers',
    //     path: '/type-courriers',
    //     icon: 'MdMail',
    //     description: 'Gestion des types de courriers',
    //     category: 'Documents'
    // },
    // {
    //     id: 'type_de_destinations',
    //     name: 'Types de Destinations',
    //     path: '/type-destinations',
    //     icon: 'MdSend',
    //     description: 'Gestion des types de destinations',
    //     category: 'Documents'
    // },
    /*
    {
        id: 'type_de_seminaire_de_formation',
        name: 'Types de formations',
        path: '/type-seminaires',
        icon: 'MdEventNote',
        description: 'Gestion des types de formations',
        category: 'Formation'
    },
    {
        id: 'seminaire_formation',
        name: 'Séminaires de Formation',
        path: '/seminaire-formation',
        icon: 'MdEvent',
        description: 'Gestion des séminaires et formations suivis par les agents',
        category: 'Formation'
    },
    {
        id: 'gestion_evenements',
        name: 'Gestion des Événements',
        path: '/gestion-evenements',
        icon: 'MdEventNote',
        description: 'Gestion des événements avec sélection de participants et impression',
        category: 'Formation'
    },
    */
    // {
    //     id: 'type_etablissements',
    //     name: 'Types d\'Établissements',
    //     path: '/type-etablissements',
    //     icon: 'MdBusiness',
    //     description: 'Gestion des types d\'établissements',
    //     category: 'Organisation'
    // },
    // {
    //     id: 'unite_administratives',
    //     name: 'Unités Administratives',
    //     path: '/unite-administratives',
    //     icon: 'MdAccountTree',
    //     description: 'Gestion des unités administratives',
    //     category: 'Organisation'
    // },
    /*
    {
        id: 'sindicats',
        name: 'Syndicats et Associations',
        path: '/sindicats',
        icon: 'MdGroupWork',
        description: 'Gestion des syndicats',
        category: 'Vie Associative'
    },
    */
    // {
    //     id: 'dossiers',
    //     name: 'Dossiers',
    //     path: '/dossiers',
    //     icon: 'MdFolder',
    //     description: 'Gestion des dossiers',
    //     category: 'Documents'
    // },
    // {
    //     id: 'classeurs',
    //     name: 'Classeurs',
    //     path: '/classeurs',
    //     icon: 'MdFolderOpen',
    //     description: 'Gestion des classeurs',
    //     category: 'Documents'
    // },
    // Routes pour les nominations
    {
        id: 'agent-fonctions',
        name: 'Fonctions des Agents',
        path: '/agent-fonctions',
        icon: 'MdAssignment',
        description: 'Gestion des fonctions des agents',
        category: 'PROFIL DE CARRIERE'
    },
    {
        id: 'agent-emplois',
        name: 'Emplois des Agents',
        path: '/agent-emplois',
        icon: 'MdWork',
        description: 'Gestion des emplois des agents',
        category: 'PROFIL DE CARRIERE'
    },
    {
        id: 'agent-grades',
        name: 'Grades des Agents',
        path: '/agent-grades',
        icon: 'MdStar',
        description: 'Gestion des grades des agents',
        category: 'PROFIL DE CARRIERE'
    },
    {
        id: 'agent-echelons',
        name: 'Échelons des Agents',
        path: '/agent-echelons',
        icon: 'MdTrendingUp',
        description: 'Gestion des échelons des agents',
        category: 'PROFIL DE CARRIERE'
    },
    {
        id: 'agent-categories',
        name: 'Catégories des Agents',
        path: '/agent-categories',
        icon: 'MdCategory',
        description: 'Consultation des catégories des agents',
        category: 'PROFIL DE CARRIERE'
    },
    /*
    // Routes pour la gestion des documents administratifs
    {
        id: 'demande-absence',
        name: 'Autorisation d\'absence',
        path: '/demande-absence',
        icon: 'MdEventBusy',
        description: 'Gestion des autorisations d\'absence',
        category: 'Gestions des documents administratifs'
    },
    {
        id: 'demande-sortie-territoire',
        name: 'Autorisation de sortie du territoire',
        path: '/demande-sortie-territoire',
        icon: 'MdFlight',
        description: 'Gestion des autorisations de sortie du territoire',
        category: 'Gestions des documents administratifs'
    },
    {
        id: 'demande-attestation-travail',
        name: 'Attestation de travail',
        path: '/demande-attestation-travail',
        icon: 'MdDescription',
        description: 'Gestion des autorisations d\'attestation de travail',
        category: 'Gestions des documents administratifs'
    },
    {
        id: 'autorisation-conges',
        name: 'Demande de congé',
        path: '/autorisation-conges',
        icon: 'MdEventNote',
        description: 'Gestion des autorisations de congé',
        category: 'Gestions des documents administratifs'
    },
    {
        id: 'attestation-presence',
        name: 'Attestation de présence',
        path: '/attestation-presence',
        icon: 'MdCheckCircle',
        description: 'Gestion des attestations de présence',
        category: 'Gestions des documents administratifs'
    },
    {
        id: 'note-service',
        name: 'Envoie de note de service',
        path: '/note-service',
        icon: 'MdNote',
        description: 'Gestion des notes de service des agents',
        category: 'Gestions des documents administratifs'
    },
    {
        id: 'notes-de-service',
        name: 'Note de service des agents',
        path: '/notes-de-service',
        icon: 'MdNote',
        description: 'Gestion des notes de service des agents',
        category: 'Gestions des documents administratifs'
    },
    {
        id: 'mutations',
        name: 'Mutations',
        path: '/mutations',
        icon: 'MdSwapHoriz',
        description: 'Création directe de mutations d\'agents avec génération automatique des notes de service',
        category: 'Gestions des documents administratifs',
        roles: ['drh', 'DRH']
    },
    {
        id: 'mutations-validation',
        name: 'Validation Mutations',
        path: '/mutations-validation',
        icon: 'MdCheckCircle',
        description: 'Validation des demandes de mutation d\'agents créées par les agents',
        category: 'Gestions des documents administratifs',
        roles: ['drh', 'DRH']
    },
    {
        id: 'certificat-cessation-service',
        name: 'Certificat de cessation de service',
        path: '/certificat-cessation-service',
        icon: 'MdExitToApp',
        description: 'Gestion des certificats de cessation de service',
        category: 'Gestions des documents administratifs'
    },
    {
        id: 'autorisation-reprise-service',
        name: 'Reprise de service',
        path: '/autorisation-reprise-service',
        icon: 'MdAssignment',
        description: 'Gestion des autorisations de reprise de service',
        category: 'Gestions des documents administratifs'
    },
    {
        id: 'certificat-non-jouissance-conge',
        name: 'Demande de Certificat de non jouissance de congé',
        path: '/certificat-non-jouissance-conge',
        icon: 'MdEventBusy',
        description: 'Gestion des demandes de certificat de non jouissance de congé',
        category: 'Gestions des documents administratifs'
    },
    {
        id: 'documents-generated',
        name: 'Consultation des documents demandés',
        path: '/documents-generes',
        icon: 'MdDescription',
        description: 'Consultation et téléchargement des documents d\'autorisation demandés',
        category: 'Gestions des documents administratifs'
    },
    {
        id: 'decision',
        name: 'Décision',
        path: '/decision',
        icon: 'MdGavel',
        description: 'Gestion des décisions collectives et individuelles pour les cessations de service',
        category: 'Gestions des documents administratifs'
    },
    {
        id: 'emargement',
        name: 'Émargement',
        path: '/emargement',
        icon: 'MdBrush',
        description: 'Gestion des signatures des agents pour les autorisations',
        category: 'Gestions des documents administratifs'
    },
    {
        id: 'historiques-demandes',
        name: 'Historique des autorisations',
        path: '/historiques-demandes',
        icon: 'MdHistory',
        description: 'Suivi global et récapitulatif des autorisations sur différentes périodes',
        category: 'Gestions des documents administratifs'
    },
    {
        id: 'generer-documents',
        name: 'Générer des documents',
        path: '/generer-documents',
        icon: 'MdDescription',
        description: 'Génération de documents administratifs (certificats de cessation de service)',
        category: 'Gestions des documents administratifs'
    },
    {
        id: 'certificat-prise-service',
        name: 'Certificat de prise de service',
        path: '/certificat-prise-service',
        icon: 'MdDescription',
        description: 'Gestion et génération des certificats de prise de service pour les agents de la direction',
        category: 'Gestions des documents administratifs',
        roles: ['drh', 'DRH', 'directeur']
    }
    */
];

// Grouper les routes par catégorie
export const routesByCategory = backendRoutes.reduce((acc, route) => {
    if (!acc[route.category]) {
        acc[route.category] = [];
    }
    acc[route.category].push(route);
    return acc;
}, {});

// Obtenir toutes les catégories uniques
export const categories = Object.keys(routesByCategory).sort();
