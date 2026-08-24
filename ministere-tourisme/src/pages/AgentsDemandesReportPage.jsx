import React, { useState, useEffect } from 'react';
import {
    Card, CardBody, CardHeader, CardTitle,
    Table, Row, Col, Input, InputGroup, Button,
    Spinner, Alert, Badge, FormGroup, Label,
    Pagination, PaginationItem, PaginationLink
} from 'reactstrap';
import Select from 'react-select';
import {
    MdInsertChart, MdArrowBack, MdRefresh, MdFileDownload,
    MdPeople, MdBusiness
} from 'react-icons/md';
import { useHistory } from 'react-router-dom';
import * as XLSX from 'xlsx';

const AgentsDemandesReportPage = () => {
    const history = useHistory();
    const [data, setData] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filtres
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 5; i <= currentYear + 1; i++) {
        years.push({ value: i.toString(), label: i.toString() });
    }

    const [annee, setAnnee] = useState(currentYear.toString());
    const [idMinistere, setIdMinistere] = useState('');
    const [idDirectionGenerale, setIdDirectionGenerale] = useState('');
    const [idDirection, setIdDirection] = useState('');
    const [idSousDirection, setIdSousDirection] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    const [ministeres, setMinisteres] = useState([]);
    const [directionsGenerales, setDirectionsGenerales] = useState([]);
    const [directions, setDirections] = useState([]);
    const [sousDirections, setSousDirections] = useState([]);

    const [sortField, setSortField] = useState('total');
    const [sortOrder, setSortOrder] = useState('desc');

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const userStr = localStorage.getItem('user');
    let user = null;
    try {
        user = userStr ? JSON.parse(userStr) : null;
    } catch (e) {
        console.error('Erreur de parsing utilisateur', e);
    }
    const isSuperAdmin = user && user.role === 'super_admin';

    const API_BASE = 'https://tourisme.2ise-groupe.com/api';

    const getAuthHeaders = () => {
        const token = localStorage.getItem('token');
        return {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        };
    };

    // Chargement des filtres
    useEffect(() => {
        const loadFilters = async () => {
            try {
                const headers = getAuthHeaders();
                const [minRes, dgRes, dirRes, sdRes] = await Promise.all([
                    fetch(`${API_BASE}/ministeres?limit=1000`, { headers }),
                    fetch(`${API_BASE}/directions-generales?limit=1000`, { headers }),
                    fetch(`${API_BASE}/directions?limit=1000`, { headers }),
                    fetch(`${API_BASE}/sous-directions?limit=1000`, { headers })
                ]);
                
                if (minRes.ok) {
                    const minData = await minRes.json();
                    setMinisteres(Array.isArray(minData) ? minData : (minData.data || []));
                }
                if (dgRes.ok) {
                    const dgData = await dgRes.json();
                    setDirectionsGenerales(Array.isArray(dgData) ? dgData : (dgData.data || []));
                }
                if (dirRes.ok) {
                    const dirData = await dirRes.json();
                    setDirections(Array.isArray(dirData) ? dirData : (dirData.data || []));
                }
                if (sdRes.ok) {
                    const sdData = await sdRes.json();
                    setSousDirections(Array.isArray(sdData) ? sdData : (sdData.data || []));
                }
            } catch (err) {
                console.error("Erreur chargement des filtres structurels", err);
            }
        };
        loadFilters();
    }, []);

    // Chargement des données
    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);
            
            const params = new URLSearchParams();
            if (annee) params.append('annee', annee);
            if (idMinistere) params.append('id_ministere', idMinistere);
            if (idDirectionGenerale) params.append('id_direction_generale', idDirectionGenerale);
            if (idDirection) params.append('id_direction', idDirection);
            if (idSousDirection) params.append('id_sous_direction', idSousDirection);

            const response = await fetch(`${API_BASE}/demandes/statistiques-globales-agents?${params.toString()}`, {
                headers: getAuthHeaders()
            });

            if (!response.ok) throw new Error(`Erreur HTTP ${response.status}`);
            const result = await response.json();
            
            if (result.success) {
                setData(result.data || []);
                setSummary(result.summary || null);
            } else {
                setData([]);
                setSummary(null);
            }
        } catch (err) {
            setError('Impossible de charger les données. Vérifiez votre connexion.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, [annee, idMinistere, idDirectionGenerale, idDirection, idSousDirection]);

    // Tri
    const handleSort = (field) => {
        if (sortField === field) {
            setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('desc');
        }
    };

    const SortIcon = ({ field }) => {
        if (sortField !== field) return <span style={{ color: '#ccc', marginLeft: 4 }}>⇅</span>;
        return <span style={{ color: '#4a90d9', marginLeft: 4 }}>{sortOrder === 'asc' ? '↑' : '↓'}</span>;
    };

    // Filtrage textuel et tri
    const filteredAndSorted = [...data]
        .filter(row => {
            if (!searchTerm) return true;
            const term = searchTerm.toLowerCase();
            return (row.nom || '').toLowerCase().includes(term)
                || (row.prenom || '').toLowerCase().includes(term)
                || (row.type_demande || '').toLowerCase().includes(term);
        })
        .sort((a, b) => {
            let valA = a[sortField] ?? 0;
            let valB = b[sortField] ?? 0;
            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();
            
            // Traiter total comme nombre
            if (sortField === 'total') {
                valA = parseInt(valA) || 0;
                valB = parseInt(valB) || 0;
            }

            if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, sortField, sortOrder, annee, idMinistere, idDirectionGenerale, idDirection, idSousDirection, data]);

    const totalPages = Math.ceil(filteredAndSorted.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredAndSorted.slice(indexOfFirstItem, indexOfLastItem);

    // Calcul du classement des documents
    const documentRanking = React.useMemo(() => {
        const counts = {};
        data.forEach(row => {
            const type = row.type_demande || 'Inconnu';
            if (!counts[type]) {
                counts[type] = {
                    total: 0,
                    hommes: 0,
                    femmes: 0,
                    fonctionnaires: 0,
                    contractuels: 0,
                    autres: 0
                };
            }
            
            const n = parseInt(row.total) || 0;
            counts[type].total += n;
            
            // Sexe
            if (row.sexe && ['M', 'MASCULIN', 'HOMME'].includes(row.sexe.toUpperCase())) {
                counts[type].hommes += n;
            } else if (row.sexe && ['F', 'FEMININ', 'FEMME'].includes(row.sexe.toUpperCase())) {
                counts[type].femmes += n;
            }
            
            // Type agent
            if (row.type_agent && row.type_agent.toLowerCase().includes('fonctionnaire')) {
                counts[type].fonctionnaires += n;
            } else if (row.type_agent && row.type_agent.toLowerCase().includes('contractuel')) {
                counts[type].contractuels += n;
            } else {
                counts[type].autres += n;
            }
        });
        
        return Object.keys(counts)
            .map(type => ({ type, ...counts[type] }))
            .sort((a, b) => b.total - a.total);
    }, [data]);

    // Export Excel
    const exportExcel = () => {
        const rows = filteredAndSorted.map((row, idx) => ({
            '#': idx + 1,
            'Agent': `${row.nom || ''} ${row.prenom || ''}`,
            'Sexe': row.sexe || '-',
            'Type Agent': row.type_agent || '-',
            'Direction Générale': row.direction_generale_libelle || '-',
            'Direction': row.direction_libelle || '-',
            'Sous-Direction': row.sous_direction_libelle || '-',
            'Type de demande': row.type_demande || '-',
            'Année': row.annee || '-',
            'Total': parseInt(row.total) || 0,
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Bilan Demandes');
        XLSX.writeFile(wb, 'bilan_demandes_agents.xlsx');
    };

    return (
        <div style={{ padding: '20px', background: '#f5f7fa', minHeight: '100vh' }}>
            <style>
                {`
                    select option {
                        color: #000 !important;
                        background-color: #fff !important;
                    }
                    select {
                        color: #000 !important;
                    }
                `}
            </style>
            {/* En-tête */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                    <h2 style={{ margin: 0, fontWeight: 700, color: '#1a2340', fontSize: 22 }}>
                        <MdInsertChart style={{ marginRight: 8, color: '#4a90d9' }} />
                        Bilan des Demandes par Agent
                    </h2>
                    <p style={{ margin: '4px 0 0', color: '#666', fontSize: 13 }}>
                        Statistiques détaillées des demandes effectuées avec filtres structurels
                    </p>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                    <Button color="secondary" outline size="sm" onClick={() => history.goBack()}>
                        ← Retour
                    </Button>
                    <Button color="primary" size="sm" onClick={loadData}>
                        <MdRefresh /> Actualiser
                    </Button>
                    <Button color="success" size="sm" onClick={exportExcel} disabled={data.length === 0}>
                        <MdFileDownload /> Exporter Excel
                    </Button>
                </div>
            </div>

            {/* Filtres structurels */}
            <Card style={{ marginBottom: 16, borderRadius: 10, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <CardBody>
                    <Row>
                        <Col md={isSuperAdmin ? 2 : 3}>
                            <FormGroup>
                                <Label style={{ fontSize: 12, fontWeight: 600 }}>Année</Label>
                                <Select
                                    value={years.find(y => y.value == annee) ? { value: annee, label: years.find(y => y.value == annee).label } : { value: '', label: 'Toutes les années' }}
                                    onChange={selected => setAnnee(selected ? selected.value : '')}
                                    options={[{ value: '', label: 'Toutes les années' }, ...years.map(y => ({ value: y.value, label: y.label }))]}
                                    placeholder="Toutes les années"
                                    isClearable={false}
                                />
                            </FormGroup>
                        </Col>
                        {isSuperAdmin && (
                            <Col md={3}>
                                <FormGroup>
                                    <Label style={{ fontSize: 12, fontWeight: 600 }}>Ministère</Label>
                                    <Select
                                        value={ministeres.find(m => m.id == idMinistere) ? { value: idMinistere, label: ministeres.find(m => m.id == idMinistere).libelle } : { value: '', label: 'Tous' }}
                                        onChange={selected => setIdMinistere(selected ? selected.value : '')}
                                        options={[{ value: '', label: 'Tous' }, ...ministeres.map(m => ({ value: m.id, label: m.libelle }))]}
                                        placeholder="Tous"
                                        isClearable={false}
                                    />
                                </FormGroup>
                            </Col>
                        )}
                        <Col md={3}>
                            <FormGroup>
                                <Label style={{ fontSize: 12, fontWeight: 600 }}>Direction Générale</Label>
                                <Select
                                    value={directionsGenerales.find(dg => dg.id == idDirectionGenerale) ? { value: idDirectionGenerale, label: directionsGenerales.find(dg => dg.id == idDirectionGenerale).libelle } : { value: '', label: 'Toutes' }}
                                    onChange={selected => setIdDirectionGenerale(selected ? selected.value : '')}
                                    options={[{ value: '', label: 'Toutes' }, ...directionsGenerales.map(dg => ({ value: dg.id, label: dg.libelle }))]}
                                    placeholder="Toutes"
                                    isClearable={false}
                                />
                            </FormGroup>
                        </Col>
                        <Col md={isSuperAdmin ? 2 : 3}>
                            <FormGroup>
                                <Label style={{ fontSize: 12, fontWeight: 600 }}>Direction</Label>
                                <Select
                                    value={directions.find(d => d.id == idDirection) ? { value: idDirection, label: directions.find(d => d.id == idDirection).libelle } : { value: '', label: 'Toutes' }}
                                    onChange={selected => setIdDirection(selected ? selected.value : '')}
                                    options={[{ value: '', label: 'Toutes' }, ...directions.map(d => ({ value: d.id, label: d.libelle }))]}
                                    placeholder="Toutes"
                                    isClearable={false}
                                />
                            </FormGroup>
                        </Col>
                        <Col md={isSuperAdmin ? 2 : 3}>
                            <FormGroup>
                                <Label style={{ fontSize: 12, fontWeight: 600 }}>Sous-Direction</Label>
                                <Select
                                    value={sousDirections.find(sd => sd.id == idSousDirection) ? { value: idSousDirection, label: sousDirections.find(sd => sd.id == idSousDirection).libelle } : { value: '', label: 'Toutes' }}
                                    onChange={selected => setIdSousDirection(selected ? selected.value : '')}
                                    options={[{ value: '', label: 'Toutes' }, ...sousDirections.map(sd => ({ value: sd.id, label: sd.libelle }))]}
                                    placeholder="Toutes"
                                    isClearable={false}
                                />
                            </FormGroup>
                        </Col>
                    </Row>
                </CardBody>
            </Card>

            {/* Cartes de résumé */}
            {!loading && !error && summary && (
                <Row className="mb-3">
                    <Col xs={12} sm={6} md={3} style={{ marginBottom: 12 }}>
                        <div style={{ background: '#fff', borderRadius: 10, padding: '14px 16px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', borderLeft: '4px solid #4a90d9' }}>
                            <div style={{ fontSize: 20, marginBottom: 4 }}><MdPeople /></div>
                            <div style={{ fontSize: 22, fontWeight: 700, color: '#1a2340' }}>{summary.total_agents}</div>
                            <div style={{ fontSize: 12, color: '#888' }}>Total Agents Uniques</div>
                        </div>
                    </Col>
                    <Col xs={12} sm={6} md={3} style={{ marginBottom: 12 }}>
                        <div style={{ background: '#fff', borderRadius: 10, padding: '14px 16px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', borderLeft: '4px solid #3b82f6' }}>
                            <div style={{ fontSize: 20, marginBottom: 4 }}>👨</div>
                            <div style={{ fontSize: 22, fontWeight: 700, color: '#1a2340' }}>{summary.total_hommes}</div>
                            <div style={{ fontSize: 12, color: '#888' }}>Total Hommes</div>
                        </div>
                    </Col>
                    <Col xs={12} sm={6} md={3} style={{ marginBottom: 12 }}>
                        <div style={{ background: '#fff', borderRadius: 10, padding: '14px 16px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', borderLeft: '4px solid #ec4899' }}>
                            <div style={{ fontSize: 20, marginBottom: 4 }}>👩</div>
                            <div style={{ fontSize: 22, fontWeight: 700, color: '#1a2340' }}>{summary.total_femmes}</div>
                            <div style={{ fontSize: 12, color: '#888' }}>Total Femmes</div>
                        </div>
                    </Col>
                    <Col xs={12} sm={6} md={3} style={{ marginBottom: 12 }}>
                        <div style={{ background: '#fff', borderRadius: 10, padding: '14px 16px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', borderLeft: '4px solid #22c55e' }}>
                            <div style={{ fontSize: 20, marginBottom: 4 }}>✅</div>
                            <div style={{ fontSize: 22, fontWeight: 700, color: '#1a2340' }}>{summary.nb_fonctionnaire}</div>
                            <div style={{ fontSize: 12, color: '#888' }}>Fonctionnaires (👨 {summary.nb_fonctionnaire_hommes} / 👩 {summary.nb_fonctionnaire_femmes})</div>
                        </div>
                    </Col>
                    <Col xs={12} sm={6} md={3} style={{ marginBottom: 12 }}>
                        <div style={{ background: '#fff', borderRadius: 10, padding: '14px 16px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', borderLeft: '4px solid #f59e0b' }}>
                            <div style={{ fontSize: 20, marginBottom: 4 }}>📋</div>
                            <div style={{ fontSize: 22, fontWeight: 700, color: '#1a2340' }}>{summary.nb_contractuel}</div>
                            <div style={{ fontSize: 12, color: '#888' }}>Contractuels (👨 {summary.nb_contractuel_hommes} / 👩 {summary.nb_contractuel_femmes})</div>
                        </div>
                    </Col>
                    <Col xs={12} sm={6} md={3} style={{ marginBottom: 12 }}>
                        <div style={{ background: '#fff', borderRadius: 10, padding: '14px 16px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', borderLeft: '4px solid #8b5cf6' }}>
                            <div style={{ fontSize: 20, marginBottom: 4 }}>🔹</div>
                            <div style={{ fontSize: 22, fontWeight: 700, color: '#1a2340' }}>{summary.nb_autres}</div>
                            <div style={{ fontSize: 12, color: '#888' }}>Autres Types (👨 {summary.nb_autres_hommes} / 👩 {summary.nb_autres_femmes})</div>
                        </div>
                    </Col>
                </Row>
            )}

            {/* Classement des documents */}
            {!loading && !error && documentRanking.length > 0 && (
                <Card style={{ marginBottom: 16, borderRadius: 10, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                    <CardBody>
                        <h5 style={{ fontWeight: 600, color: '#1a2340', marginBottom: 16 }}>Classement des Documents Demandés</h5>
                        <div className="table-responsive">
                            <Table borderless size="sm" hover className="mb-0">
                                <thead>
                                    <tr style={{ borderBottom: '1px solid #e9ecef' }}>
                                        <th style={{ width: '80px', color: '#6c757d', fontWeight: 600, textAlign: 'center' }}>Rang</th>
                                        <th style={{ color: '#6c757d', fontWeight: 600 }}>Type de document</th>
                                        <th style={{ textAlign: 'center', color: '#6c757d', fontWeight: 600 }}>Hommes</th>
                                        <th style={{ textAlign: 'center', color: '#6c757d', fontWeight: 600 }}>Femmes</th>
                                        <th style={{ textAlign: 'center', color: '#6c757d', fontWeight: 600 }}>Fonctionnaires</th>
                                        <th style={{ textAlign: 'center', color: '#6c757d', fontWeight: 600 }}>Contractuels</th>
                                        <th style={{ textAlign: 'center', color: '#6c757d', fontWeight: 600 }}>Autres</th>
                                        <th style={{ textAlign: 'right', color: '#6c757d', fontWeight: 600, paddingRight: '15px' }}>Total demandes</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {documentRanking.map((doc, idx) => (
                                        <tr key={doc.type} style={{ borderBottom: '1px solid #f8f9fa' }}>
                                            <td style={{ verticalAlign: 'middle' }}>
                                                <div style={{
                                                    width: 24, height: 24, 
                                                    borderRadius: '50%', 
                                                    background: idx === 0 ? '#3b82f6' : (idx === 1 ? '#8b5cf6' : (idx === 2 ? '#ec4899' : '#cbd5e1')),
                                                    color: '#fff', 
                                                    display: 'flex', 
                                                    alignItems: 'center', 
                                                    justifyContent: 'center',
                                                    fontSize: 12,
                                                    fontWeight: 'bold',
                                                    margin: 'auto'
                                                }}>
                                                    {idx + 1}
                                                </div>
                                            </td>
                                            <td style={{ verticalAlign: 'middle', fontSize: 14, fontWeight: idx === 0 ? 600 : 500, color: '#334155' }}>
                                                {doc.type.replace(/_/g, ' ')}
                                            </td>
                                            <td style={{ verticalAlign: 'middle', textAlign: 'center', color: '#4b5563', fontSize: 13 }}>
                                                {doc.hommes > 0 ? <span style={{color:'#2563eb'}}>{doc.hommes}</span> : '-'}
                                            </td>
                                            <td style={{ verticalAlign: 'middle', textAlign: 'center', color: '#4b5563', fontSize: 13 }}>
                                                {doc.femmes > 0 ? <span style={{color:'#db2777'}}>{doc.femmes}</span> : '-'}
                                            </td>
                                            <td style={{ verticalAlign: 'middle', textAlign: 'center', color: '#4b5563', fontSize: 13 }}>
                                                {doc.fonctionnaires > 0 ? <span style={{color:'#16a34a'}}>✅ {doc.fonctionnaires}</span> : '-'}
                                            </td>
                                            <td style={{ verticalAlign: 'middle', textAlign: 'center', color: '#4b5563', fontSize: 13 }}>
                                                {doc.contractuels > 0 ? <span style={{color:'#ea580c'}}>📋 {doc.contractuels}</span> : '-'}
                                            </td>
                                            <td style={{ verticalAlign: 'middle', textAlign: 'center', color: '#4b5563', fontSize: 13 }}>
                                                {doc.autres > 0 ? <span style={{color:'#64748b'}}>🔹 {doc.autres}</span> : '-'}
                                            </td>
                                            <td style={{ verticalAlign: 'middle', textAlign: 'right', paddingRight: '15px' }}>
                                                <span style={{ 
                                                    fontSize: 12, 
                                                    fontWeight: 'bold', 
                                                    backgroundColor: idx === 0 ? '#dbeafe' : '#e2e8f0', 
                                                    color: idx === 0 ? '#1e40af' : '#475569', 
                                                    padding: '4px 10px', 
                                                    borderRadius: '12px',
                                                    display: 'inline-block'
                                                }}>
                                                    {doc.total} demande{doc.total > 1 ? 's' : ''}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </div>
                    </CardBody>
                </Card>
            )}

            {/* Barre de recherche locale */}
            <Card style={{ marginBottom: 16, borderRadius: 10, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <CardBody style={{ padding: '12px 16px' }}>
                    <InputGroup>
                        <span style={{ padding: '6px 10px', background: '#f0f4ff', borderRadius: '6px 0 0 6px', border: '1px solid #dee2e6', borderRight: 'none', color: '#4a90d9' }}>
                            🔍
                        </span>
                        <Input
                            placeholder="Rechercher par nom, prénom, type de demande..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            style={{ borderLeft: 'none', fontSize: 14 }}
                        />
                        {searchTerm && (
                            <Button outline color="secondary" size="sm" onClick={() => setSearchTerm('')} style={{ borderRadius: '0 6px 6px 0' }}>
                                ✕
                            </Button>
                        )}
                    </InputGroup>
                </CardBody>
            </Card>

            {/* Contenu principal */}
            {loading && (
                <div style={{ textAlign: 'center', padding: 60 }}>
                    <Spinner color="primary" />
                    <p style={{ color: '#888', marginTop: 12 }}>Chargement des statistiques...</p>
                </div>
            )}

            {error && <Alert color="danger">{error}</Alert>}

            {!loading && !error && (
                <Card style={{ borderRadius: 10, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
                    <CardBody style={{ padding: 0 }}>
                        <div style={{ overflowX: 'auto' }}>
                            <Table hover responsive style={{ margin: 0, fontSize: 13 }}>
                                <thead>
                                    <tr style={{ background: '#f8f9fc', borderBottom: '2px solid #e9ecef' }}>
                                        <th style={{ width: 40, textAlign: 'center', padding: '10px 8px', color: '#888' }}>#</th>
                                        <th style={{ cursor: 'pointer', padding: '10px 12px' }} onClick={() => handleSort('nom')}>
                                            Agent <SortIcon field="nom" />
                                        </th>
                                        <th style={{ padding: '10px 12px' }}>Profil</th>
                                        <th style={{ padding: '10px 12px' }}>Structure</th>
                                        <th style={{ cursor: 'pointer', padding: '10px 12px' }} onClick={() => handleSort('type_demande')}>
                                            Type de Demande <SortIcon field="type_demande" />
                                        </th>
                                        <th style={{ cursor: 'pointer', padding: '10px 12px', textAlign: 'center' }} onClick={() => handleSort('annee')}>
                                            Année <SortIcon field="annee" />
                                        </th>
                                        <th style={{ cursor: 'pointer', padding: '10px 12px', textAlign: 'center' }} onClick={() => handleSort('total')}>
                                            Total <SortIcon field="total" />
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {currentItems.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} style={{ textAlign: 'center', padding: 40, color: '#aaa' }}>
                                                Aucune donnée disponible
                                            </td>
                                        </tr>
                                    ) : (
                                        currentItems.map((row, idx) => (
                                            <tr key={idx}>
                                                <td style={{ textAlign: 'center', color: '#aaa', padding: '10px 8px' }}>{indexOfFirstItem + idx + 1}</td>
                                                <td style={{ padding: '10px 12px', fontWeight: 500 }}>
                                                    {row.nom} {row.prenom}
                                                </td>
                                                <td style={{ padding: '10px 12px' }}>
                                                    <span style={{ display: 'inline-block', backgroundColor: row.sexe?.startsWith('F') ? '#fee2e2' : '#e0e7ff', color: row.sexe?.startsWith('F') ? '#b91c1c' : '#4338ca', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', marginRight: '6px' }}>
                                                        {row.sexe || 'N/A'}
                                                    </span>
                                                    <span style={{ display: 'inline-block', backgroundColor: '#cff4fc', color: '#055160', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                                                        {row.type_agent || 'N/A'}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '10px 12px', fontSize: 11, color: '#666' }}>
                                                    {row.direction_generale_libelle && <div><strong>DG:</strong> {row.direction_generale_libelle}</div>}
                                                    {row.direction_libelle && <div><strong>Dir:</strong> {row.direction_libelle}</div>}
                                                    {row.sous_direction_libelle && <div><strong>S-Dir:</strong> {row.sous_direction_libelle}</div>}
                                                </td>
                                                <td style={{ padding: '10px 12px' }}>
                                                    <Badge color="light" style={{ border: '1px solid #ddd', color: '#000' }}>
                                                        {row.type_demande}
                                                    </Badge>
                                                </td>
                                                <td style={{ textAlign: 'center', padding: '10px 12px' }}>{row.annee}</td>
                                                <td style={{ textAlign: 'center', padding: '10px 12px', fontWeight: 'bold' }}>{row.total}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </Table>
                        </div>
                        {totalPages > 1 && (
                            <div style={{ display: 'flex', justifyContent: 'center', padding: '15px', overflowX: 'auto' }}>
                                <Pagination>
                                    <PaginationItem disabled={currentPage <= 1}>
                                        <PaginationLink previous onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} />
                                    </PaginationItem>
                                    
                                    {(() => {
                                        let pages = [];
                                        const maxVisible = 5;
                                        let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
                                        let endPage = startPage + maxVisible - 1;

                                        if (endPage > totalPages) {
                                            endPage = totalPages;
                                            startPage = Math.max(1, endPage - maxVisible + 1);
                                        }

                                        if (startPage > 1) {
                                            pages.push(
                                                <PaginationItem key="1">
                                                    <PaginationLink onClick={() => setCurrentPage(1)}>1</PaginationLink>
                                                </PaginationItem>
                                            );
                                            if (startPage > 2) {
                                                pages.push(
                                                    <PaginationItem key="ellipsis1" disabled>
                                                        <PaginationLink>...</PaginationLink>
                                                    </PaginationItem>
                                                );
                                            }
                                        }

                                        for (let i = startPage; i <= endPage; i++) {
                                            pages.push(
                                                <PaginationItem active={i === currentPage} key={i}>
                                                    <PaginationLink onClick={() => setCurrentPage(i)}>{i}</PaginationLink>
                                                </PaginationItem>
                                            );
                                        }

                                        if (endPage < totalPages) {
                                            if (endPage < totalPages - 1) {
                                                pages.push(
                                                    <PaginationItem key="ellipsis2" disabled>
                                                        <PaginationLink>...</PaginationLink>
                                                    </PaginationItem>
                                                );
                                            }
                                            pages.push(
                                                <PaginationItem key={totalPages}>
                                                    <PaginationLink onClick={() => setCurrentPage(totalPages)}>{totalPages}</PaginationLink>
                                                </PaginationItem>
                                            );
                                        }
                                        return pages;
                                    })()}

                                    <PaginationItem disabled={currentPage >= totalPages}>
                                        <PaginationLink next onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} />
                                    </PaginationItem>
                                </Pagination>
                            </div>
                        )}
                    </CardBody>
                </Card>
            )}
        </div>
    );
};

export default AgentsDemandesReportPage;
