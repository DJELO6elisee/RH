import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
    Card, CardBody, CardHeader,
    Button, Table, Row, Col,
    Input, FormGroup, Label,
    Alert, Spinner, Badge,
    Dropdown, DropdownToggle, DropdownMenu, DropdownItem,
} from 'reactstrap';
import {
    MdFileDownload, MdPictureAsPdf, MdTableChart,
    MdDescription, MdRefresh, MdSwapHoriz, MdSearch, MdFilterList,
} from 'react-icons/md';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { saveAs } from 'file-saver';
import Page from 'components/Page';
import MinistereFilter from 'components/MinistereFilter';

const API_BASE = 'https://tourisme.2ise-groupe.com';

const AgentsMiseADispositionPage = () => {
    const { user } = useAuth();

    // ── Données ──────────────────────────────────────────────────────────────
    const [data, setData]       = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError]     = useState(null);

    // ── Filtres ───────────────────────────────────────────────────────────────
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMinistere, setSelectedMinistere] = useState(
        user?.organization?.type === 'ministere' && user?.organization?.id
            ? user.organization.id : ''
    );
    const [selectedDirGenerale, setSelectedDirGenerale] = useState('');
    const [selectedDirection,   setSelectedDirection]   = useState('');
    const [selectedSousDir,     setSelectedSousDir]     = useState('');

    // ── Listes pour les selects ───────────────────────────────────────────────
    const [dirGenerales, setDirGenerales] = useState([]);
    const [directions,   setDirections]   = useState([]);
    const [sousDirs,     setSousDirs]     = useState([]);

    // ── UI ────────────────────────────────────────────────────────────────────
    const [exportOpen, setExportOpen] = useState(false);
    const [resetKey, setResetKey] = useState(0);

    // ─────────────────────────────────────────────────────────────────────────
    const getAuthHeaders = () => {
        const token = localStorage.getItem('token');
        return { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) };
    };

    // ── Chargement des données ────────────────────────────────────────────────
    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            let url = `${API_BASE}/api/agents/mise-a-disposition?limit=500`;
            if (selectedMinistere)  url += `&id_ministere=${selectedMinistere}`;
            if (selectedDirGenerale) url += `&id_direction_generale=${selectedDirGenerale}`;
            if (selectedDirection)  url += `&id_direction=${selectedDirection}`;
            if (selectedSousDir)    url += `&id_sous_direction=${selectedSousDir}`;

            const res = await fetch(url, { headers: getAuthHeaders() });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const result = await res.json();
            setData(result.success && Array.isArray(result.data) ? result.data : []);
        } catch (err) {
            setError('Erreur de connexion au serveur.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [selectedMinistere, selectedDirGenerale, selectedDirection, selectedSousDir]);

    useEffect(() => { loadData(); }, [loadData]);

    // ── Chargement Directions Générales quand le ministère change ─────────────
    useEffect(() => {
        setSelectedDirGenerale('');
        setSelectedDirection('');
        setSelectedSousDir('');
        setDirGenerales([]);
        setDirections([]);
        setSousDirs([]);

        if (!selectedMinistere) return;
        fetch(`${API_BASE}/api/directions-generales?id_ministere=${selectedMinistere}&limit=200`, { headers: getAuthHeaders() })
            .then(r => r.json())
            .then(r => setDirGenerales(Array.isArray(r.data) ? r.data : Array.isArray(r) ? r : []))
            .catch(console.error);
    }, [selectedMinistere]);

    // ── Chargement Directions quand la DG change ──────────────────────────────
    useEffect(() => {
        setSelectedDirection('');
        setSelectedSousDir('');
        setDirections([]);
        setSousDirs([]);

        if (!selectedDirGenerale) return;
        fetch(`${API_BASE}/api/directions?id_direction_generale=${selectedDirGenerale}&limit=200`, { headers: getAuthHeaders() })
            .then(r => r.json())
            .then(r => setDirections(Array.isArray(r.data) ? r.data : Array.isArray(r) ? r : []))
            .catch(console.error);
    }, [selectedDirGenerale]);

    // ── Chargement Sous-Directions quand la Direction change ──────────────────
    useEffect(() => {
        setSelectedSousDir('');
        setSousDirs([]);

        if (!selectedDirection) return;
        fetch(`${API_BASE}/api/sous-directions?id_direction=${selectedDirection}&limit=200`, { headers: getAuthHeaders() })
            .then(r => r.json())
            .then(r => setSousDirs(Array.isArray(r.data) ? r.data : Array.isArray(r) ? r : []))
            .catch(console.error);
    }, [selectedDirection]);

    // ── Helpers ───────────────────────────────────────────────────────────────
    const formatDate = v => {
        if (!v) return '-';
        const d = new Date(v);
        return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('fr-FR');
    };

    const resetFilters = () => {
        setSelectedMinistere('');
        setSelectedDirGenerale('');
        setSelectedDirection('');
        setSelectedSousDir('');
        setSearchTerm('');
        setResetKey(k => k + 1); // force MinistereFilter à se réinitialiser
    };

    // ── Filtrage côté client (recherche texte seulement) ──────────────────────
    const filteredData = useMemo(() => {
        if (!searchTerm.trim()) return data;
        const t = searchTerm.toLowerCase();
        return data.filter(a =>
            (a.nom || '').toLowerCase().includes(t) ||
            (a.prenom || '').toLowerCase().includes(t) ||
            (a.matricule || '').toLowerCase().includes(t) ||
            (a.direction_libelle || '').toLowerCase().includes(t) ||
            (a.ministere_nom || '').toLowerCase().includes(t)
        );
    }, [data, searchTerm]);

    // ── Export Excel ──────────────────────────────────────────────────────────
    const handleExportExcel = () => {
        const headers = ['Matricule', 'Nom', 'Prénoms', 'Date Naissance',
            'Grade', 'Dir. Générale', 'Direction', 'Sous-Direction',
            'Ministère', 'Date Retrait', 'Motif'];
        const rows = filteredData.map(a => [
            a.matricule || '-', a.nom || '-', a.prenom || '-',
            formatDate(a.date_de_naissance), a.grade_libele || '-',
            a.direction_generale_libelle || '-', a.direction_libelle || '-',
            a.sous_direction_libelle || '-', a.ministere_nom || '-',
            formatDate(a.date_retrait), a.motif_retrait || 'Mise à disposition',
        ]);
        const title = [`Agents Mise à Disposition — ${filteredData.length} agent(s)`, ...Array(headers.length - 1).fill('')];
        const ws = XLSX.utils.aoa_to_sheet([title, [], headers, ...rows]);
        ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: headers.length - 1 } }];
        ws['!cols'] = headers.map(() => ({ wch: 20 }));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Mise à disposition');
        XLSX.writeFile(wb, `AgentsMiseADisposition_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    // ── Export PDF ────────────────────────────────────────────────────────────
    const handleExportPDF = () => {
        if (!filteredData.length) { alert('Aucun agent à exporter.'); return; }
        const doc = new jsPDF('l', 'mm', 'a4');
        const pw = doc.internal.pageSize.getWidth();
        const ph = doc.internal.pageSize.getHeight();
        const genDate = new Date();

        const drawHeader = () => {
            doc.setFontSize(15); doc.setFont(undefined, 'bold'); doc.setTextColor(30, 30, 30);
            doc.text('Agents Mise à Disposition', pw / 2, 18, { align: 'center' });
            doc.setFontSize(9); doc.setFont(undefined, 'normal'); doc.setTextColor(100);
            doc.text(`Généré le ${genDate.toLocaleDateString('fr-FR')} à ${genDate.toLocaleTimeString('fr-FR')}`, pw / 2, 25, { align: 'center' });
            doc.setDrawColor(200); doc.line(20, 29, pw - 20, 29);
        };

        drawHeader();
        let y = 38;
        const cols = ['#', 'Matricule', 'Nom & Prénoms', 'Naissance', 'Grade', 'Direction', 'Ministère', 'Retrait'];
        const colX = [22, 32, 65, 110, 145, 172, 212, 252];

        const drawTH = () => {
            doc.setFillColor(224, 240, 255);
            doc.rect(20, y, pw - 40, 7, 'F');
            doc.setFontSize(7.5); doc.setFont(undefined, 'bold'); doc.setTextColor(0);
            cols.forEach((h, i) => doc.text(h, colX[i], y + 5));
            doc.setDrawColor(180); doc.line(20, y + 7, pw - 20, y + 7);
            y += 9;
        };

        drawTH();
        doc.setFontSize(7); doc.setFont(undefined, 'normal');

        filteredData.forEach((a, idx) => {
            if (y > ph - 22) { doc.addPage(); drawHeader(); y = 38; drawTH(); }
            const nom = `${a.nom || ''} ${a.prenom || ''}`.trim() || '-';
            doc.setTextColor(50);
            doc.text(String(idx + 1), colX[0], y);
            doc.text((a.matricule || '-').substring(0, 12), colX[1], y);
            doc.text(nom.substring(0, 27), colX[2], y);
            doc.text(formatDate(a.date_de_naissance), colX[3], y);
            doc.text((a.grade_libele || '-').substring(0, 12), colX[4], y);
            doc.text((a.direction_libelle || '-').substring(0, 22), colX[5], y);
            doc.text((a.ministere_nom || '-').substring(0, 22), colX[6], y);
            doc.text(formatDate(a.date_retrait), colX[7], y);
            doc.setDrawColor(235); doc.line(20, y + 2, pw - 20, y + 2);
            y += 7;
        });

        const tp = doc.internal.getNumberOfPages();
        for (let i = 1; i <= tp; i++) {
            doc.setPage(i); doc.setFontSize(7); doc.setTextColor(150);
            doc.text(`Page ${i}/${tp}`, pw / 2, ph - 8, { align: 'center' });
        }
        doc.save(`AgentsMiseADisposition_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    // ── Export Word ───────────────────────────────────────────────────────────
    const handleExportWord = () => {
        const rows = filteredData.map(a => {
            const nom = `${a.nom || ''} ${a.prenom || ''}`.trim() || '-';
            return `<tr><td>${a.matricule || '-'}</td><td>${nom}</td><td>${formatDate(a.date_de_naissance)}</td>
                <td>${a.grade_libele || '-'}</td><td>${a.direction_generale_libelle || '-'}</td>
                <td>${a.direction_libelle || '-'}</td><td>${a.sous_direction_libelle || '-'}</td>
                <td>${a.ministere_nom || '-'}</td><td>${formatDate(a.date_retrait)}</td></tr>`;
        }).join('');
        const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office"
            xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
            <head><meta charset="utf-8"/><title>Agents Mise à Disposition</title>
            <style>body{font-family:Arial,sans-serif;margin:20px}h1{text-align:center;font-size:1.3rem}
            table{width:100%;border-collapse:collapse;font-size:.72rem;margin-top:14px}
            th,td{border:1px solid #999;padding:4px}th{background:#f0f0f0;font-weight:bold}
            tr:nth-child(even){background:#fafafa}</style></head>
            <body><h1>Agents Mise à Disposition</h1>
            <p style="text-align:center">Total : ${filteredData.length} agent(s) — ${new Date().toLocaleDateString('fr-FR')}</p>
            <table><thead><tr><th>Matricule</th><th>Nom & Prénoms</th><th>Naissance</th>
            <th>Grade</th><th>Dir. Générale</th><th>Direction</th><th>Sous-Direction</th>
            <th>Ministère</th><th>Date Retrait</th></tr></thead>
            <tbody>${rows || '<tr><td colspan="9" style="text-align:center">Aucun agent</td></tr>'}</tbody>
            </table></body></html>`;
        const blob = new Blob([html], { type: 'application/msword' });
        saveAs(blob, `AgentsMiseADisposition_${new Date().toISOString().split('T')[0]}.doc`);
    };

    // ─────────────────────────────────────────────────────────────────────────
    const hasFilters = selectedMinistere || selectedDirGenerale || selectedDirection || selectedSousDir || searchTerm;

    return (
        <Page
            className="AgentsMiseADispositionPage"
            title="Agents Mise à Disposition"
            breadcrumbs={[{ name: 'Gestion du Personnel', active: false }, { name: 'Agents Mise à Disposition', active: true }]}
            style={{ overflowX: 'hidden' }}
        >
            {/* ── Barre d'outils ── */}
            <Row className="mb-3 align-items-center">
                <Col md={4}>
                    <div className="d-flex align-items-center">
                        <MdSwapHoriz size={28} className="mr-2" style={{ color: '#007bff' }} />
                        <div>
                            <h5 className="mb-0">Agents Mise à Disposition</h5>
                            <small className="text-muted">Agents retirés avec le motif "Mise à disposition"</small>
                        </div>
                    </div>
                </Col>
                <Col md={4}>
                    <FormGroup className="mb-0">
                        <div className="input-group">
                            <div className="input-group-prepend">
                                <span className="input-group-text"><MdSearch /></span>
                            </div>
                            <Input
                                type="text"
                                placeholder="Rechercher par nom, matricule, direction..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </FormGroup>
                </Col>
                <Col md={4} className="d-flex justify-content-end align-items-center">
                    {hasFilters && (
                        <Button color="link" size="sm" className="mr-2 text-danger p-0" onClick={resetFilters}>
                            Réinitialiser les filtres
                        </Button>
                    )}
                    <Button color="secondary" outline size="sm" className="mr-2" onClick={loadData} disabled={loading}>
                        <MdRefresh className="mr-1" />
                        {loading ? 'Chargement...' : 'Actualiser'}
                    </Button>
                    <Dropdown isOpen={exportOpen} toggle={() => setExportOpen(!exportOpen)}>
                        <DropdownToggle caret color="success" size="sm">
                            <MdFileDownload className="mr-1" />Exporter
                        </DropdownToggle>
                        <DropdownMenu right>
                            <DropdownItem onClick={handleExportExcel}><MdTableChart className="mr-1" /> Excel (.xlsx)</DropdownItem>
                            <DropdownItem onClick={handleExportPDF}><MdPictureAsPdf className="mr-1" /> PDF</DropdownItem>
                            <DropdownItem onClick={handleExportWord}><MdDescription className="mr-1" /> Word (.doc)</DropdownItem>
                        </DropdownMenu>
                    </Dropdown>
                </Col>
            </Row>

            {/* ── Filtres ── */}
            <Card className="mb-3" style={{ border: '1px solid #e0e7ff', background: '#f8faff' }}>
                <CardBody className="py-3">
                    <div className="d-flex align-items-center mb-2">
                        <MdFilterList className="mr-1 text-primary" />
                        <strong style={{ fontSize: '0.9rem' }}>Filtres</strong>
                        <Badge color="info" pill className="ml-2">{filteredData.length} agent(s)</Badge>
                    </div>
                    <Row>
                        {/* Ministère — affiché seulement pour super_admin via MinistereFilter */}
                        <Col md={3}>
                            <MinistereFilter
                                key={resetKey}
                                selectedMinistere={selectedMinistere}
                                setSelectedMinistere={setSelectedMinistere}
                            />
                        </Col>

                        {/* Direction Générale */}
                        <Col md={3}>
                            <FormGroup className="mb-0">
                                <Label style={{ fontSize: '0.82rem', fontWeight: 600 }}>Direction Générale</Label>
                                <Input
                                    type="select"
                                    bsSize="sm"
                                    value={selectedDirGenerale}
                                    onChange={e => setSelectedDirGenerale(e.target.value)}
                                    disabled={dirGenerales.length === 0}
                                >
                                    <option value="">— Toutes —</option>
                                    {dirGenerales.map(dg => (
                                        <option key={dg.id} value={dg.id}>
                                            {dg.libelle || dg.nom || dg.libele || `#${dg.id}`}
                                        </option>
                                    ))}
                                </Input>
                            </FormGroup>
                        </Col>

                        {/* Direction */}
                        <Col md={3}>
                            <FormGroup className="mb-0">
                                <Label style={{ fontSize: '0.82rem', fontWeight: 600 }}>Direction</Label>
                                <Input
                                    type="select"
                                    bsSize="sm"
                                    value={selectedDirection}
                                    onChange={e => setSelectedDirection(e.target.value)}
                                    disabled={directions.length === 0}
                                >
                                    <option value="">— Toutes —</option>
                                    {directions.map(d => (
                                        <option key={d.id} value={d.id}>
                                            {d.libelle || d.nom || `#${d.id}`}
                                        </option>
                                    ))}
                                </Input>
                            </FormGroup>
                        </Col>

                        {/* Sous-Direction */}
                        <Col md={3}>
                            <FormGroup className="mb-0">
                                <Label style={{ fontSize: '0.82rem', fontWeight: 600 }}>Sous-Direction</Label>
                                <Input
                                    type="select"
                                    bsSize="sm"
                                    value={selectedSousDir}
                                    onChange={e => setSelectedSousDir(e.target.value)}
                                    disabled={sousDirs.length === 0}
                                >
                                    <option value="">— Toutes —</option>
                                    {sousDirs.map(sd => (
                                        <option key={sd.id} value={sd.id}>
                                            {sd.libelle || sd.nom || `#${sd.id}`}
                                        </option>
                                    ))}
                                </Input>
                            </FormGroup>
                        </Col>
                    </Row>
                </CardBody>
            </Card>

            {/* ── Erreur ── */}
            {error && <Alert color="danger" className="mb-3">{error}</Alert>}

            {/* ── Tableau ── */}
            <Card>
                <CardHeader className="d-flex justify-content-between align-items-center">
                    <strong>Liste des Agents Mise à Disposition</strong>
                    <Badge color="warning" pill>{filteredData.length}</Badge>
                </CardHeader>
                <CardBody className="p-0">
                    {loading ? (
                        <div className="d-flex justify-content-center align-items-center py-5">
                            <Spinner color="primary" />
                            <span className="ml-2">Chargement des données...</span>
                        </div>
                    ) : filteredData.length === 0 ? (
                        <div className="text-center py-5 text-muted">
                            <MdSwapHoriz size={48} className="mb-2 d-block mx-auto" />
                            <p>Aucun agent avec le motif "Mise à disposition" trouvé.</p>
                        </div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <Table striped hover responsive size="sm" className="mb-0">
                                <thead className="thead-light">
                                    <tr>
                                        <th>#</th>
                                        <th>Matricule</th>
                                        <th>Nom</th>
                                        <th>Prénoms</th>
                                        <th>Date Naissance</th>
                                        <th>Grade</th>
                                        <th>Dir. Générale</th>
                                        <th>Direction</th>
                                        <th>Sous-Direction</th>
                                        <th>Ministère</th>
                                        <th>Date Retrait</th>
                                        <th>Motif</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredData.map((agent, index) => (
                                        <tr key={agent.id || agent.matricule || index}>
                                            <td>{index + 1}</td>
                                            <td><strong>{agent.matricule || '-'}</strong></td>
                                            <td>{agent.nom || '-'}</td>
                                            <td>{agent.prenom || '-'}</td>
                                            <td>{formatDate(agent.date_de_naissance)}</td>
                                            <td>{agent.grade_libele || '-'}</td>
                                            <td>{agent.direction_generale_libelle || '-'}</td>
                                            <td>{agent.direction_libelle || '-'}</td>
                                            <td>{agent.sous_direction_libelle || '-'}</td>
                                            <td>{agent.ministere_nom || '-'}</td>
                                            <td>{formatDate(agent.date_retrait)}</td>
                                            <td>
                                                <Badge color="warning" pill>
                                                    {agent.motif_retrait || 'Mise à disposition'}
                                                </Badge>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </div>
                    )}
                </CardBody>
            </Card>
        </Page>
    );
};

export default AgentsMiseADispositionPage;
