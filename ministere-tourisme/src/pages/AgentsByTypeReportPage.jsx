import React, { useState, useEffect } from 'react';
import {
    Card, CardBody, Table, Row, Col, Input, InputGroup, Button,
    Spinner, Alert
} from 'reactstrap';
import {
    MdCategory, MdArrowBack, MdRefresh, MdFileDownload,
    MdPeople
} from 'react-icons/md';
import { useHistory } from 'react-router-dom';
import * as XLSX from 'xlsx';

const AgentsByTypeReportPage = () => {
    const history = useHistory();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortField, setSortField] = useState('count');
    const [sortOrder, setSortOrder] = useState('desc');

    const API_BASE = 'https://tourisme.2ise-groupe.com/api';

    const getAuthHeaders = () => {
        const token = localStorage.getItem('token');
        return {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        };
    };

    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetch(`${API_BASE}/agents/stats/by-type`, {
                headers: getAuthHeaders()
            });
            if (!response.ok) throw new Error(`Erreur HTTP ${response.status}`);
            const result = await response.json();
            if (result.success && Array.isArray(result.data)) {
                setData(result.data);
            } else {
                setData([]);
            }
        } catch (err) {
            setError('Impossible de charger les données. Vérifiez votre connexion.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadData(); }, []);

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

    // Filtrage et tri
    const filteredAndSorted = [...data]
        .filter(row => {
            if (!searchTerm) return true;
            const term = searchTerm.toLowerCase();
            return (row.type_agent_libele || '-').toLowerCase().includes(term);
        })
        .sort((a, b) => {
            let valA = a[sortField] ?? 0;
            let valB = b[sortField] ?? 0;
            
            if (sortField === 'hommes') {
                valA = a.count_hommes ?? 0;
                valB = b.count_hommes ?? 0;
            }
            if (sortField === 'femmes') {
                valA = a.count_femmes ?? 0;
                valB = b.count_femmes ?? 0;
            }

            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();
            if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

    // Totaux
    const totals = filteredAndSorted.reduce((acc, row) => ({
        count: acc.count + (parseInt(row.count) || 0),
        hommes: acc.hommes + (parseInt(row.count_hommes) || 0),
        femmes: acc.femmes + (parseInt(row.count_femmes) || 0),
    }), { count: 0, hommes: 0, femmes: 0 });

    // Export Excel
    const exportExcel = () => {
        const rows = filteredAndSorted.map((row, idx) => ({
            '#': idx + 1,
            'Type d\'agent': row.type_agent_libele || '-',
            'Total Agents': parseInt(row.count) || 0,
            'Hommes': parseInt(row.count_hommes) || 0,
            '% Hommes': `${row.percentage_hommes || 0}%`,
            'Femmes': parseInt(row.count_femmes) || 0,
            '% Femmes': `${row.percentage_femmes || 0}%`,
            '% Total': `${row.percentage || 0}%`,
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Répartition par type');
        XLSX.writeFile(wb, 'repartition_agents_par_type.xlsx');
    };

    return (
        <div style={{ padding: '20px', background: '#f5f7fa', minHeight: '100vh' }}>

            {/* En-tête */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                    <h2 style={{ margin: 0, fontWeight: 700, color: '#1a2340', fontSize: 22 }}>
                        <MdCategory style={{ marginRight: 8, color: '#4a90d9' }} />
                        Répartition des Agents par Type
                    </h2>
                    <p style={{ margin: '4px 0 0', color: '#666', fontSize: 13 }}>
                        Statistiques sur la répartition des agents selon leur type
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

            {/* Cartes de résumé */}
            {!loading && !error && data.length > 0 && (
                <Row className="mb-3">
                    {[
                        { label: 'Total agents', value: totals.count, icon: <MdPeople />, color: '#4a90d9' },
                        { label: 'Hommes', value: totals.hommes, sub: totals.count ? `${Math.round(totals.hommes * 100 / totals.count)}%` : '0%', icon: '👨', color: '#3b82f6' },
                        { label: 'Femmes', value: totals.femmes, sub: totals.count ? `${Math.round(totals.femmes * 100 / totals.count)}%` : '0%', icon: '👩', color: '#ec4899' },
                        { label: 'Types d\'agents', value: data.length, icon: <MdCategory />, color: '#0ea5e9' },
                    ].map((card, i) => (
                        <Col key={i} xs={6} sm={6} md={3} style={{ marginBottom: 12 }}>
                            <div style={{
                                background: '#fff', borderRadius: 10, padding: '14px 16px',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.07)', borderLeft: `4px solid ${card.color}`
                            }}>
                                <div style={{ fontSize: 20, marginBottom: 4 }}>{card.icon}</div>
                                <div style={{ fontSize: 22, fontWeight: 700, color: '#1a2340' }}>{card.value}</div>
                                <div style={{ fontSize: 12, color: '#888' }}>
                                    {card.label}
                                    {card.sub && <span style={{ marginLeft: 6, color: card.color, fontWeight: 600 }}>{card.sub}</span>}
                                </div>
                            </div>
                        </Col>
                    ))}
                </Row>
            )}

            {/* Barre de recherche */}
            <Card style={{ marginBottom: 16, borderRadius: 10, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <CardBody style={{ padding: '12px 16px' }}>
                    <InputGroup>
                        <span style={{ padding: '6px 10px', background: '#f0f4ff', borderRadius: '6px 0 0 6px', border: '1px solid #dee2e6', borderRight: 'none', color: '#4a90d9' }}>
                            🔍
                        </span>
                        <Input
                            placeholder="Rechercher un type d'agent..."
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
                    {filteredAndSorted.length !== data.length && (
                        <small style={{ color: '#888', marginTop: 6, display: 'block' }}>
                            {filteredAndSorted.length} résultat(s) sur {data.length} types d'agents
                        </small>
                    )}
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
                        <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: 600, color: '#555', fontSize: 13 }}>
                                DONNÉES ({filteredAndSorted.length} ÉLÉMENTS)
                            </span>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            <Table hover responsive style={{ margin: 0, fontSize: 13 }}>
                                <thead>
                                    <tr style={{ background: '#f8f9fc', borderBottom: '2px solid #e9ecef' }}>
                                        <th style={{ width: 40, textAlign: 'center', padding: '10px 8px', color: '#888', fontWeight: 600 }}>#</th>
                                        <th
                                            style={{ cursor: 'pointer', padding: '10px 12px', color: '#333', fontWeight: 600, minWidth: 200 }}
                                            onClick={() => handleSort('type_agent_libele')}
                                        >
                                            Type d'agent <SortIcon field="type_agent_libele" />
                                        </th>

                                        {/* Répartition par sexe */}
                                        <th colSpan={3} style={{ textAlign: 'center', padding: '10px 8px', background: '#eef4ff', color: '#3b82f6', fontWeight: 700, borderLeft: '2px solid #dbeafe' }}>
                                            👥 Répartition par sexe
                                        </th>

                                        {/* Total */}
                                        <th
                                            style={{ cursor: 'pointer', padding: '10px 12px', color: '#333', fontWeight: 600, textAlign: 'right', borderLeft: '2px solid #e9ecef' }}
                                            onClick={() => handleSort('percentage')}
                                        >
                                            % Total <SortIcon field="percentage" />
                                        </th>
                                    </tr>
                                    <tr style={{ background: '#fcfcfd', fontSize: 12 }}>
                                        <th style={{ padding: '6px 8px' }}></th>
                                        <th style={{ padding: '6px 12px', color: '#666' }}>Libellé</th>

                                        {/* Sexe sous-entêtes */}
                                        <th
                                            style={{ cursor: 'pointer', padding: '6px 10px', textAlign: 'center', background: '#eef4ff', color: '#3b82f6', borderLeft: '2px solid #dbeafe' }}
                                            onClick={() => handleSort('count')}
                                        >
                                            Total <SortIcon field="count" />
                                        </th>
                                        <th
                                            style={{ cursor: 'pointer', padding: '6px 10px', textAlign: 'center', background: '#eef4ff', color: '#3b82f6' }}
                                            onClick={() => handleSort('hommes')}
                                        >
                                            Hommes <SortIcon field="hommes" />
                                        </th>
                                        <th
                                            style={{ cursor: 'pointer', padding: '6px 10px', textAlign: 'center', background: '#eef4ff', color: '#ec4899' }}
                                            onClick={() => handleSort('femmes')}
                                        >
                                            Femmes <SortIcon field="femmes" />
                                        </th>

                                        <th style={{ padding: '6px 12px', textAlign: 'right', color: '#666', borderLeft: '2px solid #e9ecef' }}>Pct.</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredAndSorted.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} style={{ textAlign: 'center', padding: 40, color: '#aaa' }}>
                                                Aucune donnée disponible
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredAndSorted.map((row, idx) => {
                                            const total = parseInt(row.count) || 0;
                                            const hommes = parseInt(row.count_hommes) || 0;
                                            const femmes = parseInt(row.count_femmes) || 0;
                                            const pctH = total > 0 ? Math.round(hommes * 100 / total) : 0;
                                            const pctF = total > 0 ? Math.round(femmes * 100 / total) : 0;

                                            return (
                                                <tr key={idx} style={{ transition: 'background 0.15s' }}>
                                                    <td style={{ textAlign: 'center', color: '#aaa', padding: '10px 8px' }}>{idx + 1}</td>
                                                    <td style={{ padding: '10px 12px', fontWeight: 500, color: '#1a2340' }}>
                                                        {row.type_agent_libele || <em style={{ color: '#aaa' }}>–</em>}
                                                    </td>

                                                    {/* Sexe */}
                                                    <td style={{ textAlign: 'center', padding: '10px 10px', background: '#f8fbff', borderLeft: '2px solid #dbeafe' }}>
                                                        <span style={{ fontWeight: 700, fontSize: 14 }}>{total}</span>
                                                    </td>
                                                    <td style={{ padding: '10px 10px', background: '#f8fbff', minWidth: 110 }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                                                            <span style={{ color: '#3b82f6', fontWeight: 600 }}>{hommes}</span>
                                                            <span style={{ color: '#aaa', fontSize: 11 }}>{row.percentage_hommes || pctH}%</span>
                                                        </div>
                                                        <div style={{ height: 6, background: '#dbeafe', borderRadius: 3, overflow: 'hidden' }}>
                                                            <div style={{ width: `${row.percentage_hommes || pctH}%`, height: '100%', background: '#3b82f6', borderRadius: 3 }} />
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '10px 10px', background: '#f8fbff', minWidth: 110 }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                                                            <span style={{ color: '#ec4899', fontWeight: 600 }}>{femmes}</span>
                                                            <span style={{ color: '#aaa', fontSize: 11 }}>{row.percentage_femmes || pctF}%</span>
                                                        </div>
                                                        <div style={{ height: 6, background: '#fce7f3', borderRadius: 3, overflow: 'hidden' }}>
                                                            <div style={{ width: `${row.percentage_femmes || pctF}%`, height: '100%', background: '#ec4899', borderRadius: 3 }} />
                                                        </div>
                                                    </td>

                                                    {/* % total */}
                                                    <td style={{ textAlign: 'right', padding: '10px 12px', borderLeft: '2px solid #e9ecef' }}>
                                                        <span style={{ fontWeight: 600, color: '#4a90d9' }}>{row.percentage || 0}%</span>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                                {filteredAndSorted.length > 0 && (
                                    <tfoot>
                                        <tr style={{ background: '#f0f4ff', fontWeight: 700, borderTop: '2px solid #c7d8f5' }}>
                                            <td style={{ padding: '10px 8px' }}></td>
                                            <td style={{ padding: '10px 12px', color: '#1a2340' }}>TOTAL</td>
                                            <td style={{ textAlign: 'center', padding: '10px 10px', background: '#dbeafe', borderLeft: '2px solid #bfdbfe' }}>{totals.count}</td>
                                            <td style={{ textAlign: 'center', padding: '10px 10px', background: '#dbeafe', color: '#3b82f6' }}>{totals.hommes}</td>
                                            <td style={{ textAlign: 'center', padding: '10px 10px', background: '#dbeafe', color: '#ec4899' }}>{totals.femmes}</td>
                                            <td style={{ padding: '10px 12px', textAlign: 'right', borderLeft: '2px solid #e9ecef', color: '#4a90d9' }}>100%</td>
                                        </tr>
                                    </tfoot>
                                )}
                            </Table>
                        </div>
                    </CardBody>
                </Card>
            )}
        </div>
    );
};

export default AgentsByTypeReportPage;
