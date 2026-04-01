import React, { useState } from 'react';
import { Container, Row, Col, Nav, NavItem, NavLink, TabContent, TabPane } from 'reactstrap';
import Page from 'components/Page';
import DocumentsGenerated from 'components/Documents/DocumentsGenerated';
import { useAuth } from '../contexts/AuthContext';

const DocumentsGeneresPage = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState('absence');

    const tabsConfig = [
        {
            id: 'absence',
            icon: 'fa fa-calendar-times',
            label: "Autorisations d'Absence"
        },
        {
            id: 'certificat_reprise_service',
            icon: 'fa fa-refresh',
            label: "Certificats de Reprise de Service"
        },
        {
            id: 'sortie_territoire',
            icon: 'fa fa-plane',
            label: "Autorisations de Sortie du Territoire"
        },
        {
            id: 'attestation_presence',
            icon: 'fa fa-certificate',
            label: 'Attestations de Présence'
        },
        {
            id: 'attestation_travail',
            icon: 'fa fa-briefcase',
            label: 'Attestations de Travail'
        },
        {
            id: 'certificat_cessation',
            icon: 'fa fa-file-contract',
            label: 'Certificats de Cessation'
        },
        {
            id: 'certificat_non_jouissance_conge',
            icon: 'fa fa-calendar-times-o',
            label: 'Certificats de Non Jouissance de Congé'
        }
    ];

    // Vérifier si l'utilisateur a les droits pour consulter les documents
    const canViewDocuments = user && ['drh', 'chef_service', 'directeur', 'ministre', 'super_admin'].includes(user.role?.toLowerCase());

    if (!canViewDocuments) {
        return (
            <Page title="Documents Générés" breadcrumbs={[{ name: 'Documents Générés', active: true }]}>
                <Container fluid>
                    <div className="text-center py-5">
                        <i className="fa fa-lock fa-3x text-muted mb-3"></i>
                        <h4 className="text-muted">Accès non autorisé</h4>
                        <p className="text-muted">Vous n'avez pas les droits pour consulter les documents générés.</p>
                    </div>
                </Container>
            </Page>
        );
    }

    return (
        <Page title="Documents Générés" breadcrumbs={[{ name: 'Documents Générés', active: true }]}>
            <Container fluid>
                <Row>
                    <Col>
                        <Nav tabs>
                            {tabsConfig.map(tab => (
                                <NavItem key={tab.id}>
                                    <NavLink
                                        className={activeTab === tab.id ? 'active' : ''}
                                        onClick={() => setActiveTab(tab.id)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        <i className={`${tab.icon} me-1`}></i>
                                        {tab.label}
                                    </NavLink>
                                </NavItem>
                            ))}
                        </Nav>

                        <TabContent activeTab={activeTab}>
                            <TabPane tabId="absence">
                                <div className="mt-3">
                                    <DocumentsGenerated typeDemande="absence" />
                                </div>
                            </TabPane>
                            <TabPane tabId="certificat_reprise_service">
                                <div className="mt-3">
                                    <DocumentsGenerated typeDemande="certificat_reprise_service" />
                                </div>
                            </TabPane>
                            <TabPane tabId="sortie_territoire">
                                <div className="mt-3">
                                    <DocumentsGenerated typeDemande="sortie_territoire" />
                                </div>
                            </TabPane>
                            <TabPane tabId="attestation_presence">
                                <div className="mt-3">
                                    <DocumentsGenerated typeDemande="attestation_presence" />
                                </div>
                            </TabPane>
                            <TabPane tabId="attestation_travail">
                                <div className="mt-3">
                                    <DocumentsGenerated typeDemande="attestation_travail" />
                                </div>
                            </TabPane>
                            <TabPane tabId="certificat_cessation">
                                <div className="mt-3">
                                    <DocumentsGenerated typeDemande="certificat_cessation" />
                                </div>
                            </TabPane>
                            <TabPane tabId="certificat_non_jouissance_conge">
                                <div className="mt-3">
                                    <DocumentsGenerated typeDemande="certificat_non_jouissance_conge" />
                                </div>
                            </TabPane>
                        </TabContent>
                    </Col>
                </Row>
            </Container>
        </Page>
    );
};

export default DocumentsGeneresPage;
