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
                const sortedServices = result.data.services.sort((a, b) => {
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
        // Table 1: Fonctionnaires
        const table1 = document.getElementById('table-fonctionnaires');
        const ws1 = XLSX.utils.table_to_sheet(table1);
        ws1['!cols'] = [{ wch: 50 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }]; 
        
        // Table 2: Non Fonctionnaires
        const table2 = document.getElementById('table-non-fonctionnaires');
        const ws2 = XLSX.utils.table_to_sheet(table2);
        ws2['!cols'] = [{ wch: 50 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 10 }]; 

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws1, "Fonctionnaires");
        XLSX.utils.book_append_sheet(wb, ws2, "Non Fonctionnaires");
        
        XLSX.writeFile(wb, "Point_Agents.xlsx");
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
