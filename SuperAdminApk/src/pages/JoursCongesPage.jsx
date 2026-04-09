import React, { useState, useEffect } from 'react';
import { normaliserConges, normaliserCongesArray, getCongesForYear as getCongesForYearUtil } from '../utils/congesUtils';
import { useAuth } from '../contexts/AuthContext';
import {
    Card,
    CardBody,
    CardHeader,
    CardTitle,
    Row,
    Col,
    Table,
    Input,
    Button,
    Spinner,
    Alert,
    Modal,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Form,
    FormGroup,
    Label,
    Pagination,
    PaginationItem,
    PaginationLink
} from 'reactstrap';
import { MdEvent, MdSearch, MdEdit, MdSave, MdCancel } from 'react-icons/md';
import Page from '../components/Page';

const JoursCongesPage = () => {
    const { user } = useAuth();
    const [agents, setAgents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingAgent, setEditingAgent] = useState(null);
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [editFormData, setEditFormData] = useState({});
    const [saving, setSaving] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0); // Clé pour forcer le re-render
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    // Calculer les années dynamiquement
    const currentYear = new Date().getFullYear();
    const previousYear = currentYear - 1;
    const yearBeforePrevious = currentYear - 2;
    const years = [yearBeforePrevious, previousYear, currentYear];

    useEffect(() => {
        if (user) {
            loadAgents();
        }
    }, [user]);

    // Log pour vérifier que les agents sont bien mis à jour
    useEffect(() => {
        if (agents.length > 0) {
            const agent1229 = agents.find(a => a.id === 1229 || parseInt(a.id, 10) === 1229);
            if (agent1229) {
                console.log('🔍 Agent 1229 dans l\'état:', {
                    id: agent1229.id,
                    nom: agent1229.nom,
                    prenom: agent1229.prenom,
                    conges: agent1229.conges?.map(c => ({
                        annee: c.annee,
                        alloues: c.jours_alloues,
                        pris: c.jours_pris,
                        restants: c.jours_restants
                    }))
                });
            }
        }
    }, [agents, refreshKey]);

    const loadAgents = async () => {
        setLoading(true);
        setError(null);
        
        try {
            const token = localStorage.getItem('token');
            // Ajouter un timestamp pour éviter le cache
            // Utiliser cache: 'no-store' au lieu de headers pour éviter les problèmes CORS
            const response = await fetch(`https://tourisme.2ise-groupe.com/api/conges/all-agents?t=${Date.now()}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                cache: 'no-store' // Forcer le navigateur à ne pas utiliser le cache
            });

            const result = await response.json();
            
            if (result.success) {
                const agentsData = result.data || [];
                console.log('✅ Agents rechargés:', agentsData.length);
                
                // Log des données pour vérifier qu'elles sont correctes
                if (agentsData.length > 0) {
                    // Afficher quelques exemples de données pour vérifier
                    agentsData.slice(0, 3).forEach(agent => {
                        if (agent.conges && agent.conges.length > 0) {
                            console.log(`📊 Agent ${agent.nom} ${agent.prenom}:`, {
                                conges: agent.conges.map(c => ({
                                    annee: c.annee,
                                    alloues: c.jours_alloues,
                                    pris: c.jours_pris,
                                    restants: c.jours_restants,
                                    calcul: `${c.jours_alloues} - ${c.jours_pris} = ${c.jours_alloues - c.jours_pris}`
                                }))
                            });
                        }
                    });
                }
                
                // Mettre à jour les agents et forcer le re-render
                // Utiliser la fonction utilitaire pour normaliser TOUTES les données de congés
                // Cela garantit que jours_restants est TOUJOURS correctement calculé
                const agentsCopy = agentsData.map(agent => ({
                    ...agent,
                    conges: agent.conges ? normaliserCongesArray(agent.conges) : []
                }));
                setAgents(agentsCopy);
                console.log('✅ État des agents mis à jour avec', agentsCopy.length, 'agents');
            } else {
                setError(result.error || 'Erreur lors du chargement des agents');
            }
        } catch (err) {
            console.error('Erreur lors du chargement des agents:', err);
            setError('Erreur de connexion au serveur');
        } finally {
            setLoading(false);
        }
    };

    // Filtrer les agents par recherche
    const filteredAgents = agents.filter(agent => {
        const search = searchTerm.toLowerCase();
        return (
            agent.matricule?.toLowerCase().includes(search) ||
            agent.nom?.toLowerCase().includes(search) ||
            agent.prenom?.toLowerCase().includes(search) ||
            `${agent.nom} ${agent.prenom}`.toLowerCase().includes(search)
        );
    });

    // Pagination : découper la liste filtrée
    const totalFiltered = filteredAgents.length;
    const totalPages = Math.max(1, Math.ceil(totalFiltered / rowsPerPage));
    const startIndex = (currentPage - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const paginatedAgents = filteredAgents.slice(startIndex, endIndex);

    useEffect(() => {
        if (currentPage > totalPages && totalPages >= 1) {
            setCurrentPage(1);
        }
    }, [searchTerm, totalPages, currentPage]);

    const handleEdit = (agent) => {
        // Utiliser les données de l'agent depuis l'état local (qui sont déjà à jour)
        // Ne pas recharger depuis l'API car cela pourrait écraser les modifications récentes
        
        // Trouver l'agent dans l'état local pour s'assurer d'avoir les données les plus récentes
        const currentAgent = agents.find(a => 
            a.id === agent.id || 
            parseInt(a.id, 10) === parseInt(agent.id, 10) ||
            a.id === agent.id?.toString() ||
            a.id?.toString() === agent.id?.toString()
        );
        
        const agentToEdit = currentAgent || agent;
        
        console.log('📋 Ouverture du formulaire de modification pour:', {
            id: agentToEdit.id,
            nom: agentToEdit.nom,
            prenom: agentToEdit.prenom,
            conges: agentToEdit.conges?.map(c => ({
                annee: c.annee,
                alloues: c.jours_alloues,
                pris: c.jours_pris,
                restants: c.jours_restants
            })),
            source: currentAgent ? 'état local (à jour)' : 'données passées en paramètre'
        });
        
        setEditingAgent(agentToEdit);
        
        // Initialiser le formulaire avec les jours de congés depuis l'état local (qui est à jour)
        const formData = {};
        years.forEach(year => {
            const conges = agentToEdit.conges?.find(c => parseInt(c.annee, 10) === year);
            // Utiliser exactement les valeurs de l'état local (qui sont synchronisées avec la DB)
            const alloues = conges ? parseInt(conges.jours_alloues, 10) : 30;
            const pris = conges ? parseInt(conges.jours_pris, 10) : 0;
            const restants = conges ? parseInt(conges.jours_restants, 10) : 30;
            
            formData[`annee_${year}_alloues`] = alloues;
            formData[`annee_${year}_pris`] = pris;
            formData[`annee_${year}_restants`] = restants;
            
            console.log(`📋 Chargement du formulaire pour ${year}:`, {
                agent: `${agentToEdit.nom} ${agentToEdit.prenom}`,
                id_agent: agentToEdit.id,
                conges_from_state: conges,
                valeurs_chargees: {
                    alloues,
                    pris,
                    restants
                },
                calcul: `${alloues} - ${pris} = ${alloues - pris}`,
                correct: restants === (alloues - pris) ? '✅' : '❌'
            });
        });
        setEditFormData(formData);
        setEditModalOpen(true);
        console.log('📋 Formulaire initialisé avec les données de l\'état local (à jour):', formData);
    };

    const handleEditFormChange = (e) => {
        const { name, value } = e.target;
        // Enlever les zéros non significatifs en convertissant en nombre
        // Si la valeur est vide ou invalide, on la laisse vide temporairement
        let numericValue = '';
        if (value === '' || value === null || value === undefined) {
            numericValue = '';
        } else {
            // Supprimer les zéros non significatifs en convertissant en nombre puis en string
            const parsedValue = parseInt(value, 10);
            if (!isNaN(parsedValue)) {
                numericValue = parsedValue;
            } else {
                numericValue = '';
            }
        }
        
        // Extraire l'année et le type de champ depuis le nom (ex: annee_2023_alloues)
        const match = name.match(/annee_(\d+)_(alloues|pris|restants)/);
        
        setEditFormData(prev => {
            const updated = {
                ...prev,
                [name]: numericValue
            };
            
            // Si on modifie "jours alloués" ou "jours pris", recalculer automatiquement "jours restants"
            if (match && (match[2] === 'alloues' || match[2] === 'pris')) {
                const year = match[1];
                const allouesKey = `annee_${year}_alloues`;
                const prisKey = `annee_${year}_pris`;
                const restantsKey = `annee_${year}_restants`;
                
                // Récupérer les valeurs actuelles (ou les nouvelles si on vient de les modifier)
                const joursAlloues = parseInt(updated[allouesKey] || prev[allouesKey] || 30, 10);
                const joursPris = parseInt(updated[prisKey] || prev[prisKey] || 0, 10);
                
                // Calculer automatiquement les jours restants
                const joursRestants = Math.max(0, joursAlloues - joursPris);
                updated[restantsKey] = joursRestants;
                
                console.log(`📊 Calcul automatique pour ${year}: ${joursAlloues} alloués - ${joursPris} pris = ${joursRestants} restants`);
            }
            
            return updated;
        });
    };

    const handleSave = async () => {
        if (!editingAgent) return;

        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            const updates = [];

            years.forEach(year => {
                // S'assurer que les valeurs sont des nombres sans zéros non significatifs
                const alloues = parseInt(editFormData[`annee_${year}_alloues`]) || 30;
                const pris = parseInt(editFormData[`annee_${year}_pris`]) || 0;
                // Recalculer les jours restants pour s'assurer de la cohérence
                // (même si le backend le recalcule, on l'envoie quand même)
                const restants = Math.max(0, alloues - pris);

                // S'assurer que toutes les valeurs sont bien des nombres
                const updateData = {
                    id_agent: parseInt(editingAgent.id, 10),
                    annee: parseInt(year, 10),
                    jours_alloues: parseInt(alloues, 10),
                    jours_pris: parseInt(pris, 10),
                    jours_restants: parseInt(restants, 10)
                };
                
                console.log(`📝 Données à envoyer pour ${year}:`, {
                    ...updateData,
                    calcul: `${updateData.jours_alloues} - ${updateData.jours_pris} = ${updateData.jours_restants}`,
                    types: {
                        id_agent: typeof updateData.id_agent,
                        annee: typeof updateData.annee,
                        jours_alloues: typeof updateData.jours_alloues,
                        jours_pris: typeof updateData.jours_pris,
                        jours_restants: typeof updateData.jours_restants
                    },
                    valeurs_brutes: {
                        alloues_from_form: editFormData[`annee_${year}_alloues`],
                        pris_from_form: editFormData[`annee_${year}_pris`],
                        restants_from_form: editFormData[`annee_${year}_restants`]
                    }
                });
                
                updates.push(updateData);
            });

            console.log('📤 Envoi des modifications au serveur...', { updates });

            const response = await fetch('https://tourisme.2ise-groupe.com/api/conges/update-multiple', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ updates })
            });

            const result = await response.json();

            if (result.success) {
                console.log('✅ Modifications sauvegardées avec succès:', result);
                console.log('📊 Nombre de notifications envoyées:', result.notifications_envoyees || 0);
                
                // Afficher les données sauvegardées en base de données
                if (result.data_sauvegardee && result.data_sauvegardee.length > 0) {
                    console.log('💾 Données sauvegardées en base de données:', result.data_sauvegardee);
                    result.data_sauvegardee.forEach(data => {
                        console.log(`  - Agent ${data.id_agent}, Année ${data.annee}:`, {
                            alloues: data.jours_alloues,
                            pris: data.jours_pris,
                            restants: data.jours_restants,
                            calcul: `${data.jours_alloues} - ${data.jours_pris} = ${data.jours_alloues - data.jours_pris}`
                        });
                    });
                    
                    // Mettre à jour IMMÉDIATEMENT l'état local avec les données retournées par l'API
                    // Cela garantit que le tableau se met à jour sans attendre le rechargement
                    console.log('🔄 Début de la mise à jour de l\'état local...');
                    console.log('🔄 editingAgent.id:', editingAgent.id);
                    console.log('🔄 Données retournées par l\'API:', result.data_sauvegardee);
                    
                    // Récupérer l'ID de l'agent à mettre à jour depuis les données de l'API
                    const agentIdToUpdate = result.data_sauvegardee[0]?.id_agent;
                    
                    if (!agentIdToUpdate) {
                        console.error('❌ Impossible de trouver l\'ID de l\'agent dans les données retournées');
                    } else {
                        setAgents(prevAgents => {
                            console.log('🔄 Agents avant mise à jour:', prevAgents.length);
                            
                            // Créer un nouveau tableau pour forcer React à détecter le changement
                            const updatedAgents = prevAgents.map(agent => {
                                const agentId = parseInt(agent.id, 10);
                                const targetId = parseInt(agentIdToUpdate, 10);
                                
                                // Vérifier si c'est l'agent à mettre à jour
                                if (agentId === targetId) {
                                    console.log('🔄 ✅ Agent trouvé pour mise à jour:', {
                                        id: agent.id,
                                        nom: agent.nom,
                                        prenom: agent.prenom,
                                        conges_avant: agent.conges?.map(c => ({
                                            annee: c.annee,
                                            alloues: c.jours_alloues,
                                            pris: c.jours_pris,
                                            restants: c.jours_restants
                                        }))
                                    });
                                    
                                    // Créer une map des congés existants pour faciliter la mise à jour
                                    const congesMap = new Map();
                                    if (agent.conges && Array.isArray(agent.conges)) {
                                        agent.conges.forEach(c => {
                                            congesMap.set(parseInt(c.annee, 10), { ...c });
                                        });
                                    }
                                    
                                    // Mettre à jour chaque année avec les données de l'API
                                    result.data_sauvegardee.forEach(savedData => {
                                        const annee = parseInt(savedData.annee, 10);
                                        const existingConges = congesMap.get(annee);
                                        
                                        const updatedCongesData = {
                                            annee: annee,
                                            jours_alloues: parseInt(savedData.jours_alloues, 10),
                                            jours_pris: parseInt(savedData.jours_pris, 10),
                                            jours_restants: parseInt(savedData.jours_restants, 10),
                                            jours_reportes: existingConges?.jours_reportes || 0
                                        };
                                        
                                        congesMap.set(annee, updatedCongesData);
                                        console.log(`🔄 ✅ Congés mis à jour pour l'année ${annee}:`, updatedCongesData);
                                    });
                                    
                                    // Convertir la map en tableau et trier par année
                                    const updatedConges = Array.from(congesMap.values()).sort((a, b) => a.annee - b.annee);
                                    
                                    console.log('🔄 ✅ Agent mis à jour dans l\'état local:', {
                                        id: agent.id,
                                        nom: agent.nom,
                                        prenom: agent.prenom,
                                        conges_apres: updatedConges.map(c => ({
                                            annee: c.annee,
                                            alloues: c.jours_alloues,
                                            pris: c.jours_pris,
                                            restants: c.jours_restants
                                        }))
                                    });
                                    
                                    // Créer un NOUVEL objet agent avec une NOUVELLE référence pour forcer React à détecter le changement
                                    return {
                                        ...agent,
                                        conges: updatedConges // Nouvelle référence de tableau
                                    };
                                }
                                
                                // Pour les autres agents, retourner une nouvelle référence aussi
                                return { ...agent };
                            });
                            
                            console.log('🔄 Nombre d\'agents après mise à jour:', updatedAgents.length);
                            
                            // Forcer un re-render en incrémentant la clé de rafraîchissement
                            setRefreshKey(prev => prev + 1);
                            
                            return updatedAgents;
                        });
                    }
                }
                
                // Afficher un message de succès
                setError(null);
                setSuccessMessage('✅ Modification effectuée avec succès ! Les jours de congés ont été mis à jour.');
                
                // Effacer le message de succès après 5 secondes
                setTimeout(() => {
                    setSuccessMessage(null);
                }, 5000);
                
                // Fermer le modal
                setEditModalOpen(false);
                setEditingAgent(null);
                setEditFormData({});
                
                // NE PAS recharger automatiquement - les données ont déjà été mises à jour localement
                // Le rechargement automatique écrasait les données mises à jour
                // L'utilisateur peut utiliser le bouton "Actualiser" s'il veut recharger depuis la DB
                console.log('✅ Mise à jour terminée. Les données sont à jour dans l\'état local.');
            } else {
                console.error('❌ Erreur lors de la sauvegarde:', result);
                setError(result.error || 'Erreur lors de la mise à jour');
                setSuccessMessage(null);
            }
        } catch (err) {
            console.error('Erreur lors de la sauvegarde:', err);
            setError('Erreur de connexion au serveur');
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        setEditModalOpen(false);
        setEditingAgent(null);
        setEditFormData({});
    };

    const getCongesForYear = (agent, year) => {
        // Utiliser la fonction utilitaire centralisée qui garantit toujours le calcul correct
        const conges = getCongesForYearUtil(agent.conges || [], year);
        return {
            jours_alloues: conges.jours_alloues,
            jours_pris: conges.jours_pris,
            jours_restants: conges.jours_restants // Toujours recalculé correctement par la fonction utilitaire
        };
    };

    const breadcrumbs = [
        { name: 'Gestion du Personnel', active: false },
        { name: 'Jours de congés', active: true }
    ];

    return (
        <Page title="Jours de congés" breadcrumbs={breadcrumbs}>
            <Row>
                <Col>
                    <Card>
                        <CardHeader>
                            <CardTitle className="d-flex align-items-center">
                                <MdEvent className="me-2" size={24} />
                                Gestion des jours de congés des agents
                            </CardTitle>
                        </CardHeader>
                        <CardBody>
                            {error && (
                                <Alert color="danger" className="mb-3" toggle={() => setError(null)}>
                                    {error}
                                </Alert>
                            )}
                            
                            {successMessage && (
                                <Alert color="success" className="mb-3" toggle={() => setSuccessMessage(null)}>
                                    {successMessage}
                                </Alert>
                            )}

                            {/* Barre de recherche */}
                            <Row className="mb-3">
                                <Col md="6">
                                    <div className="position-relative">
                                        <Input
                                            type="text"
                                            placeholder="Rechercher par matricule, nom ou prénoms..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            style={{ paddingLeft: '40px' }}
                                        />
                                        <MdSearch
                                            style={{
                                                position: 'absolute',
                                                left: '12px',
                                                top: '50%',
                                                transform: 'translateY(-50%)',
                                                color: '#6c757d'
                                            }}
                                        />
                                    </div>
                                </Col>
                                <Col md="6" className="text-right">
                                    <Button color="primary" onClick={loadAgents} disabled={loading}>
                                        {loading ? <Spinner size="sm" /> : 'Actualiser'}
                                    </Button>
                                </Col>
                            </Row>

                            {loading ? (
                                <div className="text-center py-5">
                                    <Spinner color="primary" />
                                    <p className="mt-2">Chargement des agents...</p>
                                </div>
                            ) : filteredAgents.length === 0 ? (
                                <Alert color="info">
                                    {searchTerm ? 'Aucun agent trouvé pour cette recherche.' : 'Aucun agent trouvé.'}
                                </Alert>
                            ) : (
                                <>
                                <div className="table-responsive">
                                    <Table striped bordered hover>
                                        <thead>
                                            <tr>
                                                <th>Matricule</th>
                                                <th>Nom</th>
                                                <th>Prénoms</th>
                                                <th className="text-center">{yearBeforePrevious}</th>
                                                <th className="text-center">{previousYear}</th>
                                                <th className="text-center">{currentYear}</th>
                                                <th className="text-center">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {paginatedAgents.map((agent) => (
                                                <tr key={`${agent.id}-${refreshKey}`}>
                                                    <td>{agent.matricule || '-'}</td>
                                                    <td>{agent.nom || '-'}</td>
                                                    <td>{agent.prenom || '-'}</td>
                                                    {years.map((year) => {
                                                        const conges = getCongesForYear(agent, year);
                                                        // RECALCUL FORCÉ - Ne jamais utiliser conges.jours_restants directement
                                                        const jours_alloues = parseInt(conges.jours_alloues, 10) || 30;
                                                        const jours_pris = parseInt(conges.jours_pris, 10) || 0;
                                                        const jours_restants = Math.max(0, jours_alloues - jours_pris);
                                                        
                                                        return (
                                                            <td key={year} className="text-center">
                                                                <div>
                                                                    <strong>{jours_alloues}</strong> jours
                                                                </div>
                                                                {jours_pris > 0 && (
                                                                    <small className="text-muted d-block">
                                                                        ({jours_pris} pris, {jours_restants} restants)
                                                                    </small>
                                                                )}
                                                            </td>
                                                        );
                                                    })}
                                                    <td className="text-center">
                                                        <Button
                                                            color="primary"
                                                            size="sm"
                                                            onClick={() => handleEdit(agent)}
                                                        >
                                                            <MdEdit className="me-1" />
                                                            Modifier
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                </div>

                                {totalFiltered > 0 && (
                                    <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mt-3" style={{ width: '100%' }}>
                                        <div className="d-flex align-items-center gap-2" style={{ flexShrink: 0 }}>
                                            <span className="text-muted">
                                                {startIndex + 1}-{Math.min(endIndex, totalFiltered)} sur {totalFiltered} agent(s)
                                            </span>
                                            <select
                                                className="form-select form-select-sm w-auto"
                                                value={rowsPerPage}
                                                onChange={(e) => {
                                                    setRowsPerPage(Number(e.target.value));
                                                    setCurrentPage(1);
                                                }}
                                            >
                                                {[10, 25, 50, 100].map(n => (
                                                    <option key={n} value={n}>{n} par page</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div style={{ 
                                            maxWidth: '100%', 
                                            overflowX: 'auto', 
                                            overflowY: 'hidden',
                                            WebkitOverflowScrolling: 'touch',
                                            flexShrink: 1,
                                            minWidth: 0
                                        }}>
                                            <Pagination className="mb-0" style={{ 
                                                margin: 0, 
                                                flexWrap: 'nowrap', 
                                                display: 'flex',
                                                width: 'max-content'
                                            }}>
                                                <PaginationItem disabled={currentPage <= 1} style={{ flexShrink: 0 }}>
                                                    <PaginationLink first onClick={() => setCurrentPage(1)} />
                                                </PaginationItem>
                                                <PaginationItem disabled={currentPage <= 1} style={{ flexShrink: 0 }}>
                                                    <PaginationLink previous onClick={() => setCurrentPage(p => Math.max(1, p - 1))} />
                                                </PaginationItem>
                                                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                                    <PaginationItem key={page} active={currentPage === page} style={{ flexShrink: 0 }}>
                                                        <PaginationLink onClick={() => setCurrentPage(page)} style={{ minWidth: '40px', cursor: 'pointer' }}>
                                                            {page}
                                                        </PaginationLink>
                                                    </PaginationItem>
                                                ))}
                                                <PaginationItem disabled={currentPage >= totalPages} style={{ flexShrink: 0 }}>
                                                    <PaginationLink next onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} />
                                                </PaginationItem>
                                                <PaginationItem disabled={currentPage >= totalPages} style={{ flexShrink: 0 }}>
                                                    <PaginationLink last onClick={() => setCurrentPage(totalPages)} />
                                                </PaginationItem>
                                            </Pagination>
                                        </div>
                                    </div>
                                )}
                                </>
                            )}
                        </CardBody>
                    </Card>
                </Col>
            </Row>

            {/* Modal de modification */}
            <Modal isOpen={editModalOpen} toggle={handleCancel} size="lg">
                <ModalHeader toggle={handleCancel}>
                    <MdEdit className="me-2" />
                    Modifier les jours de congés - {editingAgent?.nom} {editingAgent?.prenom}
                </ModalHeader>
                <ModalBody>
                    {editingAgent && (
                        <Form>
                            {years.map((year) => (
                                <div key={year} className="mb-4 p-3 border rounded">
                                    <h6 className="mb-3">Année {year}</h6>
                                    <Row>
                                        <Col md="4">
                                            <FormGroup>
                                                <Label>Jours alloués</Label>
                                                <Input
                                                    type="number"
                                                    name={`annee_${year}_alloues`}
                                                    value={editFormData[`annee_${year}_alloues`] ?? ''}
                                                    onChange={handleEditFormChange}
                                                    onBlur={(e) => {
                                                        // S'assurer qu'on a une valeur valide au blur
                                                        const val = parseInt(e.target.value) || 30;
                                                        setEditFormData(prev => ({
                                                            ...prev,
                                                            [e.target.name]: val
                                                        }));
                                                    }}
                                                    placeholder="30"
                                                    min="0"
                                                />
                                            </FormGroup>
                                        </Col>
                                        <Col md="4">
                                            <FormGroup>
                                                <Label>Jours pris</Label>
                                                <Input
                                                    type="number"
                                                    name={`annee_${year}_pris`}
                                                    value={editFormData[`annee_${year}_pris`] ?? ''}
                                                    onChange={handleEditFormChange}
                                                    onBlur={(e) => {
                                                        // S'assurer qu'on a une valeur valide au blur
                                                        const val = parseInt(e.target.value) || 0;
                                                        setEditFormData(prev => ({
                                                            ...prev,
                                                            [e.target.name]: val
                                                        }));
                                                    }}
                                                    placeholder="0"
                                                    min="0"
                                                />
                                            </FormGroup>
                                        </Col>
                                        <Col md="4">
                                            <FormGroup>
                                                <Label>Jours restants</Label>
                                                <Input
                                                    type="number"
                                                    name={`annee_${year}_restants`}
                                                    value={editFormData[`annee_${year}_restants`] ?? ''}
                                                    onChange={handleEditFormChange}
                                                    onBlur={(e) => {
                                                        // Recalculer automatiquement au blur pour s'assurer de la cohérence
                                                        const alloues = parseInt(editFormData[`annee_${year}_alloues`] || 30, 10);
                                                        const pris = parseInt(editFormData[`annee_${year}_pris`] || 0, 10);
                                                        const restants = Math.max(0, alloues - pris);
                                                        setEditFormData(prev => ({
                                                            ...prev,
                                                            [e.target.name]: restants
                                                        }));
                                                    }}
                                                    placeholder="30"
                                                    min="0"
                                                    readOnly
                                                    style={{ backgroundColor: '#f8f9fa', cursor: 'not-allowed' }}
                                                    title="Calculé automatiquement : Jours alloués - Jours pris"
                                                />
                                            </FormGroup>
                                        </Col>
                                    </Row>
                                </div>
                            ))}
                        </Form>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button color="secondary" onClick={handleCancel} disabled={saving}>
                        <MdCancel className="me-1" />
                        Annuler
                    </Button>
                    <Button color="primary" onClick={handleSave} disabled={saving}>
                        {saving ? (
                            <>
                                <Spinner size="sm" className="me-1" />
                                Enregistrement...
                            </>
                        ) : (
                            <>
                                <MdSave className="me-1" />
                                Enregistrer
                            </>
                        )}
                    </Button>
                </ModalFooter>
            </Modal>
        </Page>
    );
};

export default JoursCongesPage;

