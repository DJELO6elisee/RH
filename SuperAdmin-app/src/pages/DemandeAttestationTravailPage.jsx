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
    
    const handleDemandeClick = (action, demande) => {
        if (action === 'view') {
            setSelectedDemande(demande);
            setModalOpen(true);
        } else if (action === 'validate') {
            // Logique de validation directe
            console.log('Validation directe:', demande);
            // Ici vous pouvez ajouter une logique de validation rapide
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
