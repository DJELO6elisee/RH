import React, { useEffect, useState } from 'react';
import {
    Card,
    CardHeader,
    CardBody,
    CardTitle,
    Table,
    Badge,
    Button,
    Alert,
    Spinner,
    Progress,
    Pagination,
    PaginationItem,
    PaginationLink,
    Input,
    Row,
    Col
} from 'reactstrap';

const typeConfig = {
    absence: { color: 'primary', label: 'Absence' },
    sortie_territoire: { color: 'info', label: 'Sortie territoire' },
    attestation_travail: { color: 'success', label: 'Attestation travail' },
    attestation_presence: { color: 'secondary', label: 'Attestation présence' },
    certificat_cessation: { color: 'danger', label: 'Certificat cessation' },
    certificat_reprise_service: { color: 'dark', label: 'Reprise de service' },
    autorisation_conges: { color: 'warning', label: 'Autorisation congé' },
    autorisation_retraite: { color: 'secondary', label: 'Autorisation retraite' }
};

const prioriteConfig = {
    normale: { color: 'secondary', label: 'Normale' },
    urgente: { color: 'warning', label: 'Urgente', textColor: '#000' },
    critique: { color: 'danger', label: 'Exceptionnelle' }
};

const statusConfig = {
    en_attente: { color: 'warning', label: 'En attente', textColor: '#000' },
    en_cours: { color: 'info', label: 'En cours' },
    approuve: { color: 'success', label: 'Approuvée' },
    rejete: { color: 'danger', label: 'Rejetée' },
    finalise: { color: 'success', label: 'Finalisée' }
};

const phaseConfig = {
    aller: { color: 'info', label: 'Aller' },
    retour: { color: 'warning', label: 'Retour', textColor: '#000' }
};

const niveauConfig = {
    soumis: { color: 'secondary', label: 'Soumis' },
    en_cours_traitement: { color: 'primary', label: 'En cours' },
    valide_par_superieur: { color: 'warning', label: 'En attente supérieur' },
    valide_par_sous_directeur: { color: 'warning', label: 'En attente sous-directeur' },
    valide_par_directeur: { color: 'warning', label: 'En attente directeur' },
    valide_par_drh: { color: 'warning', label: 'En attente DRH' },
    valide_par_direction: { color: 'warning', label: 'En attente direction' },
    valide_par_dir_cabinet: { color: 'warning', label: 'En attente Dir Cabinet' },
    valide_par_chef_cabinet: { color: 'warning', label: 'En attente Chef Cabinet' },
    valide_par_directeur_central: { color: 'warning', label: 'En attente Dir Central' },
    valide_par_directeur_general: { color: 'warning', label: 'En attente Dir Général' },
    valide_par_ministre: { color: 'warning', label: 'En attente ministre' },
    valide_par_directeur_service_exterieur: { color: 'warning', label: 'En attente Dir. service ext.' },
    retour_drh: { color: 'info', label: 'Retour DRH' },
    retour_dir_cabinet: { color: 'info', label: 'Retour Dir Cabinet' },
    retour_chef_service: { color: 'info', label: 'Retour chef service' },
    retour_ministre: { color: 'info', label: 'Retour ministre' },
    finalise: { color: 'success', label: 'Finalisé' }
};

const progressionAller = {
    soumis: 10,
    valide_par_superieur: 25,
    valide_par_sous_directeur: 30,
    valide_par_directeur: 45,
    // Étape spécifique pour le directeur des services extérieurs
    valide_par_directeur_service_exterieur: 50,
    valide_par_drh: 60,
    valide_par_dir_cabinet: 70,
    valide_par_chef_cabinet: 75,
    valide_par_directeur_central: 80,
    valide_par_directeur_general: 85,
    valide_par_ministre: 90,
    finalise: 100
};

const progressionRetour = {
    retour_dir_cabinet: 65,
    retour_drh: 75,
    retour_chef_service: 85,
    retour_ministre: 90,
    finalise: 100
};

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
            // Sur un poste local : tenter d'abord la prod, puis le backend local.
            candidates.push(DEFAULT_REMOTE_BASE_URL);
            candidates.push(`${protocol}//localhost:5000`);
        } else {
            // En production, garder l'origine d'abord puis la prod par défaut (au cas où).
            candidates.push(sanitizeBaseUrl(origin));
            candidates.push(DEFAULT_REMOTE_BASE_URL);
        }
    }

    // Ajout ultime si rien configuré
    if (candidates.length === 0) {
        candidates.push(DEFAULT_REMOTE_BASE_URL);
    }

    // Nettoyage des entrées invalides et déduplication
    return [...new Set(candidates.filter(Boolean))];
};

const fetchWithBaseFallback = async (path, options = {}) => {
    const candidates = buildApiBaseCandidates();
    let lastError = null;

    for (const base of candidates) {
        try {
            const response = await fetch(`${base}${path}`, options);

            if (!response.ok) {
                lastError = new Error(`HTTP ${response.status} ${response.statusText}`);
                continue;
            }

            return response;
        } catch (error) {
            lastError = error;
            // Continuer seulement pour les erreurs réseau (TypeError)
            if (!(error instanceof TypeError)) {
                break;
            }
        }
    }

    throw lastError || new Error('Impossible de contacter l’API');
};

const sanitizeKey = (value, fallback = '') => {
    if (typeof value !== 'string') {
        return fallback;
    }
    return value.trim().toLowerCase();
};

const clampProgress = (value) => {
    if (value === null || value === undefined) {
        return null;
    }

    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
        return null;
    }

    return Math.max(0, Math.min(100, Math.round(parsed)));
};

const buildLocalDateFromDbDate = (dateValue) => {
    if (!dateValue) return null;
    const raw = String(dateValue).trim();
    if (!raw) return null;

    // Si c'est une date pure (sans heure), on garde la date brute.
    const dateOnlyMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateOnlyMatch) {
        const [, year, month, day] = dateOnlyMatch;
        return new Date(Number(year), Number(month) - 1, Number(day));
    }

    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatDate = (dateString, withTime = true) => {
    const date = buildLocalDateFromDbDate(dateString);
    if (!date) return 'N/A';
    if (withTime) {
        return date.toLocaleString('fr-FR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    return date.toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
};

const renderBadge = (value, config, fallback, forceDark = false) => {
    if (!value) {
        return (
            <Badge color="secondary" style={forceDark ? { color: '#000', fontWeight: 'bold' } : undefined}>
                {fallback}
            </Badge>
        );
    }

    const data = config[value] || { color: 'secondary', label: value };
    const styleBase = data.textColor ? { color: data.textColor } : {};
    const style = {
        ...styleBase,
        ...(forceDark ? { color: '#000' } : {}),
        fontWeight: 'bold',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: '120px',
        textAlign: 'center',
        lineHeight: 1.2,
        verticalAlign: 'middle'
    };
    return <Badge color={data.color} style={style}>{data.label}</Badge>;
};

const getProgressValue = (phase, niveau, niveauActuel) => {
    const map = phase === 'retour' ? progressionRetour : progressionAller;
    // On se base d'abord sur le niveau logique (valide_par_*)
    if (niveau && map[niveau] !== undefined) {
        return map[niveau];
    }
    // En secours, tenter avec niveau_actuel si jamais il est configuré
    if (niveauActuel && map[niveauActuel] !== undefined) {
        return map[niveauActuel];
    }
    const isFinal = niveau === 'finalise' || niveauActuel === 'finalise';
    return isFinal ? 100 : (phase === 'retour' ? 50 : 40);
};

const getProgressColor = (phase, niveau, niveauActuel) => {
    const value = getProgressValue(phase, niveau, niveauActuel);
    if (value === 100 || niveau === 'finalise' || niveauActuel === 'finalise') {
        return 'success';
    }
    return phase === 'retour' ? 'warning' : 'primary';
};

const renderPeriode = (demande) => {
    if ((demande.type_demande || '').toLowerCase() === 'certificat_reprise_service') {
        return (
            <div>
                <div><strong>Reprise :</strong> {demande.date_reprise_service ? formatDate(demande.date_reprise_service, false) : 'Non renseignée'}</div>
            </div>
        );
    }

    if (demande.date_debut && demande.date_fin) {
        return (
            <div>
                <div><strong>Du :</strong> {formatDate(demande.date_debut, false)}</div>
                <div><strong>Au :</strong> {formatDate(demande.date_fin, false)}</div>
            </div>
        );
    }

    return <span className="text-muted">N/A</span>;
};

const DemandeSuivi = ({ agentId, onDemandeClick }) => {
    const [demandes, setDemandes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [refreshIndex, setRefreshIndex] = useState(0);
    const [filters, setFilters] = useState({
        page: 1,
        limit: 5
    });
    const [pagination, setPagination] = useState({});

    useEffect(() => {
        let isMounted = true;

        const fetchDemandes = async () => {
            if (!agentId) {
                setDemandes([]);
                return;
            }

            try {
                setLoading(true);
                setError(null);

                const token = localStorage.getItem('token');
                const queryParams = new URLSearchParams();
                
                Object.keys(filters).forEach(key => {
                    if (filters[key] !== '') {
                        queryParams.append(key, filters[key]);
                    }
                });

                const queryString = queryParams.toString();
                const url = `/api/demandes/suivi/${agentId}${queryString ? `?${queryString}` : ''}`;
                
                const response = await fetchWithBaseFallback(url, {
                    headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                    }
                });

                if (!response.ok) {
                    throw new Error(`Erreur lors du chargement (${response.status})`);
                }

                const result = await response.json();
                if (!isMounted) return;

                if (result.success && Array.isArray(result.data)) {
                    setDemandes(result.data);
                    // Si l'API retourne des infos de pagination, les utiliser
                    if (result.pagination) {
                        setPagination(result.pagination);
                    } else {
                        // Pagination côté client si l'API ne la supporte pas
                        const total = result.data?.length || 0;
                        setPagination({
                            current_page: filters.page,
                            per_page: filters.limit,
                            total: total,
                            total_pages: Math.ceil(total / filters.limit)
                        });
                    }
                } else if (Array.isArray(result)) {
                    setDemandes(result);
                    // Pagination côté client
                    const total = result.length;
                    setPagination({
                        current_page: filters.page,
                        per_page: filters.limit,
                        total: total,
                        total_pages: Math.ceil(total / filters.limit)
                    });
                } else {
                    setDemandes([]);
                    setError(result.error || 'Aucune donnée disponible.');
                }
            } catch (err) {
                if (isMounted) {
                    setError(err.message || 'Erreur inattendue lors du chargement des autorisations.');
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        fetchDemandes();

        return () => {
            isMounted = false;
        };
    }, [agentId, refreshIndex, filters]);

    const handleRetry = () => {
        setRefreshIndex((index) => index + 1);
    };

    const handleView = (demande) => {
        if (onDemandeClick) {
            onDemandeClick('view', demande);
        }
    };

    const handlePageChange = (page) => {
        setFilters(prev => ({
            ...prev,
            page
        }));
    };

    const handleLimitChange = (limit) => {
        setFilters(prev => ({
            ...prev,
            limit: parseInt(limit),
            page: 1 // Reset to first page when changing limit
        }));
    };

    // Pagination côté client si l'API ne la supporte pas
    const getPaginatedDemandes = () => {
        if (pagination.total_pages && pagination.total_pages > 1 && pagination.total > demandes.length) {
            // L'API gère la pagination
            return demandes;
        }
        // Pagination côté client
        const startIndex = (filters.page - 1) * filters.limit;
        const endIndex = startIndex + filters.limit;
        return demandes.slice(startIndex, endIndex);
    };

    const getClientPagination = () => {
        if (pagination.total_pages && pagination.total_pages > 1 && pagination.total > demandes.length) {
            return pagination;
        }
        // Calculer la pagination côté client
        const total = demandes.length;
        const totalPages = Math.ceil(total / filters.limit);
        return {
            current_page: filters.page,
            per_page: filters.limit,
            total: total,
            total_pages: totalPages
        };
    };

    if (loading) {
        return (
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '240px' }}>
                <Spinner color="primary" />
                <span className="ms-2">Chargement du suivi des autorisations...</span>
            </div>
        );
    }

    if (error) {
        return (
            <Alert color="danger">
                <h5>Erreur</h5>
                <p className="mb-2">{error}</p>
                <Button color="primary" size="sm" onClick={handleRetry}>
                    Réessayer
                </Button>
            </Alert>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="h5 mb-0">
                    <i className="fa fa-tasks me-2"></i>
                    Suivi des autorisations
                </CardTitle>
            </CardHeader>
            <CardBody>
                {/* Contrôles de pagination */}
                {demandes.length > 0 && (
                    <Row className="mb-3">
                        <Col md="3">
                            <Input
                                type="select"
                                value={filters.limit}
                                onChange={(e) => handleLimitChange(e.target.value)}
                            >
                                <option value="5">5 par page</option>
                                <option value="10">10 par page</option>
                                <option value="20">20 par page</option>
                                <option value="50">50 par page</option>
                            </Input>
                        </Col>
                        <Col md="9" className="text-end">
                            <small className="text-muted">
                                {getClientPagination().total} demande(s) au total
                            </small>
                        </Col>
                    </Row>
                )}

                {demandes.length === 0 ? (
                    <Alert color="info" className="mb-0">
                        <h5>Aucune demande</h5>
                        <p className="mb-0">Aucune demande n'a encore été enregistrée pour cet agent.</p>
                    </Alert>
                ) : (
                    <>
                        <div className="table-responsive">
                            <Table
                                hover
                                responsive
                                className="align-middle"
                                style={{ color: '#000' }}
                            >
                                <colgroup>
                                    <col style={{ width: '160px' }} />
                                    <col style={{ width: '200px' }} />
                                    <col style={{ width: '120px' }} />
                                    <col style={{ width: '140px' }} />
                                    <col style={{ width: '120px' }} />
                                    <col style={{ width: '200px' }} />
                                    <col style={{ width: '180px' }} />
                                    <col style={{ width: '200px' }} />
                                    <col style={{ width: '160px' }} />
                                    <col style={{ width: '120px' }} />
                                </colgroup>
                                <thead>
                                    <tr>
                                        <th>Type</th>
                                        <th>Motif</th>
                                        <th>Priorité</th>
                                        <th>Statut</th>
                                        <th>Phase</th>
                                        <th>Niveau</th>
                                        <th>Période</th>
                                        <th style={{ width: '160px' }}>Progression</th>
                                        <th>Date création</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {getPaginatedDemandes().map((demande) => {
                                    const typeKey = sanitizeKey(demande.type_demande);
                                    const prioriteKey = sanitizeKey(demande.priorite, 'normale') || 'normale';
                                    const statusKey = sanitizeKey(demande.status || demande.statut, 'en_attente') || 'en_attente';
                                    const phaseKey = sanitizeKey(demande.phase, 'aller') || 'aller';
                                    const rawNiveauEvolution = sanitizeKey(demande.niveau_evolution_demande);
                                    const rawNiveauActuel = sanitizeKey(demande.niveau_actuel || demande.niveau);
                                    const statusApprouve = (demande.status || demande.statut || '') === 'approuve';
                                    let niveauKey = rawNiveauEvolution || rawNiveauActuel;
                                    // Si la demande est approuvée ou finalisée (DRH a validé), afficher "Finalisé"
                                    if (statusApprouve || rawNiveauActuel === 'finalise') {
                                        niveauKey = 'finalise';
                                    } else if (rawNiveauActuel === 'drh') {
                                        niveauKey = 'valide_par_drh';
                                    } else if (rawNiveauActuel === 'directeur_service_exterieur') {
                                        niveauKey = 'valide_par_directeur_service_exterieur';
                                    }
                                    const niveauActuelKey = rawNiveauActuel;
                                    const motif =
                                        [demande.agree_motif, demande.motif, demande.description, demande.objet]
                                            .find((item) => typeof item === 'string' && item.trim().length > 0) || 'Aucun motif';
                                    const motifText = typeof motif === 'string' ? motif.trim() : String(motif);
                                    const rawProgress = clampProgress(demande.progression ?? demande.progress ?? demande.progress_percent);
                                    const fallbackProgress = getProgressValue(phaseKey, niveauKey, niveauActuelKey);
                                    const progressValue = rawProgress ?? fallbackProgress;
                                    const progressColor = rawProgress !== null
                                        ? (rawProgress >= 100 ? 'success' : phaseKey === 'retour' ? 'warning' : 'primary')
                                        : getProgressColor(phaseKey, niveauKey, niveauActuelKey);

                                    return (
                                        <tr
                                            key={demande.id || demande.id_demande}
                                            style={{ color: '#000' }}
                                        >
                                            <td style={{ color: '#000' }}>
                                                {renderBadge(typeKey, typeConfig, 'Type inconnu', true)}
                                            </td>
                                            <td style={{ color: '#000' }}>
                                                <div
                                                    style={{ maxWidth: '220px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                                                    title={motifText}
                                                >
                                                    {motifText}
                                                </div>
                                            </td>
                                            <td style={{ color: '#000' }}>
                                                {renderBadge(prioriteKey, prioriteConfig, 'Priorité', true)}
                                            </td>
                                            <td style={{ color: '#000' }}>
                                                {renderBadge(statusKey, statusConfig, 'Statut', true)}
                                            </td>
                                            <td style={{ color: '#000' }}>
                                                {renderBadge(phaseKey, phaseConfig, 'Phase', true)}
                                            </td>
                                            <td style={{ color: '#000' }}>
                                                {renderBadge(niveauKey, niveauConfig, niveauKey || 'Niveau', true)}
                                            </td>
                                            <td style={{ color: '#000' }}>{renderPeriode(demande)}</td>
                                            <td style={{ color: '#000' }}>
                                                <Progress value={progressValue} color={progressColor} className="mb-1" />
                                                <small className="text-muted">{progressValue}%</small>
                                            </td>
                                            <td>{formatDate(demande.date_creation)}</td>
                                            <td
                                                style={{ cursor: 'pointer' }}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleView(demande);
                                                }}
                                                role="button"
                                                tabIndex={0}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                        e.preventDefault();
                                                        handleView(demande);
                                                    }
                                                }}
                                            >
                                                <Button
                                                    type="button"
                                                    color="outline-primary"
                                                    size="sm"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleView(demande);
                                                    }}
                                                >
                                                    <i className="fa fa-eye me-1"></i>
                                                    Voir
                                                </Button>
                                            </td>
                                        </tr>
                                    );
                                    })}
                                </tbody>
                            </Table>
                        </div>

                        {/* Pagination */}
                        {getClientPagination().total_pages > 1 && (
                            <div className="d-flex justify-content-center mt-3">
                                <Pagination>
                                    <PaginationItem disabled={getClientPagination().current_page === 1}>
                                        <PaginationLink
                                            previous
                                            onClick={() => handlePageChange(getClientPagination().current_page - 1)}
                                        />
                                    </PaginationItem>
                                    
                                    {Array.from({ length: getClientPagination().total_pages }, (_, i) => i + 1).map(page => (
                                        <PaginationItem key={page} active={page === getClientPagination().current_page}>
                                            <PaginationLink onClick={() => handlePageChange(page)}>
                                                {page}
                                            </PaginationLink>
                                        </PaginationItem>
                                    ))}
                                    
                                    <PaginationItem disabled={getClientPagination().current_page === getClientPagination().total_pages}>
                                        <PaginationLink
                                            next
                                            onClick={() => handlePageChange(getClientPagination().current_page + 1)}
                                        />
                                    </PaginationItem>
                                </Pagination>
                            </div>
                        )}
                    </>
                )}
            </CardBody>
        </Card>
    );
};

export default DemandeSuivi;

