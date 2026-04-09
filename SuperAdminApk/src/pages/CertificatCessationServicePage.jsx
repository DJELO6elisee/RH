import React, { useState } from 'react';
import { Container, Row, Col } from 'reactstrap';
import Page from 'components/Page';
import DemandesList from 'components/Demandes/DemandesList';
import DemandesDRHList from 'components/Demandes/DemandesDRHList';
import DemandeDetails from 'components/Demandes/DemandeDetails';
import ValidationModal from 'components/Demandes/ValidationModal';
import { useAuth } from '../contexts/AuthContext';

const CertificatCessationServicePage = () => {
    const { user } = useAuth();
    
    // États pour gérer les modals
    const [showDemandeDetails, setShowDemandeDetails] = useState(false);
    const [showValidationModal, setShowValidationModal] = useState(false);
    const [selectedDemande, setSelectedDemande] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);
    
    // Déterminer si l'utilisateur est un DRH ou un agent
    const isDRH = user && ['drh', 'chef_service', 'directeur', 'ministre', 'super_admin'].includes(user.role?.toLowerCase());
    
    // Fonction pour gérer les clics sur les demandes
    const handleDemandeClick = (action, demande = null) => {
        console.log('Demande clicked:', action, demande);
        
        if (action === 'view') {
            setSelectedDemande(demande);
            setShowDemandeDetails(true);
        } else if (action === 'validate') {
            setSelectedDemande(demande);
            setShowValidationModal(true);
        } else if (action === 'transmit' && demande) {
            handleTransmitDocument(demande);
        }
    };

    // Fonction pour transmettre un document à l'agent
    const handleTransmitDocument = async (demande) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`https://tourisme.2ise-groupe.com/api/documents/${demande.id}/transmit`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    commentaire: 'Document transmis par le DRH'
                })
            });

            const result = await response.json();
            
            if (result.success) {
                alert('Document transmis avec succès à l\'agent');
                // Recharger la liste des demandes
                setRefreshKey(prev => prev + 1);
            } else {
                alert('Erreur lors de la transmission: ' + result.error);
            }
        } catch (error) {
            console.error('Erreur lors de la transmission:', error);
            alert('Erreur lors de la transmission du document');
        }
    };

    // Fonction appelée après validation réussie
    const handleValidationSuccess = () => {
        setShowValidationModal(false);
        setSelectedDemande(null);
        // Recharger la liste des demandes
        setRefreshKey(prev => prev + 1);
    };
    
    return (
        <Page title="Certificat de Cessation de Service" breadcrumbs={[{ name: 'Certificat de Cessation de Service', active: true }]}>
            <Container fluid>
                <Row>
                    <Col>
                        {isDRH ? (
                            <DemandesDRHList 
                                key={refreshKey}
                                typeDemande="certificat_cessation" 
                                onDemandeClick={handleDemandeClick}
                            />
                        ) : (
                            <DemandesList typeDemande="certificat_cessation" />
                        )}
                    </Col>
                </Row>

                {/* Modal de détails de la demande */}
                {showDemandeDetails && selectedDemande && (
                    <DemandeDetails
                        isOpen={showDemandeDetails}
                        toggle={() => setShowDemandeDetails(false)}
                        demande={selectedDemande}
                        agentId={user?.id_agent}
                        onValidationSuccess={handleValidationSuccess}
                    />
                )}

                {/* Modal de validation */}
                {showValidationModal && selectedDemande && (
                    <ValidationModal
                        isOpen={showValidationModal}
                        toggle={() => setShowValidationModal(false)}
                        demande={selectedDemande}
                        onValidate={handleValidationSuccess}
                    />
                )}
            </Container>
        </Page>
    );
};

export default CertificatCessationServicePage;
