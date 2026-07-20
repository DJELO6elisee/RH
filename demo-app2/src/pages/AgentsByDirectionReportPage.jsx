import React, { useState, useEffect, useRef } from 'react';
import {
    Card, CardBody, CardHeader, CardTitle,
    Table, Row, Col, Input, InputGroup, Button,
    Spinner, Alert, Badge
} from 'reactstrap';
import {
    MdBusiness, MdArrowBack, MdRefresh, MdFileDownload,
    MdMale, MdFemale, MdPeople
} from 'react-icons/md';
import { useHistory } from 'react-router-dom';
import * as XLSX from 'xlsx';

const AgentsByDirectionReportPage = () => {
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
            const response = await fetch(`${API_BASE}/agents/stats/by-direction`, {
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
            return (row.direction_libelle || '-').toLowerCase().includes(term)
                || (row.ministere_nom || '').toLowerCase().includes(term);
        })
        .sort((a, b) => {
            let valA = a[sortField] ?? 0;
            let valB = b[sortField] ?? 0;
            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();
            if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

    // Totaux
    const totals = filteredAndSorted.reduce((acc, row) => ({
        count: acc.count + (parseInt(row.count) || 0),
        hommes: acc.hommes + (parseInt(row.hommes) || 0),
        femmes: acc.femmes + (parseInt(row.femmes) || 0),
        nb_fonctionnaire: acc.nb_fonctionnaire + (parseInt(row.nb_fonctionnaire) || 0),
        nb_contractuel: acc.nb_contractuel + (parseInt(row.nb_contractuel) || 0),
        nb_article_18: acc.nb_article_18 + (parseInt(row.nb_article_18) || 0),
        nb_bnetd: acc.nb_bnetd + (parseInt(row.nb_bnetd) || 0),
    }), { count: 0, hommes: 0, femmes: 0, nb_fonctionnaire: 0, nb_contractuel: 0, nb_article_18: 0, nb_bnetd: 0 });

    // Export Excel
    const exportExcel = () => {
        const rows = filteredAndSorted.map((row, idx) => ({
            '#': idx + 1,
            'Direction': row.direction_libelle || '-',
            'Total': parseInt(row.count) || 0,
            'Total Agents': parseInt(row.count) || 0,
            'Hommes': parseInt(row.hommes) || 0,
            '% Hommes': `${row.pct_hommes || 0}%`,
            'Femmes': parseInt(row.femmes) || 0,
            '% Femmes': `${row.pct_femmes || 0}%`,
            'Fonctionnaires': parseInt(row.nb_fonctionnaire) || 0,
            '% Fonctionnaires': `${row.pct_fonctionnaire || 0}%`,
            'Contractuels': parseInt(row.nb_contractuel) || 0,
            '% Contractuels': `${row.pct_contractuel || 0}%`,
            'Article 18': parseInt(row.nb_article_18) || 0,
            '% Article 18': `${row.pct_article_18 || 0}%`,
            'BNETD': parseInt(row.nb_bnetd) || 0,
            '% BNETD': `${row.pct_bnetd || 0}%`,
            'Autres Statuts': parseInt(row.nb_autres_statut) || 0,
            '% En mission': `${row.pct_en_mission || 0}%`,
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Répartition par direction');
        XLSX.writeFile(wb, 'repartition_agents_par_direction.xlsx');
    };

    // Couleur barre de progression
    const barColor = (pct) => {
        if (pct >= 60) return '#4a90d9';
        if (pct >= 40) return '#5cb85c';
        return '#f0ad4e';
    };

    const MiniBar = ({ value, max, color }) => {
        const pct = max > 0 ? Math.round((value / max) * 100) : 0;
        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{
                    flex: 1, height: 8, background: '#e9ecef', borderRadius: 4, overflow: 'hidden'
                }}>
                    <div style={{
                        width: `${pct}%`, height: '100%',
                        background: color, borderRadius: 4, transition: 'width 0.4s'
                    }} />
                </div>
                <span style={{ fontSize: 11, color: '#555', minWidth: 28, textAlign: 'right' }}>
                    {value}
                </span>
            </div>
        );
    };

    return (
        <div style={{ padding: '20px', background: '#f5f7fa', minHeight: '100vh' }}>

            {/* En-tête */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                    <h2 style={{ margin: 0, fontWeight: 700, color: '#1a2340', fontSize: 22 }}>
                        <MdBusiness style={{ marginRight: 8, color: '#4a90d9' }} />
                        Répartition des Agents par Direction
                    </h2>
                    <p style={{ margin: '4px 0 0', color: '#666', fontSize: 13 }}>
                        Statistiques sur la répartition des agents par direction
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
                        { label: 'Fonctionnaires', value: totals.nb_fonctionnaire, sub: totals.count ? `${Math.round(totals.nb_fonctionnaire * 100 / totals.count)}%` : '0%', icon: '✅', color: '#22c55e' },
                        { label: 'Directions', value: data.length, icon: <MdBusiness />, color: '#0ea5e9' },
                    ].map((card, i) => (
                        <Col key={i} xs={6} sm={4} md={3} lg style={{ marginBottom: 12 }}>
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
                            placeholder="Rechercher une direction..."
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
                            {filteredAndSorted.length} résultat(s) sur {data.length} directions
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
                                            onClick={() => handleSort('direction_libelle')}
                                        >
                                            Direction <SortIcon field="direction_libelle" />
                                        </th>

                                        {/* Répartition par sexe */}
                                        <th colSpan={3} style={{ textAlign: 'center', padding: '10px 8px', background: '#eef4ff', color: '#3b82f6', fontWeight: 700, borderLeft: '2px solid #dbeafe' }}>
                                            👥 Répartition par sexe
                                        </th>

                                        {/* Répartition par statut */}
                                        <th colSpan={5} style={{ textAlign: 'center', padding: '10px 8px', background: '#f0fdf4', color: '#22c55e', fontWeight: 700, borderLeft: '2px solid #bbf7d0' }}>
                                            📋 Répartition par statut
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

                                        {/* Statut sous-entêtes */}
                                        <th
                                            style={{ cursor: 'pointer', padding: '6px 10px', textAlign: 'center', background: '#f0fdf4', color: '#22c55e', borderLeft: '2px solid #bbf7d0' }}
                                            onClick={() => handleSort('nb_fonctionnaire')}
                                        >
                                            Fonct. <SortIcon field="nb_fonctionnaire" />
                                        </th>
                                        <th
                                            style={{ cursor: 'pointer', padding: '6px 10px', textAlign: 'center', background: '#f0fdf4', color: '#f59e0b' }}
                                            onClick={() => handleSort('nb_contractuel')}
                                        >
                                            Contract. <SortIcon field="nb_contractuel" />
                                        </th>
                                        <th
                                            style={{ cursor: 'pointer', padding: '6px 10px', textAlign: 'center', background: '#f0fdf4', color: '#8b5cf6' }}
                                            onClick={() => handleSort('nb_article_18')}
                                        >
                                            Art. 18 <SortIcon field="nb_article_18" />
                                        </th>
                                        <th
                                            style={{ cursor: 'pointer', padding: '6px 10px', textAlign: 'center', background: '#f0fdf4', color: '#0ea5e9' }}
                                            onClick={() => handleSort('nb_bnetd')}
                                        >
                                            BNETD <SortIcon field="nb_bnetd" />
                                        </th>
                                        <th style={{ padding: '6px 10px', textAlign: 'center', background: '#f0fdf4', color: '#888' }}>
                                            Autres
                                        </th>

                                        <th style={{ padding: '6px 12px', textAlign: 'right', color: '#666', borderLeft: '2px solid #e9ecef' }}>Pct.</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredAndSorted.length === 0 ? (
                                        <tr>
                                            <td colSpan={10} style={{ textAlign: 'center', padding: 40, color: '#aaa' }}>
                                                Aucune donnée disponible
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredAndSorted.map((row, idx) => {
                                            const total = parseInt(row.count) || 0;
                                            const hommes = parseInt(row.hommes) || 0;
                                            const femmes = parseInt(row.femmes) || 0;
                                            const fonctionnaire = parseInt(row.nb_fonctionnaire) || 0;
                                            const contractuel = parseInt(row.nb_contractuel) || 0;
                                            const article18 = parseInt(row.nb_article_18) || 0;
                                            const bnetd = parseInt(row.nb_bnetd) || 0;
                                            const autres = parseInt(row.nb_autres_statut) || 0;
                                            const pctH = total > 0 ? Math.round(hommes * 100 / total) : 0;
                                            const pctF = total > 0 ? Math.round(femmes * 100 / total) : 0;
                                            const pctFonct = total > 0 ? Math.round(fonctionnaire * 100 / total) : 0;
                                            const pctCont = total > 0 ? Math.round(contractuel * 100 / total) : 0;
                                            const pctArt = total > 0 ? Math.round(article18 * 100 / total) : 0;
                                            const pctBnetd = total > 0 ? Math.round(bnetd * 100 / total) : 0;

                                            return (
                                                <tr key={idx} style={{ transition: 'background 0.15s' }}>
                                                    <td style={{ textAlign: 'center', color: '#aaa', padding: '10px 8px' }}>{idx + 1}</td>
                                                    <td style={{ padding: '10px 12px', fontWeight: 500, color: '#1a2340' }}>
                                                        {row.direction_libelle || <em style={{ color: '#aaa' }}>–</em>}
                                                    </td>

                                                    {/* Sexe */}
                                                    <td style={{ textAlign: 'center', padding: '10px 10px', background: '#f8fbff', borderLeft: '2px solid #dbeafe' }}>
                                                        <span style={{ fontWeight: 700, fontSize: 14 }}>{total}</span>
                                                    </td>
                                                    <td style={{ padding: '10px 10px', background: '#f8fbff', minWidth: 110 }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                                                            <span style={{ color: '#3b82f6', fontWeight: 600 }}>{hommes}</span>
                                                            <span style={{ color: '#aaa', fontSize: 11 }}>{pctH}%</span>
                                                        </div>
                                                        <div style={{ height: 6, background: '#dbeafe', borderRadius: 3, overflow: 'hidden' }}>
                                                            <div style={{ width: `${pctH}%`, height: '100%', background: '#3b82f6', borderRadius: 3 }} />
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '10px 10px', background: '#f8fbff', minWidth: 110 }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                                                            <span style={{ color: '#ec4899', fontWeight: 600 }}>{femmes}</span>
                                                            <span style={{ color: '#aaa', fontSize: 11 }}>{pctF}%</span>
                                                        </div>
                                                        <div style={{ height: 6, background: '#fce7f3', borderRadius: 3, overflow: 'hidden' }}>
                                                            <div style={{ width: `${pctF}%`, height: '100%', background: '#ec4899', borderRadius: 3 }} />
                                                        </div>
                                                    </td>

                                                    {/* Statuts */}
                                                    <td style={{ padding: '10px 10px', background: '#f0fdf4', borderLeft: '2px solid #bbf7d0', minWidth: 110 }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                                                            <span style={{ color: '#22c55e', fontWeight: 600 }}>{fonctionnaire}</span>
                                                            <span style={{ color: '#aaa', fontSize: 11 }}>{pctFonct}%</span>
                                                        </div>
                                                        <div style={{ height: 6, background: '#bbf7d0', borderRadius: 3, overflow: 'hidden' }}>
                                                            <div style={{ width: `${pctFonct}%`, height: '100%', background: '#22c55e', borderRadius: 3 }} />
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '10px 10px', background: '#fffbeb', minWidth: 90 }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                                                            <span style={{ color: '#f59e0b', fontWeight: 600 }}>{contractuel}</span>
                                                            <span style={{ color: '#aaa', fontSize: 11 }}>{pctCont}%</span>
                                                        </div>
                                                        <div style={{ height: 6, background: '#fde68a', borderRadius: 3, overflow: 'hidden' }}>
                                                            <div style={{ width: `${pctCont}%`, height: '100%', background: '#f59e0b', borderRadius: 3 }} />
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '10px 10px', background: '#f5f3ff', minWidth: 90 }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                                                            <span style={{ color: '#8b5cf6', fontWeight: 600 }}>{article18}</span>
                                                            <span style={{ color: '#aaa', fontSize: 11 }}>{pctArt}%</span>
                                                        </div>
                                                        <div style={{ height: 6, background: '#ddd6fe', borderRadius: 3, overflow: 'hidden' }}>
                                                            <div style={{ width: `${pctArt}%`, height: '100%', background: '#8b5cf6', borderRadius: 3 }} />
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '10px 10px', background: '#f0f9ff', minWidth: 90 }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                                                            <span style={{ color: '#0ea5e9', fontWeight: 600 }}>{bnetd}</span>
                                                            <span style={{ color: '#aaa', fontSize: 11 }}>{pctBnetd}%</span>
                                                        </div>
                                                        <div style={{ height: 6, background: '#bae6fd', borderRadius: 3, overflow: 'hidden' }}>
                                                            <div style={{ width: `${pctBnetd}%`, height: '100%', background: '#0ea5e9', borderRadius: 3 }} />
                                                        </div>
                                                    </td>
                                                    <td style={{ textAlign: 'center', padding: '10px 10px', background: '#f9f9f9', color: '#888' }}>
                                                        {autres > 0 ? <Badge color="secondary">{autres}</Badge> : <span style={{ color: '#ddd' }}>–</span>}
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
                                            <td style={{ textAlign: 'center', padding: '10px 10px', background: '#bbf7d0', color: '#22c55e', borderLeft: '2px solid #86efac' }}>{totals.nb_fonctionnaire}</td>
                                            <td style={{ textAlign: 'center', padding: '10px 10px', background: '#fde68a', color: '#b45309' }}>{totals.nb_contractuel}</td>
                                            <td style={{ textAlign: 'center', padding: '10px 10px', background: '#ddd6fe', color: '#7c3aed' }}>{totals.nb_article_18}</td>
                                            <td style={{ textAlign: 'center', padding: '10px 10px', background: '#bae6fd', color: '#0369a1' }}>{totals.nb_bnetd}</td>
                                            <td style={{ padding: '10px 10px' }}></td>
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

export default AgentsByDirectionReportPage;
