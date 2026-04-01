import React, { useState, useEffect } from 'react';
import {
    Card,
    CardBody,
    CardHeader,
    Table,
    Button,
    Modal,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Form,
    FormGroup,
    Label,
    Input,
    Row,
    Col,
    Badge,
    Alert,
    Spinner,
    InputGroup,
    InputGroupText,
    Dropdown,
    DropdownToggle,
    DropdownMenu,
    DropdownItem
} from 'reactstrap';
import { MdAdd, MdEdit, MdDelete, MdSearch, MdEvent, MdPerson, MdLocationOn, MdDateRange, MdGroup, MdPersonAdd, MdCheck, MdClose, MdPrint, MdArrowBack } from 'react-icons/md';
import { useHistory } from 'react-router-dom';
import { useAuth } from 'contexts/AuthContext';

const SeminaireFormationPage = () => {
    const history = useHistory();
    const { token } = useAuth();
    const [seminaires, setSeminaires] = useState([]);
    // Plus besoin de state pour les agents car les séminaires ne sont plus liés aux agents
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(false);
    const [editingSeminaire, setEditingSeminaire] = useState(null);
    const [formData, setFormData] = useState({
        theme_seminaire: '',
        date_debut: '',
        date_fin: '',
        lieu: ''
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [alert, setAlert] = useState({ show: false, message: '', type: 'success' });

    // États pour la gestion des participants
    const [participantsModal, setParticipantsModal] = useState(false);
    const [currentSeminaire, setCurrentSeminaire] = useState(null);
    const [participants, setParticipants] = useState([]);
    const [availableAgents, setAvailableAgents] = useState([]);
    const [participantFormData, setParticipantFormData] = useState({
        id_agent: '',
        statut_participation: 'inscrit',
        notes: ''
    });
    const [loadingParticipants, setLoadingParticipants] = useState(false);
    
    // États pour les dropdowns d'impression
    const [printDropdownOpen, setPrintDropdownOpen] = useState({});
    const [globalPrintDropdownOpen, setGlobalPrintDropdownOpen] = useState(false);

    // Charger les données au montage du composant
    useEffect(() => {
        loadSeminaires();

    }, []);

    const loadSeminaires = async () => {
        try {
            setLoading(true);
            const headers = {
                'Content-Type': 'application/json'
            };
            
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch('https://tourisme.2ise-groupe.com/api/seminaire-formation', {
                headers
            });
            
            if (response.ok) {
                const data = await response.json();
                setSeminaires(data);
            } else {
                showAlert('Erreur lors du chargement des séminaires', 'danger');
            }
        } catch (error) {
            console.error('Erreur:', error);
            showAlert('Erreur de connexion au serveur', 'danger');
        } finally {
            setLoading(false);
        }
    };

    // Plus besoin de charger les agents car les séminaires ne sont plus liés aux agents

    const showAlert = (message, type) => {
        setAlert({ show: true, message, type });
        setTimeout(() => setAlert({ show: false, message: '', type: 'success' }), 5000);
    };

    const toggleModal = () => {
        setModal(!modal);
        if (!modal) {
            setEditingSeminaire(null);
            setFormData({
                theme_seminaire: '',
                date_debut: '',
                date_fin: '',
                lieu: ''
            });
        }
    };

    const handleEdit = (seminaire) => {
        setEditingSeminaire(seminaire);
        setFormData({
            theme_seminaire: seminaire.theme_seminaire.toUpperCase(),
            date_debut: seminaire.date_debut,
            date_fin: seminaire.date_fin,
            lieu: seminaire.lieu.toUpperCase()
        });
        setModal(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Validation des champs obligatoires
        if (!formData.theme_seminaire || !formData.date_debut || !formData.date_fin || !formData.lieu) {
            showAlert('Veuillez remplir tous les champs obligatoires', 'danger');
            return;
        }
        
        // Validation des dates
        if (new Date(formData.date_fin) < new Date(formData.date_debut)) {
            showAlert('La date de fin doit être postérieure à la date de début', 'danger');
            return;
        }

        try {
            const url = editingSeminaire 
                ? `https://tourisme.2ise-groupe.com/api/seminaire-formation/${editingSeminaire.id}`
                : 'https://tourisme.2ise-groupe.com/api/seminaire-formation';
            
            const method = editingSeminaire ? 'PUT' : 'POST';
            
            const headers = {
                'Content-Type': 'application/json',
            };
            
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(url, {
                method,
                headers,
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                showAlert(
                    editingSeminaire 
                        ? 'Séminaire mis à jour avec succès' 
                        : 'Séminaire créé avec succès',
                    'success'
                );
                toggleModal();
                loadSeminaires();
            } else {
                const error = await response.json();
                showAlert(error.error || 'Erreur lors de la sauvegarde', 'danger');
            }
        } catch (error) {
            console.error('Erreur:', error);
            showAlert('Erreur de connexion au serveur', 'danger');
        }
    };

    const handleDelete = async (id) => {
        if (window.confirm('Êtes-vous sûr de vouloir supprimer ce séminaire ?')) {
            try {
                const headers = {
                    'Content-Type': 'application/json'
                };
                
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                }

                const response = await fetch(`https://tourisme.2ise-groupe.com/api/seminaire-formation/${id}`, {
                    method: 'DELETE',
                    headers
                });

                if (response.ok) {
                    showAlert('Séminaire supprimé avec succès', 'success');
                    loadSeminaires();
                } else {
                    showAlert('Erreur lors de la suppression', 'danger');
                }
            } catch (error) {
                console.error('Erreur:', error);
                showAlert('Erreur de connexion au serveur', 'danger');
            }
        }
    };

    
    // Fonctions pour la gestion des participants
    const toggleParticipantsModal = (seminaire) => {
        setCurrentSeminaire(seminaire);
        setParticipantsModal(!participantsModal);
        if (!participantsModal && seminaire) {
            loadParticipants(seminaire.id);
            loadAvailableAgents(seminaire.id);
        }
    };

    const loadParticipants = async (seminaireId) => {
        try {
            setLoadingParticipants(true);
            const headers = {
                'Content-Type': 'application/json'
            };
            
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(`https://tourisme.2ise-groupe.com/api/seminaire-participants/seminaire/${seminaireId}`, {
                headers
            });
            
            if (response.ok) {
                const data = await response.json();
                setParticipants(data);
            } else {
                showAlert('Erreur lors du chargement des participants', 'danger');
            }
        } catch (error) {
            console.error('Erreur:', error);
            showAlert('Erreur de connexion au serveur', 'danger');
        } finally {
            setLoadingParticipants(false);
        }
    };

    const loadAvailableAgents = async (seminaireId) => {
        try {
            const headers = {
                'Content-Type': 'application/json'
            };
            
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(`https://tourisme.2ise-groupe.com/api/seminaire-participants/available-agents/${seminaireId}`, {
                headers
            });
            
            if (response.ok) {
                const data = await response.json();
                setAvailableAgents(data);
            } else {
                console.error('Erreur lors du chargement des agents disponibles');
            }
        } catch (error) {
            console.error('Erreur:', error);
        }
    };

    const handleAddParticipant = async (e) => {
        e.preventDefault();
        
        if (!participantFormData.id_agent) {
            showAlert('Veuillez sélectionner un agent', 'danger');
            return;
        }

        try {
            const headers = {
                'Content-Type': 'application/json'
            };
            
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(`https://tourisme.2ise-groupe.com/api/seminaire-participants/seminaire/${currentSeminaire.id}`, {
                method: 'POST',
                headers,
                body: JSON.stringify(participantFormData)
            });

            if (response.ok) {
                showAlert('Participant ajouté avec succès', 'success');
                setParticipantFormData({
                    id_agent: '',
                    statut_participation: 'inscrit',
                    notes: ''
                });
                loadParticipants(currentSeminaire.id);
                loadAvailableAgents(currentSeminaire.id);
            } else {
                const error = await response.json();
                showAlert(error.error || 'Erreur lors de l\'ajout du participant', 'danger');
            }
        } catch (error) {
            console.error('Erreur:', error);
            showAlert('Erreur de connexion au serveur', 'danger');
        }
    };

    const handleUpdateParticipant = async (participantId, statut_participation, notes) => {
        try {
            const headers = {
                'Content-Type': 'application/json'
            };
            
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(`https://tourisme.2ise-groupe.com/api/seminaire-participants/${participantId}`, {
                method: 'PUT',
                headers,
                body: JSON.stringify({ statut_participation, notes })
            });

            if (response.ok) {
                showAlert('Participant mis à jour avec succès', 'success');
                loadParticipants(currentSeminaire.id);
            } else {
                showAlert('Erreur lors de la mise à jour', 'danger');
            }
        } catch (error) {
            console.error('Erreur:', error);
            showAlert('Erreur de connexion au serveur', 'danger');
        }
    };

    const handleRemoveParticipant = async (participantId) => {
        if (window.confirm('Êtes-vous sûr de vouloir retirer ce participant du séminaire ?')) {
            try {
                const headers = {
                    'Content-Type': 'application/json'
                };
                
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                }

                const response = await fetch(`https://tourisme.2ise-groupe.com/api/seminaire-participants/${participantId}`, {
                    method: 'DELETE',
                    headers
                });

                if (response.ok) {
                    showAlert('Participant retiré avec succès', 'success');
                    loadParticipants(currentSeminaire.id);
                    loadAvailableAgents(currentSeminaire.id);
                } else {
                    showAlert('Erreur lors de la suppression', 'danger');
                }
            } catch (error) {
                console.error('Erreur:', error);
                showAlert('Erreur de connexion au serveur', 'danger');
            }
        }
    };

    // Fonction pour basculer le dropdown d'impression
    const togglePrintDropdown = (seminaireId) => {
        setPrintDropdownOpen(prev => ({
            ...prev,
            [seminaireId]: !prev[seminaireId]
        }));
    };

    // Fonction pour charger les participants d'un séminaire
    const loadSeminaireParticipants = async (seminaireId) => {
        try {
            const headers = {
                'Content-Type': 'application/json'
            };
            
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(`https://tourisme.2ise-groupe.com/api/seminaire-participants/seminaire/${seminaireId}`, {
                headers
            });
            
            if (response.ok) {
                return await response.json();
            } else {
                throw new Error('Erreur lors du chargement des participants');
            }
        } catch (error) {
            console.error('Erreur:', error);
            showAlert('Erreur lors du chargement des participants', 'danger');
            return [];
        }
    };

    // Fonction pour charger le nombre de participants pour tous les séminaires
    const loadParticipantsCountForAllSeminaires = async (seminaires) => {
        try {
            const seminairesWithCount = await Promise.all(
                seminaires.map(async (seminaire) => {
                    try {
                        const participants = await loadSeminaireParticipants(seminaire.id);
                        return {
                            ...seminaire,
                            nombre_participants: participants.length
                        };
                    } catch (error) {
                        console.error(`Erreur pour le séminaire ${seminaire.id}:`, error);
                        return {
                            ...seminaire,
                            nombre_participants: 0
                        };
                    }
                })
            );
            return seminairesWithCount;
        } catch (error) {
            console.error('Erreur lors du chargement des participants:', error);
            showAlert('Erreur lors du chargement des participants', 'danger');
            return seminaires.map(seminaire => ({ ...seminaire, nombre_participants: 0 }));
        }
    };

    // Fonction pour imprimer tous les séminaires (impression application)
    const handlePrintAllSeminairesApplication = async () => {
        try {
            const seminairesWithCount = await loadParticipantsCountForAllSeminaires(seminaires);
            
            // Créer le contenu HTML pour l'impression
            const printContent = `
                <html>
                    <head>
                        <title>Liste de tous les Séminaires-Formation en Côte d'Ivoire - Année ${new Date().getFullYear()}</title>
                        <style>
                            body {
                                font-family: Arial, sans-serif;
                                margin: 20px;
                                font-size: 12px;
                            }
                            .header {
                                text-align: center;
                                margin-bottom: 30px;
                                border-bottom: 2px solid #333;
                                padding-bottom: 10px;
                            }
                            .header h1 {
                                font-size: 18px;
                                font-weight: bold;
                                margin-bottom: 10px;
                            }
                            .info-section {
                                margin-bottom: 20px;
                                background-color: #f8f9fa;
                                padding: 15px;
                                border-radius: 5px;
                            }
                            .info-row {
                                margin-bottom: 5px;
                            }
                            .info-label {
                                font-weight: bold;
                                display: inline-block;
                                width: 200px;
                            }
                            table {
                                width: 100%;
                                border-collapse: collapse;
                                margin-top: 20px;
                            }
                            th, td {
                                border: 1px solid #ddd;
                                padding: 8px;
                                text-align: left;
                            }
                            th {
                                background-color: #f2f2f2;
                                font-weight: bold;
                            }
                            .total-row {
                                font-weight: bold;
                                background-color: #e9ecef;
                            }
                            .footer {
                                margin-top: 30px;
                                text-align: center;
                                font-size: 10px;
                                color: #666;
                            }
                            @media print {
                                body { margin: 0; }
                                .no-print { display: none; }
                            }
                        </style>
                    </head>
                    <body>
                        <div class="header">
                            <h1>Liste de tous les Séminaires-Formation en Côte d'Ivoire</h1>
                            <h2>Année ${new Date().getFullYear()}</h2>
                        </div>
                        
                        <div class="info-section">
                            <div class="info-row">
                                <span class="info-label">Date de génération:</span>
                                ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}
                            </div>
                            <div class="info-row">
                                <span class="info-label">Ministère:</span>
                                Ministère du Tourisme
                            </div>
                            <div class="info-row">
                                <span class="info-label">Total des séminaires:</span>
                                ${seminairesWithCount.length}
                            </div>
                        </div>
                        
                        <table>
                            <thead>
                                <tr>
                                    <th>N°</th>
                                    <th>Thème du Séminaire</th>
                                    <th>Date Début</th>
                                    <th>Date Fin</th>
                                    <th>Lieu</th>
                                    <th>Organisation</th>
                                    <th>Nombre de Participants</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${seminairesWithCount.map((seminaire, index) => `
                                    <tr>
                                        <td>${index + 1}</td>
                                        <td><strong>${seminaire.theme_seminaire}</strong></td>
                                        <td>${formatDate(seminaire.date_debut)}</td>
                                        <td>${formatDate(seminaire.date_fin)}</td>
                                        <td>${seminaire.lieu}</td>
                                        <td>${seminaire.organisme_nom || 'Non défini'}</td>
                                        <td style="text-align: center;">
                                            <strong>${seminaire.nombre_participants}</strong>
                                        </td>
                                    </tr>
                                `).join('')}
                                <tr class="total-row">
                                    <td colspan="6"><strong>TOTAL</strong></td>
                                    <td style="text-align: center;">
                                        <strong>${seminairesWithCount.reduce((sum, seminaire) => sum + seminaire.nombre_participants, 0)}</strong>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                        
                        <div class="footer">
                            <p>Document généré automatiquement par le système de gestion des séminaires</p>
                            <p>Ministère du Tourisme - Tous droits réservés</p>
                        </div>
                    </body>
                </html>
            `;
            
            // Ouvrir une nouvelle fenêtre pour l'impression
            const printWindow = window.open('', '_blank');
            printWindow.document.write(printContent);
            printWindow.document.close();
            
            // Attendre que le contenu soit chargé puis déclencher l'impression
            printWindow.onload = function() {
                printWindow.focus();
                printWindow.print();
                printWindow.close();
            };
            
        } catch (error) {
            console.error('Erreur lors de l\'impression de tous les séminaires:', error);
            showAlert('Erreur lors de l\'impression de tous les séminaires', 'danger');
        }
    };

    // Fonction pour exporter tous les séminaires en Word
    const handleExportAllSeminairesWord = async () => {
        try {
            const seminairesWithCount = await loadParticipantsCountForAllSeminaires(seminaires);
            
            // Créer le contenu HTML pour Word
            const wordContent = `
                <html xmlns:o="urn:schemas-microsoft-com:office:office"
                      xmlns:w="urn:schemas-microsoft-com:office:word"
                      xmlns="http://www.w3.org/TR/REC-html40">
                    <head>
                        <meta charset="utf-8">
                        <meta name="ProgId" content="Word.Document">
                        <meta name="Generator" content="Microsoft Word 15">
                        <meta name="Originator" content="Microsoft Word 15">
                        <title>Liste de tous les Séminaires-Formation en Côte d'Ivoire - Année ${new Date().getFullYear()}</title>
                        <!--[if gte mso 9]>
                        <xml>
                            <w:WordDocument>
                                <w:View>Print</w:View>
                                <w:Zoom>90</w:Zoom>
                                <w:DoNotPromptForConvert/>
                                <w:DoNotShowRevisions/>
                                <w:DoNotPrintRevisions/>
                                <w:DoNotShowComments/>
                                <w:DoNotShowInsertionsAndDeletions/>
                                <w:DoNotShowPropertyChanges/>
                            </w:WordDocument>
                        </xml>
                        <![endif]-->
                        <style>
                            body {
                                font-family: 'Times New Roman', serif;
                                font-size: 12pt;
                                line-height: 1.5;
                                margin: 2cm;
                            }
                            .header {
                                text-align: center;
                                margin-bottom: 30pt;
                                border-bottom: 2pt solid #000;
                                padding-bottom: 10pt;
                            }
                            .header h1 {
                                font-size: 18pt;
                                font-weight: bold;
                                margin-bottom: 10pt;
                            }
                            .info-section {
                                margin-bottom: 20pt;
                                background-color: #f8f9fa;
                                padding: 15pt;
                                border: 1pt solid #ccc;
                            }
                            .info-row {
                                margin-bottom: 5pt;
                            }
                            .info-label {
                                font-weight: bold;
                                display: inline-block;
                                width: 200pt;
                            }
                            table {
                                width: 100%;
                                border-collapse: collapse;
                                margin-top: 20pt;
                                font-size: 11pt;
                            }
                            th, td {
                                border: 1pt solid #000;
                                padding: 6pt;
                                text-align: left;
                            }
                            th {
                                background-color: #f2f2f2;
                                font-weight: bold;
                            }
                            .total-row {
                                font-weight: bold;
                                background-color: #e9ecef;
                            }
                            .footer {
                                margin-top: 30pt;
                                text-align: center;
                                font-size: 10pt;
                                color: #666;
                            }
                        </style>
                    </head>
                    <body>
                        <div class="header">
                            <h1>Liste de tous les Séminaires-Formation en Côte d'Ivoire</h1>
                            <h2>Année ${new Date().getFullYear()}</h2>
                        </div>
                        
                        <div class="info-section">
                            <div class="info-row">
                                <span class="info-label">Date de génération:</span>
                                ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}
                            </div>
                            <div class="info-row">
                                <span class="info-label">Ministère:</span>
                                Ministère du Tourisme
                            </div>
                            <div class="info-row">
                                <span class="info-label">Total des séminaires:</span>
                                ${seminairesWithCount.length}
                            </div>
                        </div>
                        
                        <table>
                            <thead>
                                <tr>
                                    <th>N°</th>
                                    <th>Thème du Séminaire</th>
                                    <th>Date Début</th>
                                    <th>Date Fin</th>
                                    <th>Lieu</th>
                                    <th>Organisation</th>
                                    <th>Nombre de Participants</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${seminairesWithCount.map((seminaire, index) => `
                                    <tr>
                                        <td>${index + 1}</td>
                                        <td><strong>${seminaire.theme_seminaire}</strong></td>
                                        <td>${formatDate(seminaire.date_debut)}</td>
                                        <td>${formatDate(seminaire.date_fin)}</td>
                                        <td>${seminaire.lieu}</td>
                                        <td>${seminaire.organisme_nom || 'Non défini'}</td>
                                        <td style="text-align: center;">
                                            <strong>${seminaire.nombre_participants}</strong>
                                        </td>
                                    </tr>
                                `).join('')}
                                <tr class="total-row">
                                    <td colspan="6"><strong>TOTAL</strong></td>
                                    <td style="text-align: center;">
                                        <strong>${seminairesWithCount.reduce((sum, seminaire) => sum + seminaire.nombre_participants, 0)}</strong>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                        
                        <div class="footer">
                            <p>Document généré automatiquement par le système de gestion des séminaires</p>
                            <p>Ministère du Tourisme - Tous droits réservés</p>
                        </div>
                    </body>
                </html>
            `;
            
            // Créer et télécharger le fichier Word
            const blob = new Blob([wordContent], { type: 'application/msword' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Liste_Tous_Seminaires_Formation_${new Date().toISOString().split('T')[0]}.doc`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            
            showAlert('Export Word généré avec succès', 'success');
            
        } catch (error) {
            console.error('Erreur lors de l\'export Word:', error);
            showAlert('Erreur lors de l\'export Word', 'danger');
        }
    };

    // Fonction pour exporter tous les séminaires en Excel
    const handleExportAllSeminairesExcel = async () => {
        try {
            const seminairesWithCount = await loadParticipantsCountForAllSeminaires(seminaires);
            
            // Créer le contenu CSV pour Excel
            const csvContent = [
                ['Liste de tous les Séminaires-Formation en Côte d\'Ivoire', '', '', '', '', '', ''],
                [`Date de génération: ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`, '', '', '', '', '', ''],
                [`Ministère: Ministère du Tourisme`, '', '', '', '', '', ''],
                [`Total des séminaires: ${seminairesWithCount.length}`, '', '', '', '', '', ''],
                ['', '', '', '', '', '', ''],
                ['N°', 'Thème du Séminaire', 'Date Début', 'Date Fin', 'Lieu', 'Organisation', 'Nombre de Participants'],
                ...seminairesWithCount.map((seminaire, index) => [
                    index + 1,
                    seminaire.theme_seminaire,
                    formatDate(seminaire.date_debut),
                    formatDate(seminaire.date_fin),
                    seminaire.lieu,
                    seminaire.organisme_nom || 'Non défini',
                    seminaire.nombre_participants
                ]),
                ['', '', '', '', '', '', ''],
                ['TOTAL', '', '', '', '', '', seminairesWithCount.reduce((sum, seminaire) => sum + seminaire.nombre_participants, 0)]
            ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
            
            // Créer et télécharger le fichier Excel
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Liste_Tous_Seminaires_Formation_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            
            showAlert('Export Excel généré avec succès', 'success');
            
        } catch (error) {
            console.error('Erreur lors de l\'export Excel:', error);
            showAlert('Erreur lors de l\'export Excel', 'danger');
        }
    };

    // Fonction pour exporter tous les séminaires en PDF
    const handleExportAllSeminairesPDF = async () => {
        try {
            const seminairesWithCount = await loadParticipantsCountForAllSeminaires(seminaires);
            
            // Créer le contenu HTML pour PDF
            const pdfContent = `
                <html>
                    <head>
                        <title>Liste de tous les Séminaires-Formation en Côte d'Ivoire - Année ${new Date().getFullYear()}</title>
                        <style>
                            @page {
                                size: A4;
                                margin: 2cm;
                            }
                            body {
                                font-family: Arial, sans-serif;
                                font-size: 12px;
                                line-height: 1.4;
                            }
                            .header {
                                text-align: center;
                                margin-bottom: 30px;
                                border-bottom: 2px solid #333;
                                padding-bottom: 10px;
                            }
                            .header h1 {
                                font-size: 18px;
                                font-weight: bold;
                                margin-bottom: 10px;
                            }
                            .info-section {
                                margin-bottom: 20px;
                                background-color: #f8f9fa;
                                padding: 15px;
                                border: 1px solid #ccc;
                            }
                            .info-row {
                                margin-bottom: 5px;
                            }
                            .info-label {
                                font-weight: bold;
                                display: inline-block;
                                width: 200px;
                            }
                            table {
                                width: 100%;
                                border-collapse: collapse;
                                margin-top: 20px;
                                font-size: 11px;
                            }
                            th, td {
                                border: 1px solid #000;
                                padding: 6px;
                                text-align: left;
                            }
                            th {
                                background-color: #f2f2f2;
                                font-weight: bold;
                            }
                            .total-row {
                                font-weight: bold;
                                background-color: #e9ecef;
                            }
                            .footer {
                                margin-top: 30px;
                                text-align: center;
                                font-size: 10px;
                                color: #666;
                            }
                        </style>
                    </head>
                    <body>
                        <div class="header">
                            <h1>Liste de tous les Séminaires-Formation en Côte d'Ivoire</h1>
                            <h2>Année ${new Date().getFullYear()}</h2>
                        </div>
                        
                        <div class="info-section">
                            <div class="info-row">
                                <span class="info-label">Date de génération:</span>
                                ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}
                            </div>
                            <div class="info-row">
                                <span class="info-label">Ministère:</span>
                                Ministère du Tourisme
                            </div>
                            <div class="info-row">
                                <span class="info-label">Total des séminaires:</span>
                                ${seminairesWithCount.length}
                            </div>
                        </div>
                        
                        <table>
                            <thead>
                                <tr>
                                    <th>N°</th>
                                    <th>Thème du Séminaire</th>
                                    <th>Date Début</th>
                                    <th>Date Fin</th>
                                    <th>Lieu</th>
                                    <th>Organisation</th>
                                    <th>Nombre de Participants</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${seminairesWithCount.map((seminaire, index) => `
                                    <tr>
                                        <td>${index + 1}</td>
                                        <td><strong>${seminaire.theme_seminaire}</strong></td>
                                        <td>${formatDate(seminaire.date_debut)}</td>
                                        <td>${formatDate(seminaire.date_fin)}</td>
                                        <td>${seminaire.lieu}</td>
                                        <td>${seminaire.organisme_nom || 'Non défini'}</td>
                                        <td style="text-align: center;">
                                            <strong>${seminaire.nombre_participants}</strong>
                                        </td>
                                    </tr>
                                `).join('')}
                                <tr class="total-row">
                                    <td colspan="6"><strong>TOTAL</strong></td>
                                    <td style="text-align: center;">
                                        <strong>${seminairesWithCount.reduce((sum, seminaire) => sum + seminaire.nombre_participants, 0)}</strong>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                        
                        <div class="footer">
                            <p>Document généré automatiquement par le système de gestion des séminaires</p>
                            <p>Ministère du Tourisme - Tous droits réservés</p>
                        </div>
                    </body>
                </html>
            `;
            
            // Ouvrir une nouvelle fenêtre pour l'impression PDF
            const printWindow = window.open('', '_blank');
            printWindow.document.write(pdfContent);
            printWindow.document.close();
            
            // Attendre que le contenu soit chargé puis déclencher l'impression PDF
            printWindow.onload = function() {
                printWindow.focus();
                printWindow.print();
            };
            
        } catch (error) {
            console.error('Erreur lors de l\'export PDF:', error);
            showAlert('Erreur lors de l\'export PDF', 'danger');
        }
    };

    // Fonction pour imprimer via l'application (impression directe)
    const handlePrintApplication = async (seminaire) => {
        try {
            const participants = await loadSeminaireParticipants(seminaire.id);
            
            // Créer le contenu HTML pour l'impression
            const printContent = `
                <html>
                    <head>
                        <title>Liste des Participants - ${seminaire.theme_seminaire}</title>
                        <style>
                            body {
                                font-family: Arial, sans-serif;
                                margin: 20px;
                                font-size: 12px;
                            }
                            .header {
                                text-align: center;
                                margin-bottom: 30px;
                                border-bottom: 2px solid #333;
                                padding-bottom: 10px;
                            }
                            .seminaire-info {
                                margin-bottom: 20px;
                                background-color: #f8f9fa;
                                padding: 15px;
                                border-radius: 5px;
                            }
                            .info-row {
                                margin-bottom: 5px;
                            }
                            .info-label {
                                font-weight: bold;
                                display: inline-block;
                                width: 150px;
                            }
                            table {
                                width: 100%;
                                border-collapse: collapse;
                                margin-top: 20px;
                            }
                            th, td {
                                border: 1px solid #ddd;
                                padding: 8px;
                                text-align: left;
                            }
                            th {
                                background-color: #f2f2f2;
                                font-weight: bold;
                            }
                            .statut-badge {
                                padding: 2px 6px;
                                border-radius: 3px;
                                font-size: 10px;
                                font-weight: bold;
                            }
                            .statut-inscrit { background-color: #d1ecf1; color: #0c5460; }
                            .statut-present { background-color: #d4edda; color: #155724; }
                            .statut-absent { background-color: #f8d7da; color: #721c24; }
                            .statut-excuse { background-color: #fff3cd; color: #856404; }
                            .footer {
                                margin-top: 30px;
                                text-align: center;
                                font-size: 10px;
                                color: #666;
                            }
                            @media print {
                                body { margin: 0; }
                                .no-print { display: none; }
                            }
                        </style>
                    </head>
                    <body>
                        <div class="header">
                            <h1>Liste des Participants</h1>
                            <h2>${seminaire.theme_seminaire}</h2>
                        </div>
                        
                        <div class="seminaire-info">
                            <div class="info-row">
                                <span class="info-label">Date de début:</span>
                                ${formatDate(seminaire.date_debut)}
                            </div>
                            <div class="info-row">
                                <span class="info-label">Date de fin:</span>
                                ${formatDate(seminaire.date_fin)}
                            </div>
                            <div class="info-row">
                                <span class="info-label">Lieu:</span>
                                ${seminaire.lieu}
                            </div>
                            <div class="info-row">
                                <span class="info-label">Organisation:</span>
                                ${seminaire.organisme_nom || 'Non défini'}
                            </div>
                        </div>
                        
                        <table>
                            <thead>
                                <tr>
                                    <th>N°</th>
                                        <th>Nom et Prénoms</th>
                                    <th>Matricule</th>
                                    <th>Email</th>
                                    <th>Statut</th>
                                    <th>Notes</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${participants.map((participant, index) => `
                                    <tr>
                                        <td>${index + 1}</td>
                                        <td><strong>${participant.nom} ${participant.prenom}</strong></td>
                                        <td>${participant.matricule}</td>
                                        <td>${participant.email}</td>
                                        <td>
                                            <span class="statut-badge statut-${participant.statut_participation}">
                                                ${participant.statut_participation.charAt(0).toUpperCase() + participant.statut_participation.slice(1)}
                                            </span>
                                        </td>
                                        <td>${participant.notes || '-'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                        
                        <div class="footer">
                            <p>Document généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}</p>
                            <p>Total des participants: ${participants.length}</p>
                        </div>
                    </body>
                </html>
            `;
            
            // Ouvrir une nouvelle fenêtre pour l'impression
            const printWindow = window.open('', '_blank');
            printWindow.document.write(printContent);
            printWindow.document.close();
            
            // Attendre que le contenu soit chargé puis déclencher l'impression
            printWindow.onload = function() {
                printWindow.focus();
                printWindow.print();
                printWindow.close();
            };
            
        } catch (error) {
            console.error('Erreur lors de l\'impression:', error);
            showAlert('Erreur lors de l\'impression', 'danger');
        }
    };

    // Fonction pour exporter en Word
    const handleExportWord = async (seminaire) => {
        try {
            const participants = await loadSeminaireParticipants(seminaire.id);
            
            // Créer le contenu HTML pour Word
            const wordContent = `
                <html xmlns:o="urn:schemas-microsoft-com:office:office"
                      xmlns:w="urn:schemas-microsoft-com:office:word"
                      xmlns="http://www.w3.org/TR/REC-html40">
                    <head>
                        <meta charset="utf-8">
                        <meta name="ProgId" content="Word.Document">
                        <meta name="Generator" content="Microsoft Word 15">
                        <meta name="Originator" content="Microsoft Word 15">
                        <title>Liste des Participants - ${seminaire.theme_seminaire}</title>
                        <!--[if gte mso 9]>
                        <xml>
                            <w:WordDocument>
                                <w:View>Print</w:View>
                                <w:Zoom>90</w:Zoom>
                                <w:DoNotPromptForConvert/>
                                <w:DoNotShowRevisions/>
                                <w:DoNotPrintRevisions/>
                                <w:DoNotShowComments/>
                                <w:DoNotShowInsertionsAndDeletions/>
                                <w:DoNotShowPropertyChanges/>
                            </w:WordDocument>
                        </xml>
                        <![endif]-->
                        <style>
                            body {
                                font-family: 'Times New Roman', serif;
                                font-size: 12pt;
                                line-height: 1.5;
                                margin: 2cm;
                            }
                            .header {
                                text-align: center;
                                margin-bottom: 30pt;
                                border-bottom: 2pt solid #000;
                                padding-bottom: 10pt;
                            }
                            .header h1 {
                                font-size: 18pt;
                                font-weight: bold;
                                margin-bottom: 10pt;
                            }
                            .header h2 {
                                font-size: 14pt;
                                font-weight: bold;
                            }
                            .seminaire-info {
                                margin-bottom: 20pt;
                                background-color: #f8f9fa;
                                padding: 15pt;
                                border: 1pt solid #ccc;
                            }
                            .info-row {
                                margin-bottom: 5pt;
                            }
                            .info-label {
                                font-weight: bold;
                                display: inline-block;
                                width: 150pt;
                            }
                            table {
                                width: 100%;
                                border-collapse: collapse;
                                margin-top: 20pt;
                                font-size: 11pt;
                            }
                            th, td {
                                border: 1pt solid #000;
                                padding: 6pt;
                                text-align: left;
                            }
                            th {
                                background-color: #f2f2f2;
                                font-weight: bold;
                            }
                            .footer {
                                margin-top: 30pt;
                                text-align: center;
                                font-size: 10pt;
                                color: #666;
                            }
                        </style>
                    </head>
                    <body>
                        <div class="header">
                            <h1>Liste des Participants</h1>
                            <h2>${seminaire.theme_seminaire}</h2>
                        </div>
                        
                        <div class="seminaire-info">
                            <div class="info-row">
                                <span class="info-label">Date de début:</span>
                                ${formatDate(seminaire.date_debut)}
                            </div>
                            <div class="info-row">
                                <span class="info-label">Date de fin:</span>
                                ${formatDate(seminaire.date_fin)}
                            </div>
                            <div class="info-row">
                                <span class="info-label">Lieu:</span>
                                ${seminaire.lieu}
                            </div>
                            <div class="info-row">
                                <span class="info-label">Organisation:</span>
                                ${seminaire.organisme_nom || 'Non défini'}
                            </div>
                        </div>
                        
                        <table>
                            <thead>
                                <tr>
                                    <th>N°</th>
                                        <th>Nom et Prénoms</th>
                                    <th>Matricule</th>
                                    <th>Email</th>
                                    <th>Statut</th>
                                    <th>Notes</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${participants.map((participant, index) => `
                                    <tr>
                                        <td>${index + 1}</td>
                                        <td><strong>${participant.nom} ${participant.prenom}</strong></td>
                                        <td>${participant.matricule}</td>
                                        <td>${participant.email}</td>
                                        <td>${participant.statut_participation.charAt(0).toUpperCase() + participant.statut_participation.slice(1)}</td>
                                        <td>${participant.notes || '-'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                        
                        <div class="footer">
                            <p>Document généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}</p>
                            <p>Total des participants: ${participants.length}</p>
                        </div>
                    </body>
                </html>
            `;
            
            // Créer et télécharger le fichier Word
            const blob = new Blob([wordContent], { type: 'application/msword' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Liste_Participants_${seminaire.theme_seminaire.replace(/[^a-zA-Z0-9]/g, '_')}.doc`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            
            showAlert('Export Word généré avec succès', 'success');
            
        } catch (error) {
            console.error('Erreur lors de l\'export Word:', error);
            showAlert('Erreur lors de l\'export Word', 'danger');
        }
    };

    // Fonction pour exporter en Excel
    const handleExportExcel = async (seminaire) => {
        try {
            const participants = await loadSeminaireParticipants(seminaire.id);
            
            // Créer le contenu CSV pour Excel
            const csvContent = [
                ['Liste des Participants', '', '', '', '', ''],
                [`Séminaire: ${seminaire.theme_seminaire}`, '', '', '', '', ''],
                [`Date de début: ${formatDate(seminaire.date_debut)}`, '', '', '', '', ''],
                [`Date de fin: ${formatDate(seminaire.date_fin)}`, '', '', '', '', ''],
                [`Lieu: ${seminaire.lieu}`, '', '', '', '', ''],
                [`Organisation: ${seminaire.organisme_nom || 'Non défini'}`, '', '', '', '', ''],
                ['', '', '', '', '', ''],
                ['N°', 'Nom et Prénoms', 'Matricule', 'Email', 'Statut', 'Notes'],
                ...participants.map((participant, index) => [
                    index + 1,
                    `${participant.nom} ${participant.prenom}`,
                    participant.matricule,
                    participant.email,
                    participant.statut_participation.charAt(0).toUpperCase() + participant.statut_participation.slice(1),
                    participant.notes || '-'
                ]),
                ['', '', '', '', '', ''],
                [`Total des participants: ${participants.length}`, '', '', '', '', ''],
                [`Document généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`, '', '', '', '', '']
            ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
            
            // Créer et télécharger le fichier Excel
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Liste_Participants_${seminaire.theme_seminaire.replace(/[^a-zA-Z0-9]/g, '_')}.csv`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            
            showAlert('Export Excel généré avec succès', 'success');
            
        } catch (error) {
            console.error('Erreur lors de l\'export Excel:', error);
            showAlert('Erreur lors de l\'export Excel', 'danger');
        }
    };

    // Fonction pour exporter en PDF
    const handleExportPDF = async (seminaire) => {
        try {
            const participants = await loadSeminaireParticipants(seminaire.id);
            
            // Créer le contenu HTML pour PDF
            const pdfContent = `
                <html>
                    <head>
                        <title>Liste des Participants - ${seminaire.theme_seminaire}</title>
                        <style>
                            @page {
                                size: A4;
                                margin: 2cm;
                            }
                            body {
                                font-family: Arial, sans-serif;
                                font-size: 12px;
                                line-height: 1.4;
                            }
                            .header {
                                text-align: center;
                                margin-bottom: 30px;
                                border-bottom: 2px solid #333;
                                padding-bottom: 10px;
                            }
                            .header h1 {
                                font-size: 18px;
                                font-weight: bold;
                                margin-bottom: 10px;
                            }
                            .header h2 {
                                font-size: 14px;
                                font-weight: bold;
                            }
                            .seminaire-info {
                                margin-bottom: 20px;
                                background-color: #f8f9fa;
                                padding: 15px;
                                border: 1px solid #ccc;
                            }
                            .info-row {
                                margin-bottom: 5px;
                            }
                            .info-label {
                                font-weight: bold;
                                display: inline-block;
                                width: 150px;
                            }
                            table {
                                width: 100%;
                                border-collapse: collapse;
                                margin-top: 20px;
                                font-size: 11px;
                            }
                            th, td {
                                border: 1px solid #000;
                                padding: 6px;
                                text-align: left;
                            }
                            th {
                                background-color: #f2f2f2;
                                font-weight: bold;
                            }
                            .footer {
                                margin-top: 30px;
                                text-align: center;
                                font-size: 10px;
                                color: #666;
                            }
                        </style>
                    </head>
                    <body>
                        <div class="header">
                            <h1>Liste des Participants</h1>
                            <h2>${seminaire.theme_seminaire}</h2>
                        </div>
                        
                        <div class="seminaire-info">
                            <div class="info-row">
                                <span class="info-label">Date de début:</span>
                                ${formatDate(seminaire.date_debut)}
                            </div>
                            <div class="info-row">
                                <span class="info-label">Date de fin:</span>
                                ${formatDate(seminaire.date_fin)}
                            </div>
                            <div class="info-row">
                                <span class="info-label">Lieu:</span>
                                ${seminaire.lieu}
                            </div>
                            <div class="info-row">
                                <span class="info-label">Organisation:</span>
                                ${seminaire.organisme_nom || 'Non défini'}
                            </div>
                        </div>
                        
                        <table>
                            <thead>
                                <tr>
                                    <th>N°</th>
                                        <th>Nom et Prénoms</th>
                                    <th>Matricule</th>
                                    <th>Email</th>
                                    <th>Statut</th>
                                    <th>Notes</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${participants.map((participant, index) => `
                                    <tr>
                                        <td>${index + 1}</td>
                                        <td><strong>${participant.nom} ${participant.prenom}</strong></td>
                                        <td>${participant.matricule}</td>
                                        <td>${participant.email}</td>
                                        <td>${participant.statut_participation.charAt(0).toUpperCase() + participant.statut_participation.slice(1)}</td>
                                        <td>${participant.notes || '-'}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                        
                        <div class="footer">
                            <p>Document généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}</p>
                            <p>Total des participants: ${participants.length}</p>
                        </div>
                    </body>
                </html>
            `;
            
            // Ouvrir une nouvelle fenêtre pour l'impression PDF
            const printWindow = window.open('', '_blank');
            printWindow.document.write(pdfContent);
            printWindow.document.close();
            
            // Attendre que le contenu soit chargé puis déclencher l'impression PDF
            printWindow.onload = function() {
                printWindow.focus();
                printWindow.print();
            };
            
        } catch (error) {
            console.error('Erreur lors de l\'export PDF:', error);
            showAlert('Erreur lors de l\'export PDF', 'danger');
        }
    };

    const handleParticipantInputChange = (e) => {
        const { name, value } = e.target;
        setParticipantFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Filtrer les séminaires selon le terme de recherche
        const filteredSeminaires = seminaires.filter(seminaire => {
        const searchLower = searchTerm.toLowerCase();
        return (
            seminaire.theme_seminaire?.toLowerCase().includes(searchLower) ||
            seminaire.lieu?.toLowerCase().includes(searchLower)
        );
    });

    // Plus besoin de cette fonction car les séminaires ne sont plus liés aux agents

    const formatDate = (dateString) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleDateString('fr-FR');
    };

    const getStatusBadge = (dateDebut, dateFin) => {
        const now = new Date();
        const debut = new Date(dateDebut);
        const fin = new Date(dateFin);

        if (now < debut) {
            return <Badge color="info">À venir</Badge>;
        } else if (now >= debut && now <= fin) {
            return <Badge color="warning">En cours</Badge>;
        } else {
            return <Badge color="success">Terminé</Badge>;
        }
    };

    return (
        <div className="content">
            <Row>
                <Col>
                    <Card>
                        <CardHeader>
                            <Row className="align-items-center">
                                <Col>
                                    <h3 className="title">
                                        <MdEvent className="mr-2" />
                                        Gestion des Séminaires de Formation
                                    </h3>
                                </Col>
                                <Col className="text-right">
                                    <Button
                                        color="secondary"
                                        outline
                                        className="mr-2"
                                        onClick={() => history.goBack()}
                                    >
                                        <MdArrowBack className="mr-1" />
                                        Retour
                                    </Button>
                                    <Dropdown isOpen={globalPrintDropdownOpen} toggle={() => setGlobalPrintDropdownOpen(!globalPrintDropdownOpen)} className="mr-2 d-inline-block">
                                        <DropdownToggle
                                            color="info"
                                            caret
                                            title="Options d'impression de tous les séminaires"
                                        >
                                            <MdPrint className="mr-1" />
                                            Impression des Séminaires-Formation
                                        </DropdownToggle>
                                        <DropdownMenu>
                                            <DropdownItem onClick={handlePrintAllSeminairesApplication}>
                                                <MdPrint className="mr-2" />
                                                Impression Application
                                            </DropdownItem>
                                            <DropdownItem onClick={handleExportAllSeminairesWord}>
                                                <i className="fa fa-file-word-o mr-2" style={{color: '#2b579a'}}></i>
                                                Export Word
                                            </DropdownItem>
                                            <DropdownItem onClick={handleExportAllSeminairesExcel}>
                                                <i className="fa fa-file-excel-o mr-2" style={{color: '#217346'}}></i>
                                                Export Excel
                                            </DropdownItem>
                                            <DropdownItem onClick={handleExportAllSeminairesPDF}>
                                                <i className="fa fa-file-pdf-o mr-2" style={{color: '#dc3545'}}></i>
                                                Export PDF
                                            </DropdownItem>
                                        </DropdownMenu>
                                    </Dropdown>
                                    <Button color="primary" onClick={toggleModal}>
                                        <MdAdd className="mr-1" />
                                        Nouveau Séminaire
                                    </Button>
                                </Col>
                            </Row>
                        </CardHeader>
                        <CardBody>
                            {alert.show && (
                                <Alert color={alert.type} className="mb-3">
                                    {alert.message}
                                </Alert>
                            )}

                            {/* Barre de recherche */}
                            <Row className="mb-3">
                                <Col md={6}>
                                    <InputGroup>
                                        <InputGroupText>
                                            <MdSearch />
                                        </InputGroupText>
                                        <Input
                                            type="text"
                                            placeholder="Rechercher par thème ou lieu..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </InputGroup>
                                </Col>
                            </Row>

                            {loading ? (
                                <div className="text-center">
                                    <Spinner color="primary" />
                                    <p className="mt-2">Chargement des séminaires...</p>
                                </div>
                            ) : (
                                <Table responsive>
                                    <thead>
                                        <tr>
                                            <th>Thème du Séminaire</th>
                                            <th>Date Début</th>
                                            <th>Date Fin</th>
                                            <th>Lieu</th>
                                            <th>Entité/Organisation</th>
                                            <th>Statut</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredSeminaires.length === 0 ? (
                                            <tr>
                                                <td colSpan="7" className="text-center">
                                                    Aucun séminaire trouvé
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredSeminaires.map((seminaire) => (
                                                <tr key={seminaire.id}>
                                                    <td>
                                                        <strong>{seminaire.theme_seminaire}</strong>
                                                    </td>
                                                    <td>
                                                        <div className="d-flex align-items-center">
                                                            <MdDateRange className="mr-1" />
                                                            {formatDate(seminaire.date_debut)}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="d-flex align-items-center">
                                                            <MdDateRange className="mr-1" />
                                                            {formatDate(seminaire.date_fin)}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="d-flex align-items-center">
                                                            <MdLocationOn className="mr-1" />
                                                            {seminaire.lieu}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className="d-flex align-items-center">
                                                            <MdPerson className="mr-1" />
                                                            <div>
                                                                <strong>{seminaire.organisme_nom || 'Non défini'}</strong>
                                                                <small className="text-muted d-block">
                                                                    {seminaire.type_organisme === 'ministere' ? 'Ministère' : 
                                                                     seminaire.type_organisme === 'entite' ? 'Entité Administrative' : 'Non défini'}
                                                                </small>
                                                                {seminaire.ministere_nom && (
                                                                    <small className="text-info d-block">
                                                                        Ministère: {seminaire.ministere_nom}
                                                                    </small>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        {getStatusBadge(seminaire.date_debut, seminaire.date_fin)}
                                                    </td>
                                                    <td>
                                                                <Button
                                                                    color="info"
                                                                    size="sm"
                                                                    className="mr-1"
                                                                    onClick={() => toggleParticipantsModal(seminaire)}
                                                                    title="Gérer les participants"
                                                                >
                                                                    <MdGroup />
                                                                </Button>
                                                                <Button
                                                                    color="warning"
                                                            size="sm"
                                                            className="mr-1"
                                                            onClick={() => handleEdit(seminaire)}
                                                        >
                                                            <MdEdit />
                                                        </Button>
                                                        <Button
                                                            color="danger"
                                                            size="sm"
                                                            className="mr-1"
                                                            onClick={() => handleDelete(seminaire.id)}
                                                        >
                                                            <MdDelete />
                                                        </Button>
                                                        <Dropdown isOpen={printDropdownOpen[seminaire.id] || false} toggle={() => togglePrintDropdown(seminaire.id)}>
                                                            <DropdownToggle
                                                                color="secondary"
                                                                size="sm"
                                                                caret
                                                                title="Options d'impression"
                                                            >
                                                                <MdPrint />
                                                            </DropdownToggle>
                                                            <DropdownMenu>
                                                                <DropdownItem onClick={() => handlePrintApplication(seminaire)}>
                                                                    <MdPrint className="mr-2" />
                                                                    Impression Application
                                                                </DropdownItem>
                                                                <DropdownItem onClick={() => handleExportWord(seminaire)}>
                                                                    <i className="fa fa-file-word-o mr-2" style={{color: '#2b579a'}}></i>
                                                                    Export Word
                                                                </DropdownItem>
                                                                <DropdownItem onClick={() => handleExportExcel(seminaire)}>
                                                                    <i className="fa fa-file-excel-o mr-2" style={{color: '#217346'}}></i>
                                                                    Export Excel
                                                                </DropdownItem>
                                                                <DropdownItem onClick={() => handleExportPDF(seminaire)}>
                                                                    <i className="fa fa-file-pdf-o mr-2" style={{color: '#dc3545'}}></i>
                                                                    Export PDF
                                                                </DropdownItem>
                                                            </DropdownMenu>
                                                        </Dropdown>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </Table>
                            )}
                        </CardBody>
                    </Card>
                </Col>
            </Row>

            {/* Modal pour ajouter/éditer un séminaire */}
            <Modal isOpen={modal} toggle={toggleModal} size="lg">
                <ModalHeader toggle={toggleModal}>
                    {editingSeminaire ? 'Modifier le Séminaire' : 'Nouveau Séminaire'}
                </ModalHeader>
                <Form onSubmit={handleSubmit}>
                    <ModalBody>
                        <Row>
                            <Col md={12}>
                                <FormGroup>
                                    <Label for="theme_seminaire">Thème du Séminaire *</Label>
                                    <Input
                                        type="text"
                                        name="theme_seminaire"
                                        id="theme_seminaire"
                                        value={formData.theme_seminaire}
                                        onChange={handleInputChange}
                                        placeholder="Ex: Formation en gestion de projet"
                                        required
                                    />
                                </FormGroup>
                            </Col>
                        </Row>
                        <Row>
                            <Col md={6}>
                                <FormGroup>
                                    <Label for="date_debut">Date de Début *</Label>
                                    <Input
                                        type="date"
                                        name="date_debut"
                                        id="date_debut"
                                        value={formData.date_debut}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </FormGroup>
                            </Col>
                            <Col md={6}>
                                <FormGroup>
                                    <Label for="date_fin">Date de Fin *</Label>
                                    <Input
                                        type="date"
                                        name="date_fin"
                                        id="date_fin"
                                        value={formData.date_fin}
                                        onChange={handleInputChange}
                                        required
                                    />
                                </FormGroup>
                            </Col>
                        </Row>
                        <Row>
                            <Col md={12}>
                                <FormGroup>
                                    <Label for="lieu">Lieu *</Label>
                                    <Input
                                        type="text"
                                        name="lieu"
                                        id="lieu"
                                        value={formData.lieu}
                                        onChange={handleInputChange}
                                        placeholder="Ex: Salle de conférence, Centre de formation..."
                                        required
                                    />
                                </FormGroup>
                            </Col>
                        </Row>
                    </ModalBody>
                    <ModalFooter>
                        <Button color="secondary" onClick={toggleModal}>
                            Annuler
                        </Button>
                        <Button color="primary" type="submit">
                            {editingSeminaire ? 'Modifier' : 'Créer'}
                        </Button>
                    </ModalFooter>
                </Form>
            </Modal>

            {/* Modal pour gérer les participants */}
            <Modal isOpen={participantsModal} toggle={() => toggleParticipantsModal(null)} size="xl">
                <ModalHeader toggle={() => toggleParticipantsModal(null)}>
                    <MdGroup className="mr-2" />
                    Gestion des Participants - {currentSeminaire?.theme_seminaire}
                </ModalHeader>
                <ModalBody>
                    {loadingParticipants ? (
                        <div className="text-center">
                            <Spinner color="primary" />
                            <p className="mt-2">Chargement des participants...</p>
                        </div>
                    ) : (
                        <>
                            {/* Formulaire d'ajout de participant */}
                            <Card className="mb-4">
                                <CardHeader>
                                    <h5 className="mb-0">
                                        <MdPersonAdd className="mr-2" />
                                        Ajouter un Participant
                                    </h5>
                                </CardHeader>
                                <CardBody>
                                    <Form onSubmit={handleAddParticipant}>
                                        <Row>
                                            <Col md={6}>
                                                <FormGroup>
                                                    <Label for="id_agent">Agent *</Label>
                                                    <Input
                                                        type="select"
                                                        name="id_agent"
                                                        id="id_agent"
                                                        value={participantFormData.id_agent}
                                                        onChange={handleParticipantInputChange}
                                                        required
                                                    >
                                                        <option value="">Sélectionner un agent</option>
                                                        {availableAgents.map(agent => (
                                                            <option key={agent.id} value={agent.id}>
                                                                {agent.nom} {agent.prenom} - {agent.matricule}
                                                                {agent.entite_nom && ` (${agent.entite_nom})`}
                                                                {agent.ministere_nom && !agent.entite_nom && ` (${agent.ministere_nom})`}
                                                            </option>
                                                        ))}
                                                    </Input>
                                                </FormGroup>
                                            </Col>
                                            <Col md={3}>
                                                <FormGroup>
                                                    <Label for="statut_participation">Statut</Label>
                                                    <Input
                                                        type="select"
                                                        name="statut_participation"
                                                        id="statut_participation"
                                                        value={participantFormData.statut_participation}
                                                        onChange={handleParticipantInputChange}
                                                    >
                                                        <option value="inscrit">Inscrit</option>
                                                        <option value="present">Présent</option>
                                                        <option value="absent">Absent</option>
                                                        <option value="excuse">Excusé</option>
                                                    </Input>
                                                </FormGroup>
                                            </Col>
                                            <Col md={3}>
                                                <FormGroup>
                                                    <Label for="notes">Notes</Label>
                                                    <Input
                                                        type="text"
                                                        name="notes"
                                                        id="notes"
                                                        value={participantFormData.notes}
                                                        onChange={handleParticipantInputChange}
                                                        placeholder="Notes optionnelles"
                                                    />
                                                </FormGroup>
                                            </Col>
                                        </Row>
                                        <Button color="primary" type="submit" disabled={availableAgents.length === 0}>
                                            <MdPersonAdd className="mr-1" />
                                            Ajouter Participant
                                        </Button>
                                        {availableAgents.length === 0 && (
                                            <small className="text-muted d-block mt-2">
                                                Tous les agents sont déjà inscrits à ce séminaire
                                            </small>
                                        )}
                                    </Form>
                                </CardBody>
                            </Card>

                            {/* Liste des participants */}
                            <Card>
                                <CardHeader>
                                    <h5 className="mb-0">
                                        <MdGroup className="mr-2" />
                                        Participants ({participants.length})
                                    </h5>
                                </CardHeader>
                                <CardBody>
                                    {participants.length === 0 ? (
                                        <p className="text-muted text-center">Aucun participant inscrit</p>
                                    ) : (
                                        <Table responsive>
                                            <thead>
                                                <tr>
                                                    <th>Agent</th>
                                                    <th>Statut</th>
                                                    <th>Notes</th>
                                                    <th>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {participants.map(participant => (
                                                    <tr key={participant.id}>
                                                        <td>
                                                            <div>
                                                                <strong>{participant.nom} {participant.prenom}</strong>
                                                                <br />
                                                                <small className="text-muted">
                                                                    {participant.matricule} - {participant.email}
                                                                </small>
                                                            </div>
                                                        </td>
                                                        <td>
                                                            <select
                                                                className="form-control form-control-sm"
                                                                value={participant.statut_participation}
                                                                onChange={(e) => handleUpdateParticipant(
                                                                    participant.id, 
                                                                    e.target.value, 
                                                                    participant.notes
                                                                )}
                                                            >
                                                                <option value="inscrit">Inscrit</option>
                                                                <option value="present">Présent</option>
                                                                <option value="absent">Absent</option>
                                                                <option value="excuse">Excusé</option>
                                                            </select>
                                                        </td>
                                                        <td>
                                                            <Input
                                                                type="text"
                                                                size="sm"
                                                                value={participant.notes || ''}
                                                                onChange={(e) => handleUpdateParticipant(
                                                                    participant.id, 
                                                                    participant.statut_participation, 
                                                                    e.target.value
                                                                )}
                                                                placeholder="Ajouter des notes..."
                                                            />
                                                        </td>
                                                        <td>
                                                            <Button
                                                                color="danger"
                                                                size="sm"
                                                                onClick={() => handleRemoveParticipant(participant.id)}
                                                                title="Retirer du séminaire"
                                                            >
                                                                <MdClose />
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </Table>
                                    )}
                                </CardBody>
                            </Card>
                        </>
                    )}
                </ModalBody>
            </Modal>
        </div>
    );
};

export default SeminaireFormationPage;
