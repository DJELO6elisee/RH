import React, { useState, useEffect } from 'react';
import ReportsPage from '../components/ReportsPage';
import { MdPeople } from 'react-icons/md';
import { useAuth } from '../contexts/AuthContext';

const AgentsReportsPage = () => {
    const { user } = useAuth();
    const [grades, setGrades] = useState([]);
    const [categories, setCategories] = useState([]);
    const [directionsGenerales, setDirectionsGenerales] = useState([]);
    const [directions, setDirections] = useState([]);
    const [services, setServices] = useState([]);
    const [selectedDirection, setSelectedDirection] = useState('');
    const [typeAgents, setTypeAgents] = useState([]);

    // Charger la liste des types d'agents
    useEffect(() => {
        const fetchTypeAgents = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch('https://tourisme.2ise-groupe.com/api/type_d_agents', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                const result = await response.json();
                if (result.success && Array.isArray(result.data)) {
                    setTypeAgents(result.data);
                } else if (Array.isArray(result)) {
                    setTypeAgents(result);
                }
            } catch (error) {
                console.error('Erreur lors du chargement des types d\'agents:', error);
            }
        };
        fetchTypeAgents();
    }, []);

    // Charger la liste des grades
    useEffect(() => {
        const fetchGrades = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch('https://tourisme.2ise-groupe.com/api/grades?limit=1000', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                const result = await response.json();
                if (result.success && Array.isArray(result.data)) {
                    setGrades(result.data);
                }
            } catch (error) {
                console.error('Erreur lors du chargement des grades:', error);
            }
        };
        fetchGrades();
    }, []);

    // Charger la liste des catégories
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch('https://tourisme.2ise-groupe.com/api/categories?limit=1000', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                const result = await response.json();
                if (result.success && Array.isArray(result.data)) {
                    setCategories(result.data);
                } else if (Array.isArray(result)) {
                    setCategories(result);
                }
            } catch (error) {
                console.error('Erreur lors du chargement des catégories:', error);
            }
        };
        fetchCategories();
    }, []);

    // Charger la liste des directions générales filtrées par ministère
    useEffect(() => {
        const fetchDirectionsGenerales = async () => {
            try {
                const token = localStorage.getItem('token');
                let apiUrl = 'https://tourisme.2ise-groupe.com/api/direction_generale?limit=1000';
                
                // Ajouter le filtre par ministère si l'utilisateur appartient à un ministère
                if (user?.organization?.type === 'ministere' && user?.organization?.id) {
                    apiUrl += `&id_ministere=${user.organization.id}`;
                }
                
                const response = await fetch(apiUrl, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                const result = await response.json();
                if (result.success && Array.isArray(result.data)) {
                    setDirectionsGenerales(result.data);
                } else if (Array.isArray(result)) {
                    setDirectionsGenerales(result);
                }
            } catch (error) {
                console.error('Erreur lors du chargement des directions générales:', error);
            }
        };
        fetchDirectionsGenerales();
    }, [user]);

    // Charger la liste des directions filtrées par ministère
    useEffect(() => {
        const fetchDirections = async () => {
            try {
                const token = localStorage.getItem('token');
                let apiUrl = 'https://tourisme.2ise-groupe.com/api/directions?limit=1000';
                
                // Ajouter le filtre par ministère si l'utilisateur appartient à un ministère
                if (user?.organization?.type === 'ministere' && user?.organization?.id) {
                    apiUrl += `&id_ministere=${user.organization.id}`;
                }
                
                const response = await fetch(apiUrl, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                const result = await response.json();
                if (result.success && Array.isArray(result.data)) {
                    setDirections(result.data);
                }
            } catch (error) {
                console.error('Erreur lors du chargement des directions:', error);
            }
        };
        fetchDirections();
    }, [user]);

    // Charger la liste de tous les services du ministère
    useEffect(() => {
        const fetchServices = async () => {
            try {
                const token = localStorage.getItem('token');
                let apiUrl = 'https://tourisme.2ise-groupe.com/api/services?limit=1000';
                
                // Ajouter le filtre par ministère si l'utilisateur appartient à un ministère
                if (user?.organization?.type === 'ministere' && user?.organization?.id) {
                    apiUrl += `&id_ministere=${user.organization.id}`;
                }
                
                // Si une direction est sélectionnée, filtrer par direction
                if (selectedDirection) {
                    apiUrl += `&id_direction=${selectedDirection}`;
                }
                
                const response = await fetch(apiUrl, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                const result = await response.json();
                if (result.success && Array.isArray(result.data)) {
                    setServices(result.data);
                } else if (Array.isArray(result)) {
                    setServices(result);
                }
            } catch (error) {
                console.error('Erreur lors du chargement des services:', error);
                setServices([]);
            }
        };
        fetchServices();
    }, [selectedDirection, user]);
    // Configuration des champs à afficher - Ordre spécifique pour l'état des agents
    const baseFields = [
        { name: 'matricule', label: 'Matricule' },
        { name: 'nom', label: 'Nom' },
        { name: 'prenom', label: 'Prénoms' },
        { name: 'emploi_libele', label: 'Emploi' },
        { name: 'grade_libele', label: 'Grade' },
        { name: 'echelon_libele', label: 'Echelon' },
        { name: 'fonction_actuelle_libele', label: 'Fonction' },
        { name: 'date_de_naissance', label: 'Date de naissance' },
        { name: 'date_prise_service_dans_la_direction', label: 'Date de Première prise de service' },
        { name: 'date_prise_service_au_ministere', label: 'Date prise service Ministère' },
        { name: 'fonction_date_entree', label: 'Date entree fonction' },
        { name: 'categorie_libele', label: 'Catégorie' },
        { name: 'position_libelle', label: 'Position' },
        { name: 'adresse', label: 'Adresse' },
        { name: 'lieu_de_naissance', label: 'Lieu de naissance' },
        { name: 'telephone1', label: 'Téléphone 1' },
        { name: 'telephone2', label: 'Téléphone 2' },
        { name: 'email', label: 'Email' },
        { name: 'nationalite_libele', label: 'Nationalité' },
        { name: 'type_agent_libele', label: 'Statut agent' },
        { name: 'statut_emploi_libelle', label: 'Statut emploi' },
        { name: 'situation_matrimoniale_libele', label: 'Situation Matrimoniale' },
        { name: 'date_mariage', label: 'Date de Mariage' },
        { name: 'numero_acte_mariage', label: 'Numéro acte de mariage' },
        { name: 'nom_conjointe', label: 'Nom de la conjointe' },
        { name: 'nombre_enfants', label: 'Nombre d\'enfants' },
        { name: 'entite_nom', label: 'Entité' },
        { name: 'direction_libelle', label: 'Direction' },
        { name: 'emploi_date_entree', label: 'Date entree emploi' },
        { name: 'date_fin_contrat', label: 'Date fin contrat' },
        { name: 'date_retraite', label: 'Date retraite' },
        { name: 'handicap', label: 'Handicap' },
        { name: 'pathologie', label: 'Pathologie' }
    ];

    // Les champs sont définis dans baseFields dans l'ordre spécifique pour l'état des agents
    // Pas besoin de champs de directions dynamiques
    const fields = baseFields;

    // Champs de recherche
    const searchFields = [
        'nom',
        'prenom',
        'nom_complet',
        'matricule', 
        'email', 
        'telephone1',
        'telephone2',
        'type_agent_libele',
        'direction_libelle',
        'sous_direction_libelle',
        'service_libelle',
        'entite_nom',
        'fonction_actuelle_libele',
        'emploi_libele',
        'grade_libele',
        'categorie_libele',
        'adresse',
        'lieu_de_naissance'
    ];

    // Filtres disponibles
    const filters = [
        {
            name: 'type_agent',
            label: 'Statut agent',
            type: 'select',
            options: [
                { value: '', label: 'Tous les statuts' },
                ...typeAgents.map(typeAgent => ({
                    value: typeAgent.libele,
                    label: typeAgent.libele
                }))
            ]
        },
        {
            name: 'statut_emploi',
            label: 'Statut',
            type: 'select',
            options: [
                { value: '', label: 'Tous les statuts' },
                { value: 'actif', label: 'Actif' },
                { value: 'inactif', label: 'Inactif' },
                { value: 'retraite', label: 'Retraité' },
                { value: 'demission', label: 'Démission' },
                { value: 'licencie', label: 'Licencié' }
            ]
        },
        {
            name: 'sexe',
            label: 'Sexe',
            type: 'select',
            options: [
                { value: '', label: 'Tous' },
                { value: 'M', label: 'Masculin' },
                { value: 'F', label: 'Féminin' }
            ]
        },
        {
            name: 'id_categorie',
            label: 'Catégorie',
            type: 'select',
            options: [
                { value: '', label: 'Toutes les catégories' },
                ...categories.map(categorie => ({
                    value: categorie.id,
                    label: categorie.libele
                }))
            ]
        },
        {
            name: 'id_grade',
            label: 'Grade',
            type: 'select',
            options: [
                { value: '', label: 'Tous les grades' },
                ...grades.map(grade => ({
                    value: grade.id,
                    label: grade.libele
                }))
            ]
        },
        {
            name: 'id_direction_generale',
            label: 'Direction Générale',
            type: 'select',
            options: [
                { value: '', label: 'Toutes les directions générales' },
                ...directionsGenerales.map(dg => ({
                    value: dg.id,
                    label: dg.libelle
                }))
            ]
        },
        {
            name: 'id_direction',
            label: 'Direction',
            type: 'select',
            options: [
                { value: '', label: 'Toutes les directions' },
                ...directions.map(direction => ({
                    value: direction.id,
                    label: direction.libelle
                }))
            ],
            onChange: (value) => {
                setSelectedDirection(value);
            }
        },
        {
            name: 'id_service',
            label: 'Service',
            type: 'select',
            options: [
                { value: '', label: 'Tous les services' },
                ...services.map(service => ({
                    value: service.id,
                    label: service.libelle
                }))
            ]
        },
        {
            name: 'include_entites',
            label: 'Type d\'affichage',
            type: 'select',
            options: [
                { value: 'true', label: 'Tous les agents (central + entités)' },
                { value: 'false', label: 'Agents centraux seulement' }
            ]
        }
    ];

    return (
        <ReportsPage
            title="États des Agents"
            description="Génération d'états et rapports sur les agents avec possibilité d'export et d'impression"
            apiEndpoint="agents"
            fields={fields}
            searchFields={searchFields}
            filters={filters}
        />
    );
};

export default AgentsReportsPage;
