/* eslint-disable */
// prettier-ignore
import React from 'react';

import { AnnouncementCard, TodosCard } from 'components/Card';
import Page from 'components/Page';
import SupportTicket from 'components/SupportTicket';
import UserProgressTable from 'components/UserProgressTable';
import { IconWidget, NumberWidget } from 'components/Widget';
import {
    avatarsData,
    productsData,
    supportTicketsData,
    todosData,
    userProgressTableData,
} from 'demos/dashboardPage';
import {
    MdPeople,
    MdPerson,
    MdPersonPin,
    MdRateReview,
    MdShare,
    MdThumbUp,
    MdWork,
    MdAssignment,
    MdWoman,
    MdMan,
} from 'react-icons/md';
import {
    Button,
    Card,
    CardBody,
    CardGroup,
    CardHeader,
    Col,
    Row,
} from 'reactstrap';

// ─── Carte statistique réutilisable ────────────────────────────────────────────
const StatCard = ({ icon: Icon, iconColor, label, value, sub1Label, sub1Value, sub1Color, sub2Label, sub2Value, sub2Color, accentColor }) => (
    <Card style={{ borderTop: `4px solid ${accentColor}`, borderRadius: 8, height: '100%' }}>
        <CardBody>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                <div style={{
                    width: 48, height: 48, borderRadius: '50%',
                    background: `${accentColor}18`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginRight: 14, flexShrink: 0,
                }}>
                    <Icon size={26} color={accentColor} />
                </div>
                <div>
                    <div style={{ fontSize: 13, color: '#6c757d', fontWeight: 500, marginBottom: 2 }}>{label}</div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: '#212529', lineHeight: 1 }}>
                        {Number(value || 0).toLocaleString('fr-FR')}
                    </div>
                </div>
            </div>
            {(sub1Label || sub2Label) && (
                <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                    {sub1Label && (
                        <div style={{
                            flex: 1, minWidth: 90,
                            background: `${sub1Color || '#6c757d'}12`,
                            borderRadius: 6, padding: '6px 10px',
                            borderLeft: `3px solid ${sub1Color || '#6c757d'}`,
                        }}>
                            <div style={{ fontSize: 11, color: '#6c757d', marginBottom: 2 }}>{sub1Label}</div>
                            <div style={{ fontSize: 18, fontWeight: 700, color: sub1Color || '#6c757d' }}>
                                {Number(sub1Value || 0).toLocaleString('fr-FR')}
                            </div>
                        </div>
                    )}
                    {sub2Label && (
                        <div style={{
                            flex: 1, minWidth: 90,
                            background: `${sub2Color || '#6c757d'}12`,
                            borderRadius: 6, padding: '6px 10px',
                            borderLeft: `3px solid ${sub2Color || '#6c757d'}`,
                        }}>
                            <div style={{ fontSize: 11, color: '#6c757d', marginBottom: 2 }}>{sub2Label}</div>
                            <div style={{ fontSize: 18, fontWeight: 700, color: sub2Color || '#6c757d' }}>
                                {Number(sub2Value || 0).toLocaleString('fr-FR')}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </CardBody>
    </Card>
);

// ─── Composant principal ────────────────────────────────────────────────────────
class DashboardPage extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            stats: {
                totalAgents: 0,
                totalMinisteres: 0,
                totalEntites: 0,
                totalInstitutions: 0,
                // Genre
                totalHommes: 0,
                totalFemmes: 0,
                // Fonctionnaires
                totalFonctionnaires: 0,
                fonctionnairesHommes: 0,
                fonctionnairesFemmes: 0,
                // Contractuels (contractuel + BNETD + article 18)
                totalContractuels: 0,
                contractuelsHommes: 0,
                contractuelsFemmes: 0,
            },
            loading: true,
        };
    }

    componentDidMount() {
        window.scrollTo(0, 0);
        this.loadGlobalStats();
    }

    loadGlobalStats = async () => {
        try {
            const response = await fetch('https://tourisme.2ise-groupe.com/api/ministeres/stats/global');
            const result = await response.json();

            if (result.success) {
                const d = result.data;
                this.setState({
                    stats: {
                        totalAgents: parseInt(d.total_agents) || 0,
                        totalMinisteres: parseInt(d.total_ministeres) || 0,
                        totalEntites: parseInt(d.total_entites) || 0,
                        totalInstitutions: parseInt(d.total_entites) || 0,
                        // Genre
                        totalHommes: parseInt(d.total_hommes) || 0,
                        totalFemmes: parseInt(d.total_femmes) || 0,
                        // Fonctionnaires
                        totalFonctionnaires: parseInt(d.total_fonctionnaires) || 0,
                        fonctionnairesHommes: parseInt(d.fonctionnaires_hommes) || 0,
                        fonctionnairesFemmes: parseInt(d.fonctionnaires_femmes) || 0,
                        // Contractuels
                        totalContractuels: parseInt(d.total_contractuels) || 0,
                        contractuelsHommes: parseInt(d.contractuels_hommes) || 0,
                        contractuelsFemmes: parseInt(d.contractuels_femmes) || 0,
                    },
                    loading: false,
                });
            } else {
                this.setState({ loading: false });
            }
        } catch (error) {
            console.error('Erreur lors du chargement des statistiques:', error);
            this.setState({ loading: false });
        }
    };

    render() {
        const { stats, loading } = this.state;

        if (loading) {
            return (
                <Page className="DashboardPage" title="Tableau de Bord Super Admin" breadcrumbs={[{ name: 'Dashboard', active: true }]}>
                    <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
                        <div className="spinner-border text-primary" role="status">
                            <span className="sr-only">Chargement...</span>
                        </div>
                        <span className="ms-2" style={{ marginLeft: 12 }}>Chargement des statistiques...</span>
                    </div>
                </Page>
            );
        }

        return (
            <Page
                className="DashboardPage"
                title="Tableau de Bord Super Admin"
                breadcrumbs={[{ name: 'Dashboard', active: true }]}
                style={{ overflowX: 'hidden' }}
            >

                {/* ── Ligne 1 : Chiffres globaux ── */}
                <Row>
                    <Col lg={3} md={6} sm={6} xs={12}>
                        <NumberWidget
                            title="Total Agents"
                            subtitle="Pour Tous ministères"
                            number={stats.totalAgents.toString()}
                        // color="primary"
                        // progress={{ value: 100, label: 'Tous agents' }}
                        />
                    </Col>
                    <Col lg={3} md={6} sm={6} xs={12}>
                        <NumberWidget
                            title="Tous les Ministères"
                            subtitle="Actifs"
                            number={stats.totalMinisteres.toString()}
                        // color="success"
                        // progress={{ value: 100, label: 'Tous ministères' }}
                        />
                    </Col>
                    <Col lg={3} md={6} sm={6} xs={12}>
                        <NumberWidget
                            title="Autres Entreprises Publiques"
                            subtitle="et Collectivités Territotiales"
                            number={stats.totalEntites.toString()}
                        // color="info"
                        // progress={{ value: 100, label: 'Toutes entités' }}
                        />
                    </Col>
                    <Col lg={3} md={6} sm={6} xs={12}>
                        <NumberWidget
                            title="Toutes les Institutions"
                            subtitle="Publiques"
                            number={stats.totalInstitutions.toString()}
                        // color="warning"
                        // progress={{ value: 100, label: 'Toutes institutions' }}
                        />
                    </Col>
                </Row>

                {/* ── Ligne 2 : Répartition Genre ── */}
                <div style={{ marginTop: 8, marginBottom: 4 }}>
                    <h6 style={{ fontWeight: 700, color: '#495057', textTransform: 'uppercase', letterSpacing: 1, fontSize: 12 }}>
                        Répartition par Genre — Tous Ministères
                    </h6>
                </div>
                <Row style={{ marginBottom: 16 }}>
                    <Col lg={6} md={6} sm={12} xs={12} style={{ marginBottom: 16 }}>
                        <StatCard
                            icon={MdMan}
                            label="Total Hommes"
                            value={stats.totalHommes}
                            accentColor="#1976d2"
                            sub1Label="Fonctionnaires"
                            sub1Value={stats.fonctionnairesHommes}
                            sub1Color="#1976d2"
                            sub2Label="Contractuels"
                            sub2Value={stats.contractuelsHommes}
                            sub2Color="#0288d1"
                        />
                    </Col>
                    <Col lg={6} md={6} sm={12} xs={12} style={{ marginBottom: 16 }}>
                        <StatCard
                            icon={MdWoman}
                            label="Total Femmes"
                            value={stats.totalFemmes}
                            accentColor="#d81b60"
                            sub1Label="Fonctionnaires"
                            sub1Value={stats.fonctionnairesFemmes}
                            sub1Color="#d81b60"
                            sub2Label="Contractuelles"
                            sub2Value={stats.contractuelsFemmes}
                            sub2Color="#e91e63"
                        />
                    </Col>
                </Row>

                {/* ── Ligne 3 : Répartition Type d'agent ── */}
                <div style={{ marginBottom: 4 }}>
                    <h6 style={{ fontWeight: 700, color: '#495057', textTransform: 'uppercase', letterSpacing: 1, fontSize: 12 }}>
                        Répartition par Statut d'Agent
                    </h6>
                </div>
                <Row style={{ marginBottom: 24 }}>
                    <Col lg={6} md={6} sm={12} xs={12} style={{ marginBottom: 16 }}>
                        <StatCard
                            icon={MdWork}
                            label="Fonctionnaires"
                            value={stats.totalFonctionnaires}
                            accentColor="#2e7d32"
                            sub1Label="Hommes"
                            sub1Value={stats.fonctionnairesHommes}
                            sub1Color="#388e3c"
                            sub2Label="Femmes"
                            sub2Value={stats.fonctionnairesFemmes}
                            sub2Color="#66bb6a"
                        />
                    </Col>
                    <Col lg={6} md={6} sm={12} xs={12} style={{ marginBottom: 16 }}>
                        <StatCard
                            icon={MdAssignment}
                            label="Contractuels (incl. BNETD & Art.18)"
                            value={stats.totalContractuels}
                            accentColor="#e65100"
                            sub1Label="Hommes"
                            sub1Value={stats.contractuelsHommes}
                            sub1Color="#ef6c00"
                            sub2Label="Femmes"
                            sub2Value={stats.contractuelsFemmes}
                            sub2Color="#ffa726"
                        />
                    </Col>
                </Row>

                {/* ── IconWidgets ── */}
                {/* <CardGroup style={{ marginBottom: '1rem' }}>
                    <IconWidget
                        bgColor="white"
                        inverse={false}
                        icon={MdThumbUp}
                        title="50+ Évaluations"
                        subtitle="Entretiens réalisés"
                    />
                    <IconWidget
                        bgColor="white"
                        inverse={false}
                        icon={MdRateReview}
                        title="10+ Candidats"
                        subtitle="Nouveaux entretiens"
                    />
                    <IconWidget
                        bgColor="white"
                        inverse={false}
                        icon={MdShare}
                        title="30+ Formations"
                        subtitle="Nouvelles sessions"
                    />
                </CardGroup> */}

                {/* ── Nouveaux Employés ── */}
                {/* <Row>
                    <Col md="12" sm="12" xs="12">
                        <Card>
                            <CardHeader>Nouveaux Employés</CardHeader>
                            <CardBody>
                                {userProgressTableData && userProgressTableData.map ? (
                                    <UserProgressTable
                                        headers={[
                                            <MdPersonPin size={25} />,
                                            'nom',
                                            'date',
                                            'performance',
                                            '%',
                                        ]}
                                        usersData={userProgressTableData}
                                    />
                                ) : (
                                    <div>Données des utilisateurs non disponibles</div>
                                )}
                            </CardBody>
                        </Card>
                    </Col>
                </Row> */}

                {/* ── Annonces / Demandes / Todos ── */}
                {/* <Row style={{ marginTop: 16 }}>
                    <Col lg="4" md="12" sm="12" xs="12">
                        <AnnouncementCard
                            color="gradient-secondary"
                            header="Annonce"
                            avatarSize={60}
                            name="DRH"
                            date="il y a 1 heure"
                            text="Nouvelle politique de télétravail mise en place. Tous les employés peuvent désormais bénéficier de 2 jours de télétravail par semaine."
                            buttonProps={{ children: 'voir' }}
                            style={{ height: 500 }}
                        />
                    </Col>
                    <Col lg="4" md="12" sm="12" xs="12">
                        <Card>
                            <CardHeader>
                                <div className="d-flex justify-content-between align-items-center">
                                    <span>Demandes RH</span>
                                    <Button><small>Voir Tout</small></Button>
                                </div>
                            </CardHeader>
                            <CardBody>
                                {supportTicketsData && supportTicketsData.map ? (
                                    supportTicketsData.map(supportTicket => (
                                        <SupportTicket key={supportTicket.id} {...supportTicket} />
                                    ))
                                ) : (
                                    <div>Données des tickets de support non disponibles</div>
                                )}
                            </CardBody>
                        </Card>
                    </Col>
                    <Col lg="4" md="12" sm="12" xs="12">
                        {todosData && todosData.map ? (
                            <TodosCard todos={todosData} />
                        ) : (
                            <Card>
                                <CardBody>
                                    <div>Données des todos non disponibles</div>
                                </CardBody>
                            </Card>
                        )}
                    </Col>
                </Row> */}
            </Page>
        );
    }
}

export default DashboardPage;
