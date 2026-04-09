import React, { useState } from 'react';
import { Container, Row, Col } from 'reactstrap';
import Page from 'components/Page';
import DemandesList from 'components/Demandes/DemandesList';
import DemandesDRHList from 'components/Demandes/DemandesDRHList';
import DemandeDetails from 'components/Demandes/DemandeDetails';
import { useAuth } from '../contexts/AuthContext';

const AutorisationCongesPage = () => {
    const { user } = useAuth();
    const [selectedDemande, setSelectedDemande] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    const isDRH = user && ['drh', 'chef_service', 'directeur', 'ministre', 'super_admin'].includes(user.role?.toLowerCase());

    const handleDemandeClick = (action, demande) => {
        if (action === 'view') {
            setSelectedDemande(demande);
            setModalOpen(true);
        }
    };

    const handleValidationSuccess = () => {
        setRefreshKey(prev => prev + 1);
    };

    return (
        <Page title="Autorisation de Congé" breadcrumbs={[{ name: 'Autorisation de Congé', active: true }]}>
            <Container fluid>
                <Row>
                    <Col>
                        {isDRH ? (
                            <DemandesDRHList
                                key={refreshKey}
                                typeDemande="autorisation_conges"
                                onDemandeClick={handleDemandeClick}
                            />
                        ) : (
                            <DemandesList typeDemande="autorisation_conges" />
                        )}
                    </Col>
                </Row>
            </Container>

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

export default AutorisationCongesPage;

