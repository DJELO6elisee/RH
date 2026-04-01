import React, { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Badge,
    Button,
    Card,
    CardBody,
    CardHeader,
    Col,
    FormGroup,
    Input,
    Label,
    Pagination,
    PaginationItem,
    PaginationLink,
    Row,
    Spinner,
    Table
} from 'reactstrap';
import { useAuth } from '../../contexts/AuthContext';

const DEFAULT_REMOTE_BASE_URL = 'https://tourisme.2ise-groupe.com';

const sanitizeBaseUrl = (url) => {
    if (!url || typeof url !== 'string') {
        return null;
    }
    return url.trim().replace(/\/+$/, '');
};

const buildApiBaseCandidates = () => {
    const candidates = [];
    const envBase =
        sanitizeBaseUrl(process.env.REACT_APP_API_URL) ||
        sanitizeBaseUrl(process.env.REACT_APP_API_BASE_URL);

    if (envBase) {
        candidates.push(envBase);
    }

    if (typeof window !== 'undefined') {
        const { origin, hostname, protocol } = window.location;

        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            candidates.push(DEFAULT_REMOTE_BASE_URL);
            candidates.push(`${protocol}//localhost:5000`);
        } else {
            candidates.push(sanitizeBaseUrl(origin));
            candidates.push(DEFAULT_REMOTE_BASE_URL);
        }
    }

    if (candidates.length === 0) {
        candidates.push(DEFAULT_REMOTE_BASE_URL);
    }

    return [...new Set(candidates.filter(Boolean))];
};

const fetchJsonWithCandidates = async (path, options = {}) => {
    const candidates = buildApiBaseCandidates();
    const attempts = [];

    for (const base of candidates) {
        const url = `${base}${path}`;
        try {
            const response = await fetch(url, options);
            const text = await response.text();
            let data = null;
            try {
                data = text ? JSON.parse(text) : null;
            } catch (parseError) {
                data = null;
            }

            if (response.ok) {
                return { ok: true, base, data };
            }

            attempts.push({
                base,
                url,
                status: response.status,
                statusText: response.statusText,
                data
            });
        } catch (error) {
            attempts.push({
                base,
                url,
                error
            });
        }
    }

    return { ok: false, attempts };
};

const normalizeStatus = (value) => {
    if (!value) {
        return '';
    }
    const lower = value.toLowerCase();
    if (lower.includes('approuv')) {
        return 'approuve';
    }
    if (lower.includes('rejett') || lower.includes('rejete')) {
        return 'rejete';
    }
    if (lower.includes('attente')) {
        return 'en_attente';
    }
    return lower;
};

const adaptLegacyRow = (row) => {
    const normalizedStatus = normalizeStatus(row.status || row.statut || row.statut_libelle);
    return {
        id: row.id,
        type_demande: row.type_demande,
        status: normalizedStatus || row.status || row.statut,
        niveau_evolution_demande: row.niveau_evolution_demande || row.niveau_libelle,
        phase: row.phase,
        priorite: row.priorite,
        date_creation: row.date_creation,
        date_debut: row.date_debut,
        date_fin: row.date_fin,
        description: row.description,
        prenom: row.prenom || row.agent_prenom,
        nom: row.nom || row.agent_nom,
        matricule: row.matricule,
        service_nom: row.service_nom
    };
};

const computeLegacyAggregations = (rows, filters) => {
    const limit = Math.max(parseInt(filters.limit, 10) || 25, 1);
    const requestedPage = Math.max(parseInt(filters.page, 10) || 1, 1);

    const startDateFilter = filters.start_date ? new Date(filters.start_date) : null;
    const endDateFilter = filters.end_date ? new Date(`${filters.end_date}T23:59:59`) : null;
    const searchTerm = (filters.search || '').trim().toLowerCase();
    const statusList = filters.statut
        ? filters.statut
            .split(',')
            .map((item) => item.trim().toLowerCase())
            .filter(Boolean)
        : [];

    const agentFilter = filters.agent_id ? String(filters.agent_id) : '';

    let filtered = rows || [];

    if (filters.type_demande) {
        filtered = filtered.filter((row) => row.type_demande === filters.type_demande);
    }

    if (agentFilter) {
        filtered = filtered.filter((row) => String(row.id_agent || row.agent_id || row.id_agent_demandeur) === agentFilter);
    }

    if (startDateFilter) {
        filtered = filtered.filter((row) => {
            const date = row.date_creation ? new Date(row.date_creation) : null;
            if (!date || Number.isNaN(date.getTime())) {
                return false;
            }
            return date >= startDateFilter;
        });
    }

    if (endDateFilter) {
        filtered = filtered.filter((row) => {
            const date = row.date_creation ? new Date(row.date_creation) : null;
            if (!date || Number.isNaN(date.getTime())) {
                return false;
            }
            return date <= endDateFilter;
        });
    }

    if (statusList.length > 0) {
        filtered = filtered.filter((row) => {
            const status = normalizeStatus(row.status || row.statut || row.statut_libelle);
            return statusList.includes(status);
        });
    }

    if (searchTerm) {
        filtered = filtered.filter((row) => {
            const fullName = `${row.prenom || row.agent_prenom || ''} ${row.nom || row.agent_nom || ''}`.toLowerCase();
            const matricule = (row.matricule || '').toLowerCase();
            return fullName.includes(searchTerm) || matricule.includes(searchTerm);
        });
    }

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const page = Math.min(requestedPage, totalPages);
    const startIndex = (page - 1) * limit;
    const paginated = filtered.slice(startIndex, startIndex + limit);

    const adaptedDemandes = paginated.map((row) => adaptLegacyRow(row));

    const global = {
        total,
        approuve: 0,
        rejete: 0,
        en_attente: 0
    };

    const typeMap = new Map();
    const periodMap = new Map();

    filtered.forEach((row) => {
        const status = normalizeStatus(row.status || row.statut || row.statut_libelle);
        if (status === 'approuve') {
            global.approuve += 1;
        } else if (status === 'rejete') {
            global.rejete += 1;
        } else if (status === 'en_attente') {
            global.en_attente += 1;
        }

        const typeKey = row.type_demande || 'inconnu';
        typeMap.set(typeKey, (typeMap.get(typeKey) || 0) + 1);

        const creationDate = row.date_creation ? new Date(row.date_creation) : null;
        if (creationDate && !Number.isNaN(creationDate.getTime())) {
            const year = creationDate.getFullYear();
            const month = creationDate.getMonth();
            const periodKey = `${year}-${String(month + 1).padStart(2, '0')}`;

            if (!periodMap.has(periodKey)) {
                const start = new Date(Date.UTC(year, month, 1));
                const end = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999));
                periodMap.set(periodKey, {
                    period_start: start.toISOString(),
                    period_end: end.toISOString(),
                    period_label: periodKey,
                    total: 0,
                    approuve: 0,
                    rejete: 0,
                    en_attente: 0
                });
            }

            const entry = periodMap.get(periodKey);
            entry.total += 1;
            if (status === 'approuve') {
                entry.approuve += 1;
            } else if (status === 'rejete') {
                entry.rejete += 1;
            } else if (status === 'en_attente') {
                entry.en_attente += 1;
            }
        }
    });

    const typeSummary = Array.from(typeMap.entries())
        .map(([type_demande, totalCount]) => ({
            type_demande,
            total: totalCount
        }))
        .sort((a, b) => a.type_demande.localeCompare(b.type_demande, 'fr'));

    const periodSummary = Array.from(periodMap.values()).sort(
        (a, b) => new Date(b.period_start).getTime() - new Date(a.period_start).getTime()
    );

    return {
        demandes: adaptedDemandes,
        pagination: {
            total,
            total_pages: totalPages,
            page,
            limit
        },
        resume: {
            global,
            par_type: typeSummary,
            par_periode: periodSummary,
            group_by: 'month'
        }
    };
};

const typeLabels = {
    absence: 'Demande d\'Absence',
    sortie_territoire: 'Sortie du Territoire',
    attestation_travail: 'Attestation de Travail',
    attestation_presence: 'Attestation de Présence',
    note_service: 'Note de Service',
    certificat_cessation: 'Certificat de Cessation',
    autorisation_conges: 'Autorisation de Congé',
    autorisation_retraite: 'Autorisation de Retraite',
    conge: 'Congé',
    formation: 'Formation',
    mission: 'Mission'
};

const statusConfig = {
    approuve: { color: 'success', label: 'Approuvée' },
    rejete: { color: 'danger', label: 'Rejetée' },
    en_attente: { color: 'warning', label: 'En attente', textColor: '#000' }
};

const resumeCards = [
    { key: 'total', label: 'Total', color: 'primary' },
    { key: 'approuve', label: 'Approuvées', color: 'success' },
    { key: 'rejete', label: 'Rejetées', color: 'danger' },
    { key: 'en_attente', label: 'En attente', color: 'warning', textColor: '#000' }
];

const statusOptions = [
    { value: 'approuve', label: 'Approuvées' },
    { value: 'rejete', label: 'Rejetées' },
    { value: 'en_attente', label: 'En attente' }
];

const typeOptions = [
    { value: '', label: 'Tous les types' },
    { value: 'absence', label: 'Demande d\'Absence' },
    { value: 'sortie_territoire', label: 'Sortie du Territoire' },
    { value: 'attestation_travail', label: 'Attestation de Travail' },
    { value: 'attestation_presence', label: 'Attestation de Présence' },
    { value: 'note_service', label: 'Note de Service' },
    { value: 'certificat_cessation', label: 'Certificat de Cessation' },
    { value: 'autorisation_conges', label: 'Autorisation de Congé' },
    { value: 'autorisation_retraite', label: 'Autorisation de Retraite' },
    { value: 'conge', label: 'Congé' },
    { value: 'formation', label: 'Formation' },
    { value: 'mission', label: 'Mission' }
];

const groupByOptions = [
    { value: 'month', label: 'Par mois' },
    { value: 'semester', label: 'Par semestre' },
    { value: 'year', label: 'Par année' }
];

const formatDate = (value) => {
    if (!value) {
        return '—';
    }
    return new Date(value).toLocaleDateString('fr-FR');
};

const formatDateTime = (value) => {
    if (!value) {
        return '—';
    }
    return new Date(value).toLocaleString('fr-FR');
};

const getTypeLabel = (value) => typeLabels[value] || value || '—';

const DemandesHistoriqueGlobal = () => {
    const { user } = useAuth();
    const [filters, setFilters] = useState({
        page: 1,
        limit: 25,
        start_date: '',
        end_date: '',
        type_demande: '',
        statut: 'approuve,rejete',
        agent_id: '',
        group_by: 'month',
        search: ''
    });
    const [statusSelection, setStatusSelection] = useState(['approuve', 'rejete']);
    const [demandes, setDemandes] = useState([]);
    const [agents, setAgents] = useState([]);
    const [resume, setResume] = useState(null);
    const [pagination, setPagination] = useState({ total: 0, total_pages: 0, page: 1, limit: 25 });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [legacyMode, setLegacyMode] = useState(false);
    const [legacySource, setLegacySource] = useState([]);
    const [compatibilityInfo, setCompatibilityInfo] = useState('');

    const updateFilters = (changes, resetPage = true) => {
        setFilters((prev) => ({
            ...prev,
            ...changes,
            page: resetPage ? 1 : (changes.page ?? prev.page)
        }));
    };

    const resetFilters = () => {
        setStatusSelection(['approuve', 'rejete']);
        setFilters({
            page: 1,
            limit: 25,
            start_date: '',
            end_date: '',
            type_demande: '',
            statut: 'approuve,rejete',
            agent_id: '',
            group_by: 'month',
            search: ''
        });
    };

    const toggleStatus = (value) => {
        let updated = [...statusSelection];
        if (updated.includes(value)) {
            updated = updated.filter((item) => item !== value);
        } else {
            updated.push(value);
        }
        setStatusSelection(updated);
        updateFilters({ statut: updated.length ? updated.join(',') : '' });
    };

    useEffect(() => {
        if (!user?.id_agent) {
            return;
        }

        let isMounted = true;
        const loadAgents = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    return;
                }
                const result = await fetchJsonWithCandidates(`/api/demandes/agents/${user.id_agent}`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                if (isMounted && result.ok && result.data?.success) {
                    setAgents(result.data.data || []);
                }
            } catch (err) {
                console.error('Erreur lors du chargement des agents:', err);
            }
        };

        loadAgents();
        return () => {
            isMounted = false;
        };
    }, [user?.id_agent]);

    useEffect(() => {
        if (!user?.id_agent) {
            return;
        }

        if (legacyMode) {
            const aggregations = computeLegacyAggregations(legacySource, filters);
            setDemandes(aggregations.demandes);
            setPagination(aggregations.pagination);
            setResume(aggregations.resume);
            setError(null);
            setLoading(false);
            return;
        }

        let isMounted = true;

        const loadDemandes = async () => {
            setLoading(true);
            setError(null);

            const token = localStorage.getItem('token');
            if (!token) {
                setLoading(false);
                setError('Vous devez être authentifié pour consulter les autorisations.');
                return;
            }

            const params = new URLSearchParams();
            Object.entries(filters).forEach(([key, value]) => {
                if (value !== null && value !== undefined && value !== '') {
                    params.append(key, value);
                }
            });

            const requestOptions = {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            };

            const globalResult = await fetchJsonWithCandidates(`/api/demandes/historiques-global?${params.toString()}`, requestOptions);

            if (isMounted && globalResult.ok && globalResult.data?.success) {
                setLegacyMode(false);
                setCompatibilityInfo('');
                setDemandes(globalResult.data.data || []);
                setResume(globalResult.data.resume || null);
                setPagination(
                    globalResult.data.pagination || {
                        total: 0,
                        total_pages: 0,
                        page: 1,
                        limit: filters.limit
                    }
                );
                setLoading(false);
                return;
            }

            if (!isMounted) {
                return;
            }

            if (user?.id_agent) {
                const legacyParams = new URLSearchParams();
                if (filters.type_demande) {
                    legacyParams.append('type_demande', filters.type_demande);
                }

                const legacyQueryString = legacyParams.toString();
                const legacyPath = legacyQueryString
                    ? `/api/demandes/historique/${user.id_agent}?${legacyQueryString}`
                    : `/api/demandes/historique/${user.id_agent}`;

                const legacyResult = await fetchJsonWithCandidates(legacyPath, requestOptions);

                if (legacyResult.ok && legacyResult.data?.success) {
                    const source = legacyResult.data.data || [];
                    setLegacySource(source);
                    setLegacyMode(true);
                    setCompatibilityInfo(
                        'Mode compatibilité activé : le serveur ne supporte pas encore le regroupement global. Les filtres sont appliqués côté client.'
                    );
                    const aggregations = computeLegacyAggregations(source, filters);
                    setDemandes(aggregations.demandes);
                    setPagination(aggregations.pagination);
                    setResume(aggregations.resume);
                    setLoading(false);
                    return;
                }
            }

            setLegacyMode(false);
            setLoading(false);
            setCompatibilityInfo('');

            const lastAttempt = (globalResult.attempts && globalResult.attempts[globalResult.attempts.length - 1]) || {};
            const detailMessage =
                lastAttempt?.data?.details ||
                lastAttempt?.data?.error ||
                (lastAttempt?.status ? `HTTP ${lastAttempt.status}` : null) ||
                'Impossible de récupérer les données.';
            setError(detailMessage);
        };

        loadDemandes();

        return () => {
            isMounted = false;
        };
    }, [filters, legacyMode, legacySource, user?.id_agent]);

    const statusSummary = useMemo(() => resume?.global || {
        total: 0,
        approuve: 0,
        rejete: 0,
        en_attente: 0
    }, [resume]);

    const typeSummary = useMemo(() => resume?.par_type || [], [resume]);
    const periodSummary = useMemo(() => resume?.par_periode || [], [resume]);

    const handlePageChange = (page) => {
        if (page < 1 || page > (pagination.total_pages || 1)) {
            return;
        }
        updateFilters({ page }, false);
    };

    return (
        <>
            <Card className="mb-3">
                <CardHeader>
                    <h5 className="mb-0">Filtres</h5>
                </CardHeader>
                <CardBody>
                    <Row className="g-3">
                        <Col md="3">
                            <FormGroup>
                                <Label>Type de demande</Label>
                                <Input
                                    type="select"
                                    value={filters.type_demande}
                                    onChange={(e) => updateFilters({ type_demande: e.target.value })}
                                >
                                    {typeOptions.map((option) => (
                                        <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                </Input>
                            </FormGroup>
                        </Col>
                        <Col md="3">
                            <FormGroup>
                                <Label>Agent concerné</Label>
                                <Input
                                    type="select"
                                    value={filters.agent_id}
                                    onChange={(e) => updateFilters({ agent_id: e.target.value })}
                                >
                                    <option value="">Tous les agents</option>
                                    {agents.map((agent) => (
                                        <option key={agent.id} value={agent.id}>
                                            {`${agent.prenom || ''} ${agent.nom || ''}`.trim()} {agent.matricule ? `- ${agent.matricule}` : ''}
                                        </option>
                                    ))}
                                </Input>
                            </FormGroup>
                        </Col>
                        <Col md="3">
                            <FormGroup>
                                <Label>Date de début</Label>
                                <Input
                                    type="date"
                                    value={filters.start_date}
                                    onChange={(e) => updateFilters({ start_date: e.target.value })}
                                />
                            </FormGroup>
                        </Col>
                        <Col md="3">
                            <FormGroup>
                                <Label>Date de fin</Label>
                                <Input
                                    type="date"
                                    value={filters.end_date}
                                    onChange={(e) => updateFilters({ end_date: e.target.value })}
                                />
                            </FormGroup>
                        </Col>
                    </Row>
                    <Row className="g-3">
                        <Col md="4">
                            <FormGroup>
                                <Label>Recherche (nom ou matricule)</Label>
                                <Input
                                    type="text"
                                    value={filters.search}
                                    placeholder="Rechercher un agent..."
                                    onChange={(e) => updateFilters({ search: e.target.value })}
                                />
                            </FormGroup>
                        </Col>
                        <Col md="4">
                            <FormGroup>
                                <Label>Regrouper par</Label>
                                <Input
                                    type="select"
                                    value={filters.group_by}
                                    onChange={(e) => updateFilters({ group_by: e.target.value }, false)}
                                >
                                    {groupByOptions.map((option) => (
                                        <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                </Input>
                            </FormGroup>
                        </Col>
                        <Col md="2">
                            <FormGroup>
                                <Label>Éléments par page</Label>
                                <Input
                                    type="select"
                                    value={filters.limit}
                                    onChange={(e) => updateFilters({ limit: parseInt(e.target.value, 10) || 25 })}
                                >
                                    {[10, 25, 50, 100].map((value) => (
                                        <option key={value} value={value}>{value}</option>
                                    ))}
                                </Input>
                            </FormGroup>
                        </Col>
                        <Col md="2" className="d-flex align-items-end">
                            <Button color="secondary" onClick={resetFilters} className="w-100">
                                Réinitialiser
                            </Button>
                        </Col>
                    </Row>
                    <Row className="g-2">
                        <Col md="12">
                            <Label className="mb-2">Statuts à inclure</Label>
                        </Col>
                        {statusOptions.map((option) => (
                            <Col md="3" key={option.value}>
                                <FormGroup check className="mb-0">
                                    <Label check>
                                        <Input
                                            type="checkbox"
                                            checked={statusSelection.includes(option.value)}
                                            onChange={() => toggleStatus(option.value)}
                                        />{' '}
                                        {option.label}
                                    </Label>
                                </FormGroup>
                            </Col>
                        ))}
                    </Row>
                </CardBody>
            </Card>

            {error && (
                <Alert color="danger">
                    <strong>Erreur :</strong> {error}
                </Alert>
            )}

            {compatibilityInfo && !error && (
                <Alert color="info">
                    {compatibilityInfo}
                </Alert>
            )}

            <Row className="g-3">
                {resumeCards.map((card) => (
                    <Col lg="3" md="6" key={card.key}>
                        <Card className="h-100">
                            <CardBody className="text-center">
                                <h6>{card.label}</h6>
                                <h2 className={`text-${card.color}`} style={{ color: card.textColor }}>
                                    {statusSummary[card.key] ?? 0}
                                </h2>
                            </CardBody>
                        </Card>
                    </Col>
                ))}
            </Row>

            <Row className="g-3 mt-1">
                <Col lg="6" md="12">
                    <Card className="h-100">
                        <CardHeader>
                            <h6 className="mb-0">Répartition par type</h6>
                        </CardHeader>
                        <CardBody className="p-0">
                            <Table responsive striped hover className="mb-0">
                                <thead>
                                    <tr>
                                        <th>Type</th>
                                        <th className="text-end">Nombre</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {typeSummary.length === 0 ? (
                                        <tr>
                                            <td colSpan="2" className="text-center text-muted py-3">
                                                Aucune donnée disponible
                                            </td>
                                        </tr>
                                    ) : (
                                        typeSummary.map((item) => (
                                            <tr key={item.type_demande || 'unknown'}>
                                                <td>{getTypeLabel(item.type_demande)}</td>
                                                <td className="text-end fw-bold">{item.total}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </Table>
                        </CardBody>
                    </Card>
                </Col>
                <Col lg="6" md="12">
                    <Card className="h-100">
                        <CardHeader>
                            <h6 className="mb-0">Répartition par période</h6>
                        </CardHeader>
                        <CardBody className="p-0">
                            <Table responsive striped hover className="mb-0">
                                <thead>
                                    <tr>
                                        <th>Période</th>
                                        <th className="text-end">Total</th>
                                        <th className="text-end">Approuvées</th>
                                        <th className="text-end">Rejetées</th>
                                        <th className="text-end">En attente</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {periodSummary.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="text-center text-muted py-3">
                                                Aucune donnée pour la période sélectionnée
                                            </td>
                                        </tr>
                                    ) : (
                                        periodSummary.map((item, index) => (
                                            <tr key={`${item.period_label}-${index}`}>
                                                <td>
                                                    <div>{item.period_label}</div>
                                                    <div className="text-muted small">
                                                        {formatDate(item.period_start)} – {formatDate(item.period_end)}
                                                    </div>
                                                </td>
                                                <td className="text-end fw-bold">{item.total}</td>
                                                <td className="text-end text-success">{item.approuve}</td>
                                                <td className="text-end text-danger">{item.rejete}</td>
                                                <td className="text-end text-warning" style={{ color: '#000' }}>{item.en_attente}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </Table>
                        </CardBody>
                    </Card>
                </Col>
            </Row>

            <Card className="mt-3">
                <CardHeader>
                    <h5 className="mb-0">Historique complet des autorisations</h5>
                </CardHeader>
                <CardBody className="p-0">
                    {loading ? (
                        <div className="text-center py-5">
                            <Spinner color="primary" />
                            <div className="mt-2">Chargement des autorisations...</div>
                        </div>
                    ) : (
                        <div className="table-responsive">
                            <Table hover className="mb-0">
                                <thead>
                                    <tr>
                                        <th>Agent</th>
                                        <th>Type</th>
                                        <th>Statut</th>
                                        <th>Période demandée</th>
                                        <th>Création</th>
                                        <th>Priorité</th>
                                        <th>Phase</th>
                                        <th>Niveau</th>
                                        <th>Description</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {demandes.length === 0 ? (
                                        <tr>
                                            <td colSpan="9" className="text-center text-muted py-4">
                                                Aucune demande pour les filtres sélectionnés
                                            </td>
                                        </tr>
                                    ) : (
                                        demandes.map((demande) => {
                                            const status = statusConfig[demande.status] || { color: 'secondary', label: demande.status || '—' };
                                            return (
                                                <tr key={demande.id}>
                                                    <td>
                                                        <div className="fw-bold">
                                                            {`${demande.prenom || ''} ${demande.nom || ''}`.trim() || '—'}
                                                        </div>
                                                        <div className="text-muted small">
                                                            {demande.matricule || 'Matricule inconnu'}
                                                        </div>
                                                        {demande.service_nom && (
                                                            <div className="text-muted small">{demande.service_nom}</div>
                                                        )}
                                                    </td>
                                                    <td>{getTypeLabel(demande.type_demande)}</td>
                                                    <td>
                                                        <Badge color={status.color} style={{ color: status.textColor || '#fff' }}>
                                                            {status.label}
                                                        </Badge>
                                                    </td>
                                                    <td>
                                                        {demande.date_debut || demande.date_fin ? (
                                                            <>
                                                                <div>{formatDate(demande.date_debut)}</div>
                                                                <div className="text-muted small">au {formatDate(demande.date_fin)}</div>
                                                            </>
                                                        ) : (
                                                            <span className="text-muted">Non renseignée</span>
                                                        )}
                                                    </td>
                                                    <td>
                                                        <div>{formatDateTime(demande.date_creation)}</div>
                                                    </td>
                                                    <td>
                                                        <Badge color={demande.priorite === 'critique' ? 'danger' : demande.priorite === 'urgente' ? 'warning' : 'secondary'} style={{ color: demande.priorite === 'critique' ? '#fff' : '#000' }}>
                                                            {demande.priorite || 'Normale'}
                                                        </Badge>
                                                    </td>
                                                    <td>{demande.phase || '—'}</td>
                                                    <td>{demande.niveau_evolution_demande || '—'}</td>
                                                    <td style={{ maxWidth: 220 }}>
                                                        <div className="text-truncate">
                                                            {demande.description || <span className="text-muted">Aucune description</span>}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </Table>
                        </div>
                    )}
                </CardBody>
            </Card>

            {pagination.total_pages > 1 && (
                <div className="d-flex justify-content-between align-items-center mt-3">
                    <div className="text-muted">
                        Page {pagination.page} / {pagination.total_pages} • {pagination.total} autorisations
                    </div>
                    <Pagination>
                        <PaginationItem disabled={pagination.page <= 1}>
                            <PaginationLink previous onClick={() => handlePageChange(pagination.page - 1)} />
                        </PaginationItem>
                        {Array.from({ length: pagination.total_pages }, (_, index) => index + 1).map((pageNumber) => (
                            <PaginationItem key={pageNumber} active={pageNumber === pagination.page}>
                                <PaginationLink onClick={() => handlePageChange(pageNumber)}>
                                    {pageNumber}
                                </PaginationLink>
                            </PaginationItem>
                        ))}
                        <PaginationItem disabled={pagination.page >= pagination.total_pages}>
                            <PaginationLink next onClick={() => handlePageChange(pagination.page + 1)} />
                        </PaginationItem>
                    </Pagination>
                </div>
            )}
        </>
    );
};

export default DemandesHistoriqueGlobal;


