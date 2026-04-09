import React, { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Button,
    Card,
    CardBody,
    CardHeader,
    CardTitle,
    Col,
    Input,
    Row,
    Spinner,
    Table
} from 'reactstrap';
import { MdPersonPin, MdRefresh, MdSearch } from 'react-icons/md';
import Page from '../components/Page';
import { useAuth } from '../contexts/AuthContext';
import { getApiUrl, getAuthHeaders } from '../config/api';

const normalizeText = (value) => String(value || '')
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

const AgentsPositionsPage = () => {
    const { user } = useAuth();
    const [agents, setAgents] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [selectedDirectionGenerale, setSelectedDirectionGenerale] = useState('');
    const [selectedDirection, setSelectedDirection] = useState('');
    const [selectedSousDirection, setSelectedSousDirection] = useState('');
    const [selectedService, setSelectedService] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(20);

    const loadAgents = async() => {
        setLoading(true);
        setError('');

        try {
            const queryParams = new URLSearchParams();
            queryParams.append('limit', '1000');

            // Filtrer automatiquement par ministère pour les comptes rattachés à un ministère.
            if (user?.organization?.type === 'ministere' && user?.organization?.id) {
                queryParams.append('id_ministere', String(user.organization.id));
            }

            const response = await fetch(`${getApiUrl()}/api/agents?${queryParams.toString()}`, {
                headers: getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const result = await response.json();
            const list = Array.isArray(result?.data)
                ? result.data
                : Array.isArray(result)
                    ? result
                    : [];

            setAgents(list);
        } catch (err) {
            console.error('Erreur chargement positions agents:', err);
            setError('Impossible de charger les positions des agents.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAgents();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const directionGeneraleOptions = useMemo(() => {
        return [...new Set(agents.map((a) => a.direction_generale_libelle).filter(Boolean))]
            .sort((a, b) => String(a).localeCompare(String(b), 'fr', { sensitivity: 'base' }));
    }, [agents]);

    const directionOptions = useMemo(() => {
        return [...new Set(
            agents
                .filter((a) => !selectedDirectionGenerale || normalizeText(a.direction_generale_libelle).includes(normalizeText(selectedDirectionGenerale)))
                .map((a) => a.direction_libelle)
                .filter(Boolean)
        )].sort((a, b) => String(a).localeCompare(String(b), 'fr', { sensitivity: 'base' }));
    }, [agents, selectedDirectionGenerale]);

    const sousDirectionOptions = useMemo(() => {
        return [...new Set(
            agents
                .filter((a) => !selectedDirectionGenerale || normalizeText(a.direction_generale_libelle).includes(normalizeText(selectedDirectionGenerale)))
                .filter((a) => !selectedDirection || normalizeText(a.direction_libelle).includes(normalizeText(selectedDirection)))
                .map((a) => a.sous_direction_libelle)
                .filter(Boolean)
        )].sort((a, b) => String(a).localeCompare(String(b), 'fr', { sensitivity: 'base' }));
    }, [agents, selectedDirectionGenerale, selectedDirection]);

    const serviceOptions = useMemo(() => {
        return [...new Set(
            agents
                .filter((a) => !selectedDirectionGenerale || normalizeText(a.direction_generale_libelle).includes(normalizeText(selectedDirectionGenerale)))
                .filter((a) => !selectedDirection || normalizeText(a.direction_libelle).includes(normalizeText(selectedDirection)))
                .filter((a) => !selectedSousDirection || normalizeText(a.sous_direction_libelle).includes(normalizeText(selectedSousDirection)))
                .map((a) => a.service_libelle)
                .filter(Boolean)
        )].sort((a, b) => String(a).localeCompare(String(b), 'fr', { sensitivity: 'base' }));
    }, [agents, selectedDirectionGenerale, selectedDirection, selectedSousDirection]);

    const filteredAgents = useMemo(() => {
        const query = searchTerm.trim().toLowerCase();
        return agents.filter((agent) => {
            const matchesStructure =
                (!selectedDirectionGenerale || normalizeText(agent.direction_generale_libelle).includes(normalizeText(selectedDirectionGenerale))) &&
                (!selectedDirection || normalizeText(agent.direction_libelle).includes(normalizeText(selectedDirection))) &&
                (!selectedSousDirection || normalizeText(agent.sous_direction_libelle).includes(normalizeText(selectedSousDirection))) &&
                (!selectedService || normalizeText(agent.service_libelle).includes(normalizeText(selectedService)));

            if (!matchesStructure) {
                return false;
            }

            if (!query) {
                return true;
            }

            const fullName = `${agent.nom || ''} ${agent.prenom || ''}`.toLowerCase();
            const emploiEtFonction = `${agent.emploi_actuel_libele || ''} ${agent.fonction_actuelle_libele || ''}`.toLowerCase();
            const structureText = `${agent.direction_generale_libelle || ''} ${agent.direction_libelle || ''} ${agent.sous_direction_libelle || ''} ${agent.service_libelle || ''}`.toLowerCase();
            return (
                fullName.includes(query) ||
                String(agent.matricule || '').toLowerCase().includes(query) ||
                String(agent.position_libele || '').toLowerCase().includes(query) ||
                emploiEtFonction.includes(query) ||
                structureText.includes(query)
            );
        });
    }, [agents, searchTerm, selectedDirectionGenerale, selectedDirection, selectedSousDirection, selectedService]);

    const sortedFilteredAgents = useMemo(() => {
        return [...filteredAgents].sort((a, b) => {
            const aFull = `${a.nom || ''} ${a.prenom || ''}`.trim();
            const bFull = `${b.nom || ''} ${b.prenom || ''}`.trim();
            const byName = aFull.localeCompare(bFull, 'fr', { sensitivity: 'base' });
            if (byName !== 0) return byName;
            return String(a.matricule || '').localeCompare(String(b.matricule || ''), 'fr', { sensitivity: 'base' });
        });
    }, [filteredAgents]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, rowsPerPage, agents.length, selectedDirectionGenerale, selectedDirection, selectedSousDirection, selectedService]);

    const totalPages = Math.max(1, Math.ceil(sortedFilteredAgents.length / rowsPerPage));
    const pageStart = (currentPage - 1) * rowsPerPage;
    const paginatedAgents = sortedFilteredAgents.slice(pageStart, pageStart + rowsPerPage);

    return (
        <Page
            className="AgentsPositionsPage"
            title="Positions actuelles des agents"
            breadcrumbs={[{ name: 'Gestion du Personnel', active: true }]}
        >
            <Row>
                <Col lg={12}>
                    <Card>
                        <CardHeader className="d-flex justify-content-between align-items-center">
                            <CardTitle tag="h5" className="mb-0">
                                <MdPersonPin className="mr-2" />
                                Consultation des positions
                            </CardTitle>
                            <Button color="success" onClick={loadAgents} disabled={loading}>
                                <MdRefresh className="mr-1" />
                                Actualiser
                            </Button>
                        </CardHeader>
                        <CardBody>
                            <Row className="mb-3">
                                <Col md={6}>
                                    <div className="d-flex align-items-center">
                                        <MdSearch className="mr-2 text-muted" />
                                        <Input
                                            type="text"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            placeholder="Rechercher par nom, matricule, position, emploi, fonction..."
                                        />
                                    </div>
                                </Col>
                                <Col md={6} className="text-md-right mt-2 mt-md-0">
                                    <strong>{sortedFilteredAgents.length}</strong> agent(s) trouve(s)
                                </Col>
                            </Row>

                            <Row className="mb-3">
                                <Col md={3}>
                                    <Input
                                        type="text"
                                        value={selectedDirectionGenerale}
                                        onChange={(e) => setSelectedDirectionGenerale(e.target.value)}
                                        placeholder="Direction générale..."
                                        list="dg-list"
                                    >
                                    </Input>
                                    <datalist id="dg-list">
                                        {directionGeneraleOptions.map((item) => (
                                            <option key={item} value={item} />
                                        ))}
                                    </datalist>
                                </Col>
                                <Col md={3}>
                                    <Input
                                        type="text"
                                        value={selectedDirection}
                                        onChange={(e) => setSelectedDirection(e.target.value)}
                                        placeholder="Direction..."
                                        list="dir-list"
                                    >
                                    </Input>
                                    <datalist id="dir-list">
                                        {directionOptions.map((item) => (
                                            <option key={item} value={item} />
                                        ))}
                                    </datalist>
                                </Col>
                                <Col md={3}>
                                    <Input
                                        type="text"
                                        value={selectedSousDirection}
                                        onChange={(e) => setSelectedSousDirection(e.target.value)}
                                        placeholder="Sous-direction..."
                                        list="sd-list"
                                    >
                                    </Input>
                                    <datalist id="sd-list">
                                        {sousDirectionOptions.map((item) => (
                                            <option key={item} value={item} />
                                        ))}
                                    </datalist>
                                </Col>
                                <Col md={3}>
                                    <Input
                                        type="text"
                                        value={selectedService}
                                        onChange={(e) => setSelectedService(e.target.value)}
                                        placeholder="Service..."
                                        list="srv-list"
                                    >
                                    </Input>
                                    <datalist id="srv-list">
                                        {serviceOptions.map((item) => (
                                            <option key={item} value={item} />
                                        ))}
                                    </datalist>
                                </Col>
                            </Row>

                            <Row className="mb-3">
                                <Col md={3}>
                                    <Input
                                        type="select"
                                        value={rowsPerPage}
                                        onChange={(e) => setRowsPerPage(parseInt(e.target.value, 10))}
                                    >
                                        <option value={10}>10 lignes</option>
                                        <option value={20}>20 lignes</option>
                                        <option value={50}>50 lignes</option>
                                        <option value={100}>100 lignes</option>
                                    </Input>
                                </Col>
                                <Col md={9} className="text-md-right text-muted mt-2 mt-md-0">
                                    Page {currentPage} / {totalPages}
                                </Col>
                            </Row>

                            {error && <Alert color="danger">{error}</Alert>}

                            {loading ? (
                                <div className="text-center py-4">
                                    <Spinner color="success" />
                                </div>
                            ) : (
                                <div className="table-responsive">
                                    <Table hover bordered>
                                        <thead>
                                            <tr>
                                                <th>Matricule</th>
                                                <th>Nom et prénoms</th>
                                                <th>Emploi actuel</th>
                                                <th>Fonction actuelle</th>
                                                <th>Position actuelle</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {paginatedAgents.length > 0 ? (
                                                paginatedAgents.map((agent) => (
                                                    <tr key={agent.id}>
                                                        <td>{agent.matricule || '-'}</td>
                                                        <td>{`${agent.nom || ''} ${agent.prenom || ''}`.trim() || '-'}</td>
                                                        <td>{agent.emploi_actuel_libele || '-'}</td>
                                                        <td>{agent.fonction_actuelle_libele || '-'}</td>
                                                        <td>
                                                            <span className="font-weight-bold text-success">
                                                                {agent.position_libele || 'Non definie'}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="5" className="text-center text-muted py-4">
                                                        Aucune donnee disponible.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </Table>
                                </div>
                            )}

                            {sortedFilteredAgents.length > 0 && totalPages > 1 && (
                                <div className="d-flex justify-content-end mt-3 align-items-center" style={{ gap: 8 }}>
                                    <Button
                                        size="sm"
                                        color="secondary"
                                        disabled={currentPage === 1}
                                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                    >
                                        Précédent
                                    </Button>

                                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                                        .slice(Math.max(0, currentPage - 3), Math.min(totalPages, currentPage + 2))
                                        .map((page) => (
                                            <Button
                                                key={page}
                                                size="sm"
                                                color={page === currentPage ? 'success' : 'light'}
                                                onClick={() => setCurrentPage(page)}
                                            >
                                                {page}
                                            </Button>
                                        ))}

                                    <Button
                                        size="sm"
                                        color="secondary"
                                        disabled={currentPage === totalPages}
                                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                    >
                                        Suivant
                                    </Button>
                                </div>
                            )}
                        </CardBody>
                    </Card>
                </Col>
            </Row>
        </Page>
    );
};

export default AgentsPositionsPage;
