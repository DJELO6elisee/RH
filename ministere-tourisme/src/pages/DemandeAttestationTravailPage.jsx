import React, { useState } from 'react';
import { Container, Row, Col } from 'reactstrap';
import Page from 'components/Page';
import DemandesList from 'components/Demandes/DemandesList';
import DemandesDRHList from 'components/Demandes/DemandesDRHList';
import DemandeDetails from 'components/Demandes/DemandeDetails';
import { useAuth } from '../contexts/AuthContext';

const DemandeAttestationTravailPage = () => {
    const { user } = useAuth();
    const [selectedDemande, setSelectedDemande] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    
    // Déterminer si l'utilisateur est un DRH ou un agent
    const isDRH = user && ['drh', 'chef_service', 'directeur', 'ministre', 'super_admin'].includes(user.role?.toLowerCase());
    
    const validateDemandes = async (demandeIds) => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                alert('Session expirée, veuillez vous reconnecter.');
                return;
            }

            const promises = demandeIds.map(id => 
                fetch(`https://tourisme.2ise-groupe.com/api/demandes/${id}/valider`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ 
                        action: 'approuve', 
                        commentaire: demandeIds.length > 1 ? 'Validation groupée directe' : 'Validation directe',
                        generate_document: true 
                    })
                })
            );

            const results = await Promise.all(promises);
            const allOk = results.every(res => res.ok);

            if (allOk) {
                alert('Validation effectuée avec succès.');
                window.location.reload();
            } else {
                alert('Certaines validations ont échoué. Veuillez vérifier.');
                window.location.reload();
            }
        } catch (error) {
            console.error('Erreur lors de la validation', error);
            alert('Erreur lors de la validation.');
        }
    };

    const handleBulkValidate = (selectedIds) => {
        if (window.confirm(`Êtes-vous sûr de vouloir valider les ${selectedIds.length} demandes sélectionnées ?`)) {
            validateDemandes(selectedIds);
        }
    };

    const handleDemandeClick = (action, demande) => {
        if (action === 'view') {
            setSelectedDemande(demande);
            setModalOpen(true);
        } else if (action === 'validate') {
            if (window.confirm('Êtes-vous sûr de vouloir valider cette demande ?')) {
                validateDemandes([demande.id]);
            }
        }
    };
    
    return (
        <Page title="Demande d'Attestation de Travail" breadcrumbs={[{ name: 'Demande d\'Attestation de Travail', active: true }]}>
            <Container fluid>
                <Row>
                    <Col>
                        {isDRH ? (
                            <DemandesDRHList 
                                typeDemande="attestation_travail" 
                                onDemandeClick={handleDemandeClick}
                                onBulkValidate={handleBulkValidate}
                            />
                        ) : (
                            <DemandesList typeDemande="attestation_travail" />
                        )}
                    </Col>
                </Row>
            </Container>
            
            {/* Modal pour afficher les détails */}
            <DemandeDetails 
                isOpen={modalOpen}
                toggle={() => setModalOpen(false)}
                demande={selectedDemande}
                agentId={user?.id_agent}
            />
        </Page>
    );
};

export default DemandeAttestationTravailPage;
