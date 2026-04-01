import React, { useState } from 'react';
import { Container, Row, Col } from 'reactstrap';
import Page from 'components/Page';
import DemandesList from 'components/Demandes/DemandesList';
import DemandesDRHList from 'components/Demandes/DemandesDRHList';
import DemandeDetails from 'components/Demandes/DemandeDetails';
import { useAuth } from '../contexts/AuthContext';

const DemandeAbsencePage = () => {
    const { user } = useAuth();
    const [selectedDemande, setSelectedDemande] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    
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

    const handleValidationSuccess = () => {
        // Forcer le rechargement de la liste des demandes
        setRefreshKey(prev => prev + 1);
    };
    
    return (
        <Page title="Demande d'Absence" breadcrumbs={[{ name: 'Demande d\'Absence', active: true }]}>
            <Container fluid>
                <Row>
                    <Col>
                        {isDRH ? (
                            <DemandesDRHList 
                                key={refreshKey}
                                typeDemande="absence" 
                                onDemandeClick={handleDemandeClick}
                            />
                        ) : (
                            <DemandesList typeDemande="absence" />
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
                onValidationSuccess={handleValidationSuccess}
            />
        </Page>
    );
};

export default DemandeAbsencePage;
