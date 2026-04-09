import React, { useState, useEffect } from 'react';
import { Card, CardBody, CardHeader, CardTitle, Button, Badge, Spinner, Alert, Table } from 'reactstrap';
import { MdPersonAdd, MdAddCircle, MdCheckCircle, MdSchedule, MdRefresh, MdWork } from 'react-icons/md';
import { getApiUrl, getAuthHeaders } from '../../config/api';
import CreateBesoinAgentModal from './CreateBesoinAgentModal';

const BesoinAgentsList = ({ agentId }) => {
    const [besoins, setBesoins] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    const loadBesoins = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetch(`${getApiUrl()}/api/demandes/agent/${agentId}`, {
                headers: getAuthHeaders()
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success && result.data) {
                    // Filtrer uniquement les demandes de type 'besoin_personnel'
                    const besoinsData = result.data.filter(d => d.type_demande === 'besoin_personnel');
                    setBesoins(besoinsData);
                }
            } else {
                throw new Error('Erreur lors du chargement des besoins.');
            }
        } catch (err) {
            console.error('Erreur :', err);
            setError('Impossible de charger la liste de vos besoins en agents.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (agentId) {
            loadBesoins();
        }
    }, [agentId, refreshKey]);

    const getStatusBadge = (status) => {
        switch (status) {
            case 'approuvee':
            case 'validé':
                return <Badge color="success"><MdCheckCircle className="me-1" /> Validé</Badge>;
            case 'en_attente':
                return <Badge color="warning" className="text-dark"><MdSchedule className="me-1" /> En attente</Badge>;
            case 'rejetee':
                return <Badge color="danger">Refusé</Badge>;
            case 'satisfait':
                 return <Badge color="primary"><MdCheckCircle className="me-1" /> Satisfait</Badge>;
            default:
                return <Badge color="secondary">{status}</Badge>;
        }
    };

    if (loading) {
        return (
            <div className="text-center py-5">
                <Spinner color="primary" />
                <p className="mt-2 text-muted">Chargement de vos expressions de besoins...</p>
            </div>
        );
    }

    return (
        <div className="besoin-agents-container animate__animated animate__fadeIn">
            <Card className="shadow-sm border-0 mb-4" style={{ borderRadius: '15px' }}>
                <CardHeader className="bg-white border-0 pt-4 pb-0 d-flex justify-content-between align-items-center">
                    <CardTitle tag="h5" className="mb-0 d-flex align-items-center text-primary" style={{ fontWeight: 'bold' }}>
                        <MdPersonAdd className="me-2" size={24} />
                        Expressions de Besoins en Personnel
                    </CardTitle>
                    <div>
                        <Button color="light" size="sm" className="me-2" onClick={() => setRefreshKey(k => k + 1)}>
                            <MdRefresh />
                        </Button>
                        <Button color="primary" size="sm" style={{ borderRadius: '20px', padding: '5px 15px' }} onClick={() => setShowCreateModal(true)}>
                            <MdAddCircle className="me-1" />
                            Nouveau besoin
                        </Button>
                    </div>
                </CardHeader>
                <CardBody>
                    {error && <Alert color="danger">{error}</Alert>}
                    
                    {besoins.length === 0 && !error ? (
                        <div className="text-center text-muted py-5" style={{ background: '#f8f9fa', borderRadius: '10px' }}>
                            <MdPersonAdd size={48} className="mb-3 text-light" />
                            <h6>Aucun besoin exprimé pour le moment</h6>
                            <p>Cliquez sur "Nouveau besoin" pour demander du personnel.</p>
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <Table className="align-middle" hover borderless style={{ borderSpacing: '0 10px', borderCollapse: 'separate' }}>
                                <thead className="bg-light text-muted">
                                    <tr>
                                        <th className="border-0 rounded-start">Date de demande</th>
                                        <th className="border-0">Poste souhaité</th>
                                        <th className="border-0 text-center">Nombre demandé</th>
                                        <th className="border-0 text-center">Nombre affecté</th>
                                        <th className="border-0 text-center">Reste à satisfaire</th>
                                        <th className="border-0 text-center rounded-end">Statut</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {besoins.map((besoin) => {
                                        const nbDemande = parseInt(besoin.nombre_agents || 0);
                                        const nbSatisfait = parseInt(besoin.agents_satisfaits || 0);
                                        const reste = Math.max(0, nbDemande - nbSatisfait);
                                        
                                        return (
                                            <tr key={besoin.id} className="bg-white shadow-sm" style={{ transition: 'transform 0.2s' }}>
                                                <td className="border-0 py-3 rounded-start">
                                                    {new Date(besoin.date_creation).toLocaleDateString()}
                                                </td>
                                                <td className="border-0 py-3 fw-bold text-dark">
                                                    <MdWork className="text-muted me-2"/>
                                                    {besoin.poste_souhaite || 'Non spécifié'}
                                                </td>
                                                <td className="border-0 py-3 text-center">
                                                    <span className="fw-bold text-dark" style={{ fontSize: '1.1rem' }}>{nbDemande}</span>
                                                </td>
                                                <td className="border-0 py-3 text-center">
                                                    <span className="fw-bold text-dark" style={{ fontSize: '1.1rem' }}>{nbSatisfait}</span>
                                                </td>
                                                <td className="border-0 py-3 text-center">
                                                    {reste > 0 ? (
                                                        <span className="text-danger fw-bold">{reste}</span>
                                                    ) : (
                                                        <span className="text-success"><MdCheckCircle /></span>
                                                    )}
                                                </td>
                                                <td className="border-0 py-3 text-center rounded-end">
                                                    {reste === 0 && nbDemande > 0 ? getStatusBadge('satisfait') : getStatusBadge(besoin.statut)}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </Table>
                        </div>
                    )}
                </CardBody>
            </Card>

            {showCreateModal && (
                <CreateBesoinAgentModal 
                    isOpen={showCreateModal}
                    toggle={() => setShowCreateModal(false)}
                    agentId={agentId}
                    onSuccess={() => setRefreshKey(k => k + 1)}
                />
            )}
        </div>
    );
};

export default BesoinAgentsList;
