import React, { useState, useEffect } from 'react';
import {
    Card, CardBody, CardHeader, CardTitle,
    Button, Spinner, Alert, Table, Input, Label, FormGroup
} from 'reactstrap';
import { MdPrint, MdFileDownload, MdRefresh } from 'react-icons/md';
import * as XLSX from 'xlsx';

const PointAgentsReportPage = () => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    const currentTrimester = Math.floor(currentMonth / 3) + 1;

    const [selectedAnnee, setSelectedAnnee] = useState(currentYear);
    const [selectedTrimestre, setSelectedTrimestre] = useState(currentTrimester);

    const fetchPointData = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const apiUrl = process.env.REACT_APP_SOURCE_URL || '';
            const response = await fetch(`${apiUrl}/api/agents/statistiques-point?annee=${selectedAnnee}&trimestre=${selectedTrimestre}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error('Erreur lors du chargement des statistiques');
            }

            const result = await response.json();
            if (result.success) {
                const ORDRE_STRUCTURES_MTL = [
                    'CABINET',
                    'INSPECTION GENERALE DU TOURISME ET DES LOISIRS',
                    'DIRECTION DE LA COMMUNICATION ET DE LA DOCUMENTATION',
                    'DIRECTION DU GUICHET UNIQUE',
                    'DIRECTION DES AFFAIRES JURIDIQUES ET DU CONTENTIEUX',
                    'DIRECTION DES AFFAIRES FINANCIERES',
                    'DIRECTION DES RESSOURCES HUMAINES',
                    'DIRECTION DE LA PLANIFICATION, DES STATISTIQUES ET DES PROJETS',
                    'DIRECTION DE LA SECURITE TOURISTIQUE ET DES LOISIRS',
                    'DIRECTION DE L\' INFORMATIQUE, DE LA DIGITALISATION ET DU DEVELOPPEMENT DES STARTUPS',
                    'CELLULE DE PASSATION DES MARCHES PUBLICSS',
                    'GESTIONNAIRE DU PATRIMOINEE',
                    'DIRECTION GENERALE DE L\'INDUSTRIE TOURISTIQUE ET HOTELIERE',
                    'DIRECTION DES ACTIVITES TOURISTIQUES',
                    'DIRECTION DE LA COOPERATION ET DE LA PROFESSIONNALISATION',
                    'DIRECTION DES SERVICES EXTERIEURS',
                    'DIRECTION GENERALE DES LOISIRS',
                    'DIRECTION DES PARCS DE LOISIRS, D\'ATTRACTION ET DES JEUX NUMERIQUES',
                    'DIRECTION DE LA  VALORISATION, DE LA FORMATION ET DE LA PROMOTION DES JEUX TRADITIONNELS',
                    'DIRECTION REGIONALE D\'ABIDJAN NORD',
                    'DIRECTION DEPARTEMENTALE D\'ABIDJAN NORD 1',
                    'DIRECTION DEPARTEMENTALE  DE DABOU',
                    'DIRECTION REGIONALE D\'ABIDJAN SUD',
                    'DIRECTION DEPARTEMENTALE D\'ABIDJAN SUD 1',
                    'DIRECTION REGIONALE DE GRAND-BASSAM',
                    'DIRECTION DEPARTEMENTALE D\'ADZOPE',
                    'DIRECTION DEPARTEMENTALE D\'AGBOVILLE',
                    'DIRECTION REGIONALE D\'ABENGOUROU',
                    'DIRECTION DEPARTEMENTALE DE DAOUKRO',
                    'DIRECTION REGIONALE DE BOUAKE',
                    'DIRECTION DEPARTEMENTALE DE KATIOLA',
                    'DIRECTION REGIONALE DE BONDOUKOU',
                    'DIRECTION DEPARTEMENTALE DE BOUNA',
                    'DIRECTION REGIONALE DE DALOA',
                    'DIRECTION DEPARTEMENTALE DE GAGNOA',
                    'DIRECTION DEPARTEMENTALE DE DIVO',
                    'DIRECTION REGIONALE DE MAN',
                    'DIRECTION DEPARTEMENTALE DE GUIGLO',
                    'DIRECTION DEPARTEMENTALE DE DANANE',
                    'DIRECTION REGIONALE DE SAN-PEDRO',
                    'DIRECTION DEPARTEMENTALE DE SOUBRE',
                    'DIRECTION DEPARTEMENTALE DE SASSANDRA',
                    'DIRECTION REGIONALE DE KORHOGO',
                    'DIRECTION DEPARTEMENTALE DE BOUNDIALI',
                    'DIRECTION DEPARTEMENTALE DE FERKESSEDOUGOU',
                    'DIRECTION REGIONALE D\'ODIENNE',
                    'DIRECTION DEPARTEMENTALE DE TOUBA',
                    'DIRECTION REGIONALE DE YAMOUSSOUKRO',
                    'DIRECTION DEPARTEMENTALE DE DIMBOKRO',
                    'DIRECTION DEPARTEMENTALE DE BOUAFLE',
                    'DIRECTION REGIONALE DE SEGUELA',
                    'DIRECTION DEPARTEMENTALE DE MANKONO',
                    'BUREAU DE PARIS (FRANCE)',
                    'BUREAU DE MILAN (ITALIE)',
                    'BUREAU DE LONDRES (ROYAUME-UNI)',
                    'BUREAU DE BERLIN (ALLEMAGNE)',
                    'BUREAU DE GENEVE (SUISSE)',
                    'BUREAU DE MADRID (ESPAGNE)',
                    'BUREAU DE WASHINGTON (ETATS-UNIS)',
                    'BUREAU DE LAGOS (NIGERIA)',
                    'BUREAU DE BEIJING (CHINE)',
                    'BUREAU DE PRETORIA (AFRIQUE DU SUD)',
                    'BUREAU DE RIO DE JANEIRO (BRESIL)',
                    'BUREAU DE RABAT (MAROC)',
                    'BUREAU DE OTTAWA (CANADA)',
                    'BUREAU DE DOHA (QATAR)',
                    'CONSEIL NATIONAL DU TOURISME',
                    'FONDS DE DEVELOPPEMENT TOURISTIQUE',
                    'DIRECTION GENERALE DE COTE D\'IVOIRE TOURISME',
                    'DIRECTION DES RELATIONS EXTERIEURES',
                    'DIRECTION DU BUDGET, DES FINANCES ET DES MOYENS GENERAUX',
                    'DIRECTION DU MARKETING, DE LA COMMUNICATION ET DES TIC',
                    'DIRECTION DES RESSOURCES HUMAINES, DE LA FORMATION ET DU PERFECTIONNEMENT',
                    'INSTANCE D\'AFFECTATION'
                ];

                const normalizeStructureName = (name) => {
                    if (!name) return '';
                    return String(name).toUpperCase().trim()
                        .replace(/\s+/g, ' ')
                        .replace(/D'/g, 'DE ')
                        .replace(/\s*'\s*/g, "'");
                };

                const normalizeForOrder = (str) => {
                    if (!str) return '';
                    return normalizeStructureName(str).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                };

                const getOrderIndex = (name) => {
                    const normalized = normalizeForOrder(name);
                    if (!normalized) return 9999;
                    const idx = ORDRE_STRUCTURES_MTL.findIndex(item => normalizeForOrder(item) === normalized);
                    if (idx >= 0) return idx;
                    if (normalized.includes('INSPECTION') && normalized.includes('GENERALE')) return 1;
                    return 9999;
                };

                const sortedServices = result.data.services.sort((a, b) => {
                    const orderA = getOrderIndex(a.nom);
                    const orderB = getOrderIndex(b.nom);
                    if (orderA !== orderB) return orderA - orderB;
                    return (a.nom || '').localeCompare(b.nom || '', 'fr');
                });

                setData(sortedServices);
            } else {
                throw new Error(result.message || 'Erreur inconnue');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPointData();
    }, [selectedAnnee, selectedTrimestre]);

    const handlePrint = () => {
        const printContent = document.getElementById('print-area').innerHTML;
        const originalContent = document.body.innerHTML;

        document.body.innerHTML = printContent;
        window.print();
        document.body.innerHTML = originalContent;
        window.location.reload(); // To rebind react events
    };

    const handleExportExcel = () => {
        // Table 1: Fonctionnaires (Manually build AOA for better formatting)
        const ws1Data = [];
        // Headers
        ws1Data.push(['SERVICE', 'CATEGORIE A', '', '', '', '', '', '', '', 'CATEGORIE B', '', '', '', '', '', 'CATEGORIE C', '', '', '', '', '', 'CATEGORIE D', '', 'Total Fonct.', '']);
        ws1Data.push(['', 'A5-7', '', 'A4', '', 'A3', '', 'TOT.', '', 'B3', '', 'B1', '', 'TOT.', '', 'C2', '', 'C1', '', 'TOT.', '', 'D1', '', '', '']);
        ws1Data.push(['', 'F', 'H', 'F', 'H', 'F', 'H', 'F', 'H', 'F', 'H', 'F', 'H', 'F', 'H', 'F', 'H', 'F', 'H', 'F', 'H', 'F', 'H', 'F', 'H']);
        
        // Data rows
        data.forEach(s => {
            ws1Data.push([
                s.nom,
                s.fonctionnaires.A.A5_7.F || 0, s.fonctionnaires.A.A5_7.H || 0,
                s.fonctionnaires.A.A4.F || 0, s.fonctionnaires.A.A4.H || 0,
                s.fonctionnaires.A.A3.F || 0, s.fonctionnaires.A.A3.H || 0,
                s.fonctionnaires.A.TOT.F || 0, s.fonctionnaires.A.TOT.H || 0,
                s.fonctionnaires.B.B3.F || 0, s.fonctionnaires.B.B3.H || 0,
                s.fonctionnaires.B.B1.F || 0, s.fonctionnaires.B.B1.H || 0,
                s.fonctionnaires.B.TOT.F || 0, s.fonctionnaires.B.TOT.H || 0,
                s.fonctionnaires.C.C2.F || 0, s.fonctionnaires.C.C2.H || 0,
                s.fonctionnaires.C.C1.F || 0, s.fonctionnaires.C.C1.H || 0,
                s.fonctionnaires.C.TOT.F || 0, s.fonctionnaires.C.TOT.H || 0,
                s.fonctionnaires.D.D1.F || 0, s.fonctionnaires.D.D1.H || 0,
                s.fonctionnaires.TOTAL.F || 0, s.fonctionnaires.TOTAL.H || 0
            ]);
        });

        // Totals
        ws1Data.push([
            'TOTAL',
            sumF(data, 'A', 'A5_7'), sumH(data, 'A', 'A5_7'),
            sumF(data, 'A', 'A4'), sumH(data, 'A', 'A4'),
            sumF(data, 'A', 'A3'), sumH(data, 'A', 'A3'),
            sumF(data, 'A', 'TOT'), sumH(data, 'A', 'TOT'),
            sumF(data, 'B', 'B3'), sumH(data, 'B', 'B3'),
            sumF(data, 'B', 'B1'), sumH(data, 'B', 'B1'),
            sumF(data, 'B', 'TOT'), sumH(data, 'B', 'TOT'),
            sumF(data, 'C', 'C2'), sumH(data, 'C', 'C2'),
            sumF(data, 'C', 'C1'), sumH(data, 'C', 'C1'),
            sumF(data, 'C', 'TOT'), sumH(data, 'C', 'TOT'),
            sumF(data, 'D', 'D1'), sumH(data, 'D', 'D1'),
            sumF(data, 'TOTAL', 'F'), sumH(data, 'TOTAL', 'H')
        ]);
        
        ws1Data.push([
            'TOTAL GEN.',
            (sumF(data, 'A', 'TOT') + sumH(data, 'A', 'TOT')), '', '', '', '', '', '', '',
            (sumF(data, 'B', 'TOT') + sumH(data, 'B', 'TOT')), '', '', '', '', '',
            (sumF(data, 'C', 'TOT') + sumH(data, 'C', 'TOT')), '', '', '', '', '',
            (sumF(data, 'D', 'D1') + sumH(data, 'D', 'D1')), '',
            (sumF(data, 'TOTAL', 'F') + sumH(data, 'TOTAL', 'H')), ''
        ]);

        const ws1 = XLSX.utils.aoa_to_sheet(ws1Data);
        ws1['!cols'] = [{ wch: 60 }].concat(Array(24).fill({ wch: 8 }));
        // Merges for headers
        ws1['!merges'] = [
            { s: { r: 0, c: 1 }, e: { r: 0, c: 8 } }, // CAT A
            { s: { r: 0, c: 9 }, e: { r: 0, c: 14 } }, // CAT B
            { s: { r: 0, c: 15 }, e: { r: 0, c: 20 } }, // CAT C
            { s: { r: 0, c: 21 }, e: { r: 0, c: 22 } }, // CAT D
            { s: { r: 0, c: 23 }, e: { r: 1, c: 24 } }, // Total Fonct.
            { s: { r: 0, c: 0 }, e: { r: 2, c: 0 } }, // SERVICE
            { s: { r: 1, c: 1 }, e: { r: 1, c: 2 } }, // A5-7
            { s: { r: 1, c: 3 }, e: { r: 1, c: 4 } }, // A4
            { s: { r: 1, c: 5 }, e: { r: 1, c: 6 } }, // A3
            { s: { r: 1, c: 7 }, e: { r: 1, c: 8 } }, // TOT A
            { s: { r: 1, c: 9 }, e: { r: 1, c: 10 } }, // B3
            { s: { r: 1, c: 11 }, e: { r: 1, c: 12 } }, // B1
            { s: { r: 1, c: 13 }, e: { r: 1, c: 14 } }, // TOT B
            { s: { r: 1, c: 15 }, e: { r: 1, c: 16 } }, // C2
            { s: { r: 1, c: 17 }, e: { r: 1, c: 18 } }, // C1
            { s: { r: 1, c: 19 }, e: { r: 1, c: 20 } }, // TOT C
            { s: { r: 1, c: 21 }, e: { r: 1, c: 22 } }, // D1
        ];

        // Table 2: Non Fonctionnaires
        const ws2Data = [];
        ws2Data.push(['SERVICE', 'ART 18', '', 'EXP.', '', 'Contr.', '', 'TOTAL', '', 'TOTAL GEN']);
        ws2Data.push(['', 'F', 'H', 'F', 'H', 'F', 'H', 'F', 'H', '']);
        
        data.forEach(s => {
            ws2Data.push([
                s.nom,
                s.nonFonctionnaires.ART18.F || 0, s.nonFonctionnaires.ART18.H || 0,
                s.nonFonctionnaires.EXP.F || 0, s.nonFonctionnaires.EXP.H || 0,
                s.nonFonctionnaires.CONTR.F || 0, s.nonFonctionnaires.CONTR.H || 0,
                s.nonFonctionnaires.TOTAL.F || 0, s.nonFonctionnaires.TOTAL.H || 0,
                (s.nonFonctionnaires.TOTAL.F + s.nonFonctionnaires.TOTAL.H) || 0
            ]);
        });

        ws2Data.push([
            'TOTAL',
            sumNfF(data, 'ART18'), sumNfH(data, 'ART18'),
            sumNfF(data, 'EXP'), sumNfH(data, 'EXP'),
            sumNfF(data, 'CONTR'), sumNfH(data, 'CONTR'),
            sumNfF(data, 'TOTAL'), sumNfH(data, 'TOTAL'),
            sumNfF(data, 'TOTAL') + sumNfH(data, 'TOTAL')
        ]);

        ws2Data.push([
            'TOTAL GEN.',
            (sumNfF(data, 'ART18') + sumNfH(data, 'ART18')), '',
            (sumNfF(data, 'EXP') + sumNfH(data, 'EXP')), '',
            (sumNfF(data, 'CONTR') + sumNfH(data, 'CONTR')), '',
            (sumNfF(data, 'TOTAL') + sumNfH(data, 'TOTAL')), '', ''
        ]);

        const ws2 = XLSX.utils.aoa_to_sheet(ws2Data);
        ws2['!cols'] = [{ wch: 60 }].concat(Array(9).fill({ wch: 10 }));
        ws2['!merges'] = [
            { s: { r: 0, c: 0 }, e: { r: 1, c: 0 } }, // SERVICE
            { s: { r: 0, c: 1 }, e: { r: 0, c: 2 } }, // ART 18
            { s: { r: 0, c: 3 }, e: { r: 0, c: 4 } }, // EXP
            { s: { r: 0, c: 5 }, e: { r: 0, c: 6 } }, // Contr
            { s: { r: 0, c: 7 }, e: { r: 0, c: 8 } }, // TOTAL
            { s: { r: 0, c: 9 }, e: { r: 1, c: 9 } }, // TOTAL GEN
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws1, 'Fonctionnaires');
        XLSX.utils.book_append_sheet(wb, ws2, 'Non Fonctionnaires');
        
        XLSX.writeFile(wb, `Point_Agents_${selectedAnnee}_T${selectedTrimestre}.xlsx`);
    };

    // These are now handled by state directly

    // Helper functions to sum totals
    const sumF = (services, key1, key2, key3) => {
        return services.reduce((acc, s) => {
            if (key1 === 'TOTAL') return acc + (s.fonctionnaires?.TOTAL?.F || 0);
            const val = key3 ? s.fonctionnaires?.[key1]?.[key2]?.[key3]?.F : s.fonctionnaires?.[key1]?.[key2]?.F;
            return acc + (val || 0);
        }, 0);
    };
    const sumH = (services, key1, key2, key3) => {
        return services.reduce((acc, s) => {
            if (key1 === 'TOTAL') return acc + (s.fonctionnaires?.TOTAL?.H || 0);
            const val = key3 ? s.fonctionnaires?.[key1]?.[key2]?.[key3]?.H : s.fonctionnaires?.[key1]?.[key2]?.H;
            return acc + (val || 0);
        }, 0);
    };
    const sumNfF = (services, key) => services.reduce((acc, s) => acc + s.nonFonctionnaires[key].F, 0);
    const sumNfH = (services, key) => services.reduce((acc, s) => acc + s.nonFonctionnaires[key].H, 0);

    return (
        <div style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: 24, fontWeight: '600', color: '#1e293b', margin: 0 }}>
                    États et Rapports - Point des Agents
                </h2>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                    <FormGroup style={{ marginBottom: 0, marginRight: 15, display: 'flex', alignItems: 'center' }}>
                        <Label style={{ marginRight: 10, fontWeight: 'bold' }}>Trimestre :</Label>
                        <Input type="select" value={selectedTrimestre} onChange={e => setSelectedTrimestre(e.target.value)} style={{ width: 'auto' }}>
                            <option value={1}>1er Trimestre</option>
                            <option value={2}>2ème Trimestre</option>
                            <option value={3}>3ème Trimestre</option>
                            <option value={4}>4ème Trimestre</option>
                        </Input>
                    </FormGroup>
                    <FormGroup style={{ marginBottom: 0, marginRight: 20, display: 'flex', alignItems: 'center' }}>
                        <Label style={{ marginRight: 10, fontWeight: 'bold' }}>Année :</Label>
                        <Input type="select" value={selectedAnnee} onChange={e => setSelectedAnnee(e.target.value)} style={{ width: 'auto' }}>
                            {[...Array(11)].map((_, i) => {
                                const year = new Date().getFullYear() - 5 + i;
                                return <option key={year} value={year}>{year}</option>;
                            })}
                        </Input>
                    </FormGroup>
                    
                    <Button color="secondary" outline onClick={fetchPointData} style={{ marginRight: 10 }}>
                        <MdRefresh size={18} style={{ marginRight: 5 }} />
                        Actualiser
                    </Button>
                    <Button color="primary" onClick={handlePrint} style={{ marginRight: 10 }}>
                        <MdPrint size={18} style={{ marginRight: 5 }} />
                        Imprimer
                    </Button>
                    <Button color="success" onClick={handleExportExcel}>
                        <MdFileDownload size={18} style={{ marginRight: 5 }} />
                        Exporter Excel
                    </Button>
                </div>
            </div>

            {loading && (
                <div style={{ textAlign: 'center', padding: 60 }}>
                    <Spinner color="primary" />
                    <p style={{ color: '#888', marginTop: 12 }}>Chargement des statistiques...</p>
                </div>
            )}

            {error && <Alert color="danger">{error}</Alert>}

            {!loading && !error && (
                <div id="print-area" className="print-container" style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                    <h4 style={{ marginBottom: 15, fontWeight: 'bold' }}>Point des fonctionnaires {selectedTrimestre}<sup>{parseInt(selectedTrimestre)===1?'er':'ème'}</sup> Trimestre {selectedAnnee} :</h4>
                    <div style={{ overflowX: 'auto', marginBottom: 40 }}>
                        <Table bordered id="table-fonctionnaires" size="sm" style={{ fontSize: 11, textAlign: 'center', verticalAlign: 'middle' }}>
                            <thead style={{ backgroundColor: '#f3f4f6' }}>
                                <tr>
                                    <th rowSpan="3" style={{ verticalAlign: 'middle' }}>SERVICE</th>
                                    <th colSpan="8">CATEGORIE A</th>
                                    <th colSpan="6">CATEGORIE B</th>
                                    <th colSpan="6">CATEGORIE C</th>
                                    <th colSpan="2">CATEGORIE D</th>
                                    <th rowSpan="2" colSpan="2" style={{ verticalAlign: 'middle' }}>Total Fonct.</th>
                                </tr>
                                <tr>
                                    <th colSpan="2">A5-7</th>
                                    <th colSpan="2">A4</th>
                                    <th colSpan="2">A3</th>
                                    <th colSpan="2">TOT.</th>
                                    
                                    <th colSpan="2">B3</th>
                                    <th colSpan="2">B1</th>
                                    <th colSpan="2">TOT.</th>
                                    
                                    <th colSpan="2">C2</th>
                                    <th colSpan="2">C1</th>
                                    <th colSpan="2">TOT.</th>
                                    
                                    <th colSpan="2">D1</th>
                                </tr>
                                <tr style={{ backgroundColor: '#fef3c7' }}>
                                    <th>F</th><th>H</th> <th>F</th><th>H</th> <th>F</th><th>H</th> <th style={{fontWeight:'bold'}}>F</th><th style={{fontWeight:'bold'}}>H</th>
                                    <th>F</th><th>H</th> <th>F</th><th>H</th> <th style={{fontWeight:'bold'}}>F</th><th style={{fontWeight:'bold'}}>H</th>
                                    <th>F</th><th>H</th> <th>F</th><th>H</th> <th style={{fontWeight:'bold'}}>F</th><th style={{fontWeight:'bold'}}>H</th>
                                    <th>F</th><th>H</th>
                                    <th style={{fontWeight:'bold'}}>F</th><th style={{fontWeight:'bold'}}>H</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.map((s, idx) => (
                                    <tr key={idx}>
                                        <td style={{ textAlign: 'left', fontWeight: 'bold' }}>{s.nom}</td>
                                        <td>{s.fonctionnaires.A.A5_7.F || ''}</td>
                                        <td>{s.fonctionnaires.A.A5_7.H || ''}</td>
                                        <td>{s.fonctionnaires.A.A4.F || ''}</td>
                                        <td>{s.fonctionnaires.A.A4.H || ''}</td>
                                        <td>{s.fonctionnaires.A.A3.F || ''}</td>
                                        <td>{s.fonctionnaires.A.A3.H || ''}</td>
                                        <td style={{ backgroundColor: '#f1f5f9', fontWeight: 'bold' }}>{s.fonctionnaires.A.TOT.F || ''}</td>
                                        <td style={{ backgroundColor: '#f1f5f9', fontWeight: 'bold' }}>{s.fonctionnaires.A.TOT.H || ''}</td>

                                        <td>{s.fonctionnaires.B.B3.F || ''}</td>
                                        <td>{s.fonctionnaires.B.B3.H || ''}</td>
                                        <td>{s.fonctionnaires.B.B1.F || ''}</td>
                                        <td>{s.fonctionnaires.B.B1.H || ''}</td>
                                        <td style={{ backgroundColor: '#f1f5f9', fontWeight: 'bold' }}>{s.fonctionnaires.B.TOT.F || ''}</td>
                                        <td style={{ backgroundColor: '#f1f5f9', fontWeight: 'bold' }}>{s.fonctionnaires.B.TOT.H || ''}</td>

                                        <td>{s.fonctionnaires.C.C2.F || ''}</td>
                                        <td>{s.fonctionnaires.C.C2.H || ''}</td>
                                        <td>{s.fonctionnaires.C.C1.F || ''}</td>
                                        <td>{s.fonctionnaires.C.C1.H || ''}</td>
                                        <td style={{ backgroundColor: '#f1f5f9', fontWeight: 'bold' }}>{s.fonctionnaires.C.TOT.F || ''}</td>
                                        <td style={{ backgroundColor: '#f1f5f9', fontWeight: 'bold' }}>{s.fonctionnaires.C.TOT.H || ''}</td>

                                        <td>{s.fonctionnaires.D.D1.F || ''}</td>
                                        <td>{s.fonctionnaires.D.D1.H || ''}</td>

                                        <td style={{ backgroundColor: '#e2e8f0', fontWeight: 'bold' }}>{s.fonctionnaires.TOTAL.F || ''}</td>
                                        <td style={{ backgroundColor: '#e2e8f0', fontWeight: 'bold' }}>{s.fonctionnaires.TOTAL.H || ''}</td>
                                    </tr>
                                ))}
                                
                                <tr style={{ backgroundColor: '#fed7aa', fontWeight: 'bold' }}>
                                    <td style={{ textAlign: 'left' }}>TOTAL</td>
                                    <td>{sumF(data, 'A', 'A5_7')}</td><td>{sumH(data, 'A', 'A5_7')}</td>
                                    <td>{sumF(data, 'A', 'A4')}</td><td>{sumH(data, 'A', 'A4')}</td>
                                    <td>{sumF(data, 'A', 'A3')}</td><td>{sumH(data, 'A', 'A3')}</td>
                                    <td>{sumF(data, 'A', 'TOT')}</td><td>{sumH(data, 'A', 'TOT')}</td>

                                    <td>{sumF(data, 'B', 'B3')}</td><td>{sumH(data, 'B', 'B3')}</td>
                                    <td>{sumF(data, 'B', 'B1')}</td><td>{sumH(data, 'B', 'B1')}</td>
                                    <td>{sumF(data, 'B', 'TOT')}</td><td>{sumH(data, 'B', 'TOT')}</td>

                                    <td>{sumF(data, 'C', 'C2')}</td><td>{sumH(data, 'C', 'C2')}</td>
                                    <td>{sumF(data, 'C', 'C1')}</td><td>{sumH(data, 'C', 'C1')}</td>
                                    <td>{sumF(data, 'C', 'TOT')}</td><td>{sumH(data, 'C', 'TOT')}</td>

                                    <td>{sumF(data, 'D', 'D1')}</td><td>{sumH(data, 'D', 'D1')}</td>

                                    <td>{sumF(data, 'TOTAL', 'F')}</td><td>{sumH(data, 'TOTAL', 'H')}</td>
                                </tr>
                                <tr style={{ backgroundColor: '#fb923c', color: 'white', fontWeight: 'bold', fontSize: 13 }}>
                                    <td style={{ textAlign: 'left' }}>TOTAL GEN.</td>
                                    <td colSpan="8">{sumF(data, 'A', 'TOT') + sumH(data, 'A', 'TOT')}</td>
                                    <td colSpan="6">{sumF(data, 'B', 'TOT') + sumH(data, 'B', 'TOT')}</td>
                                    <td colSpan="6">{sumF(data, 'C', 'TOT') + sumH(data, 'C', 'TOT')}</td>
                                    <td colSpan="2">{sumF(data, 'D', 'D1') + sumH(data, 'D', 'D1')}</td>
                                    <td colSpan="2">{sumF(data, 'TOTAL', 'F') + sumH(data, 'TOTAL', 'H')}</td>
                                </tr>
                            </tbody>
                        </Table>
                    </div>

                    <h4 style={{ marginBottom: 15, fontWeight: 'bold' }}>Point des non fonctionnaires {selectedTrimestre}<sup>{parseInt(selectedTrimestre)===1?'er':'ème'}</sup> Trimestre {selectedAnnee} :</h4>
                    <div style={{ overflowX: 'auto' }}>
                        <Table bordered id="table-non-fonctionnaires" size="sm" style={{ fontSize: 11, textAlign: 'center', verticalAlign: 'middle', width: '60%' }}>
                            <thead style={{ backgroundColor: '#f3f4f6' }}>
                                <tr>
                                    <th rowSpan="2" style={{ verticalAlign: 'middle' }}>SERVICE</th>
                                    <th colSpan="2">ART 18</th>
                                    <th colSpan="2">EXP.</th>
                                    <th colSpan="2" style={{ backgroundColor: '#d97706', color: 'white' }}>Contr.</th>
                                    <th colSpan="2">TOTAL</th>
                                    <th rowSpan="2" style={{ verticalAlign: 'middle' }}>TOTAL</th>
                                </tr>
                                <tr style={{ backgroundColor: '#fef3c7' }}>
                                    <th>F</th><th>H</th>
                                    <th>F</th><th>H</th>
                                    <th>F</th><th>H</th>
                                    <th>F</th><th>H</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.map((s, idx) => (
                                    <tr key={idx}>
                                        <td style={{ textAlign: 'left', fontWeight: 'bold' }}>{s.nom}</td>
                                        <td>{s.nonFonctionnaires.ART18.F || ''}</td>
                                        <td>{s.nonFonctionnaires.ART18.H || ''}</td>
                                        
                                        <td>{s.nonFonctionnaires.EXP.F || ''}</td>
                                        <td>{s.nonFonctionnaires.EXP.H || ''}</td>
                                        
                                        <td>{s.nonFonctionnaires.CONTR.F || ''}</td>
                                        <td>{s.nonFonctionnaires.CONTR.H || ''}</td>
                                        
                                        <td style={{ backgroundColor: '#f1f5f9', fontWeight: 'bold' }}>{s.nonFonctionnaires.TOTAL.F || ''}</td>
                                        <td style={{ backgroundColor: '#f1f5f9', fontWeight: 'bold' }}>{s.nonFonctionnaires.TOTAL.H || ''}</td>
                                        
                                        <td style={{ backgroundColor: '#e2e8f0', fontWeight: 'bold' }}>
                                            {(s.nonFonctionnaires.TOTAL.F + s.nonFonctionnaires.TOTAL.H) || ''}
                                        </td>
                                    </tr>
                                ))}
                                
                                <tr style={{ backgroundColor: '#fed7aa', fontWeight: 'bold' }}>
                                    <td style={{ textAlign: 'left' }}>TOTAL</td>
                                    <td>{sumNfF(data, 'ART18')}</td><td>{sumNfH(data, 'ART18')}</td>
                                    <td>{sumNfF(data, 'EXP')}</td><td>{sumNfH(data, 'EXP')}</td>
                                    <td>{sumNfF(data, 'CONTR')}</td><td>{sumNfH(data, 'CONTR')}</td>
                                    <td>{sumNfF(data, 'TOTAL')}</td><td>{sumNfH(data, 'TOTAL')}</td>
                                    <td style={{ backgroundColor: '#e2e8f0' }}>{sumNfF(data, 'TOTAL') + sumNfH(data, 'TOTAL')}</td>
                                </tr>
                                <tr style={{ backgroundColor: '#fcd34d', fontWeight: 'bold', fontSize: 13 }}>
                                    <td style={{ textAlign: 'left' }}>TOTAL GEN.</td>
                                    <td colSpan="2">{sumNfF(data, 'ART18') + sumNfH(data, 'ART18')}</td>
                                    <td colSpan="2">{sumNfF(data, 'EXP') + sumNfH(data, 'EXP')}</td>
                                    <td colSpan="2">{sumNfF(data, 'CONTR') + sumNfH(data, 'CONTR')}</td>
                                    <td colSpan="3" style={{ textAlign: 'center', backgroundColor: '#f59e0b', color: 'white' }}>
                                        {sumNfF(data, 'TOTAL') + sumNfH(data, 'TOTAL')}
                                    </td>
                                </tr>
                            </tbody>
                        </Table>
                    </div>

                </div>
            )}
        </div>
    );
};

export default PointAgentsReportPage;
