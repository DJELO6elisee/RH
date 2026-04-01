import React from 'react';
import { Container, Row, Col } from 'reactstrap';
import Page from 'components/Page';
import DemandesHistoriqueGlobal from 'components/Demandes/DemandesHistoriqueGlobal';

const DemandeHistoriquePage = () => (
    <Page
        title="Historique des Autorisations"
        breadcrumbs={[
            { name: 'Gestions des documents administratifs' },
            { name: 'Historique des Autorisations', active: true }
        ]}
    >
        <Container fluid>
            <Row>
                <Col>
                    <DemandesHistoriqueGlobal />
                </Col>
            </Row>
        </Container>
    </Page>
);

export default DemandeHistoriquePage;


