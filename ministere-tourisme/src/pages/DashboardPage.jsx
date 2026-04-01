/* eslint-disable */
// prettier-ignore
import React from 'react';

import { AnnouncementCard, TodosCard } from 'components/Card';
import HorizontalAvatarList from 'components/HorizontalAvatarList';
// import MapWithBubbles from 'components/MapWithBubbles';
import Page from 'components/Page';
import ProductMedia from 'components/ProductMedia';
import SupportTicket from 'components/SupportTicket';
import UserProgressTable from 'components/UserProgressTable';
import { IconWidget, NumberWidget } from 'components/Widget';
import { getStackLineChart, stackLineChartOptions } from 'demos/chartjs';
import {
    avatarsData,
    chartjs,
    productsData,
    supportTicketsData,
    todosData,
    userProgressTableData,
} from 'demos/dashboardPage';
import { Bar, Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import {
    MdBubbleChart,
    MdInsertChart,
    MdPersonPin,
    MdPieChart,
    MdRateReview,
    MdShare,
    MdShowChart,
    MdThumbUp,
} from 'react-icons/md';
import {
    Badge,
    Button,
    Card,
    CardBody,
    CardDeck,
    CardGroup,
    CardHeader,
    CardTitle,
    Col,
    ListGroup,
    ListGroupItem,
    Row,
} from 'reactstrap';
import { getColor } from 'utils/colors';
import { isValidChartData, createSafeChartData } from 'utils/chartValidation';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend
);

const today = new Date();
const lastWeek = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() - 7,
);

class DashboardPage extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            stats: {
                totalAgents: 0,
                totalMinisteres: 0,
                totalInstitutions: 0,
                totalEntites: 0
            },
            loading: true
        };
    }

    componentDidMount() {
        // this is needed, because InfiniteCalendar forces window scroll
        window.scrollTo(0, 0);
        this.loadGlobalStats();
    }

    loadGlobalStats = async () => {
        try {
            // Charger les statistiques globales
            const response = await fetch('https://tourisme.2ise-groupe.com/api/ministeres/stats/global');
            const result = await response.json();
            
            if (result.success) {
                this.setState({
                    stats: {
                        totalAgents: result.data.total_agents || 0,
                        totalMinisteres: result.data.total_ministeres || 0,
                        totalInstitutions: result.data.total_entites || 0,
                        totalEntites: result.data.total_entites || 0
                    },
                    loading: false
                });
            }
        } catch (error) {
            console.error('Erreur lors du chargement des statistiques:', error);
            this.setState({ loading: false });
        }
    }

    render() {
        const primaryColor = getColor('primary');
        const { stats, loading } = this.state;

        // Vérification des données des graphiques
        const isLineChartValid = chartjs && chartjs.line && isValidChartData(chartjs.line.data);
        const isBarChartValid = chartjs && chartjs.bar && isValidChartData(chartjs.bar.data);

        if (loading) {
            return (
                <Page className="DashboardPage" title="Dashboard" breadcrumbs={[{ name: 'Dashboard', active: true }]}>
                    <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
                        <div className="spinner-border text-primary" role="status">
                            <span className="sr-only">Chargement...</span>
                        </div>
                        <span className="ms-2">Chargement des statistiques...</span>
                    </div>
                </Page>
            );
        }

        if (!isLineChartValid || !isBarChartValid) {
            console.error('Données des graphiques manquantes ou invalides:', { chartjs });
            return (
                <Page className="DashboardPage" title="Dashboard" breadcrumbs={[{ name: 'Dashboard', active: true }]}>
                    <div>Erreur: Données des graphiques non disponibles</div>
                </Page>
            );
        }

        return (
            <Page className="DashboardPage" title="Dashboard Super Admin" breadcrumbs={[{ name: 'Dashboard', active: true }]}>
                <Row>
                    <Col lg={3} md={6} sm={6} xs={12}>
                        <NumberWidget
                            title="Total Agents"
                            subtitle="Tous ministères"
                            number={stats.totalAgents.toString()}
                            color="primary"
                            progress={{
                                value: 100,
                                label: 'Tous agents',
                            }}
                        />
                    </Col>

                    <Col lg={3} md={6} sm={6} xs={12}>
                        <NumberWidget
                            title="Ministères"
                            subtitle="Actifs"
                            number={stats.totalMinisteres.toString()}
                            color="success"
                            progress={{
                                value: 100,
                                label: 'Tous ministères',
                            }}
                        />
                    </Col>

                    <Col lg={3} md={6} sm={6} xs={12}>
                        <NumberWidget
                            title="Entités"
                            subtitle="Administratives"
                            number={stats.totalEntites.toString()}
                            color="info"
                            progress={{
                                value: 100,
                                label: 'Toutes entités',
                            }}
                        />
                    </Col>

                    <Col lg={3} md={6} sm={6} xs={12}>
                        <NumberWidget
                            title="Institutions"
                            subtitle="Publiques"
                            number={stats.totalInstitutions.toString()}
                            color="warning"
                            progress={{
                                value: 100,
                                label: 'Toutes institutions',
                            }}
                        />
                    </Col>
                </Row>

                <Row>
                    <Col lg="8" md="12" sm="12" xs="12">
                        <Card>
                            <CardHeader>
                                Évolution des Recrutements{' '}
                                <small className="text-muted text-capitalize">Cette année</small>
                            </CardHeader>
                            <CardBody>
                                <Line data={createSafeChartData(chartjs.line.data)} options={chartjs.line.options} />
                            </CardBody>
                        </Card>
                    </Col>

                    <Col lg="4" md="12" sm="12" xs="12">
                        <Card>
                            <CardHeader>Formations par Mois</CardHeader>
                            <CardBody>
                                <Bar data={createSafeChartData(chartjs.bar.data)} options={chartjs.bar.options} />
                            </CardBody>
                            <ListGroup flush>
                                <ListGroupItem>
                                    <MdInsertChart size={25} color={primaryColor} />
                                    Formation Management{' '}
                                    <Badge color="secondary">15 agents</Badge>
                                </ListGroupItem>
                                <ListGroupItem>
                                    <MdBubbleChart size={25} color={primaryColor} />
                                    Formation Sécurité{' '}
                                    <Badge color="secondary">8 agents</Badge>
                                </ListGroupItem>
                                <ListGroupItem>
                                    <MdShowChart size={25} color={primaryColor} />
                                    Formation Technique{' '}
                                    <Badge color="secondary">12 agents</Badge>
                                </ListGroupItem>
                                <ListGroupItem>
                                    <MdPieChart size={25} color={primaryColor} />
                                    Formation Soft Skills{' '}
                                    <Badge color="secondary">24 agents</Badge>
                                </ListGroupItem>
                            </ListGroup>
                        </Card>
                    </Col>
                </Row>

                <CardGroup style={{ marginBottom: '1rem' }}>
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
                </CardGroup>


                <Row>

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
                </Row>

                <Row>
                    <Col lg="4" md="12" sm="12" xs="12">
                        <AnnouncementCard
                            color="gradient-secondary"
                            header="Annonce"
                            avatarSize={60}
                            name="DRH"
                            date="il y a 1 heure"
                            text="Nouvelle politique de télétravail mise en place. Tous les employés peuvent désormais bénéficier de 2 jours de télétravail par semaine."
                            buttonProps={{
                                children: 'voir',
                            }}
                            style={{ height: 500 }}
                        />
                    </Col>

                    <Col lg="4" md="12" sm="12" xs="12">
                        <Card>
                            <CardHeader>
                                <div className="d-flex justify-content-between align-items-center">
                                    <span>Demandes RH</span>
                                    <Button>
                                        <small>Voir Tout</small>
                                    </Button>
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
                </Row>
            </Page>
        );
    }
}

export default DashboardPage;
