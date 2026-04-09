import React, { useState, useEffect } from 'react';
import { Row, Col, FormGroup, Label, Input } from 'reactstrap';
import { useAuth } from 'contexts/AuthContext';
import { getAuthHeaders, getApiUrl } from 'config/api';

const MinistereFilter = ({ selectedMinistere, setSelectedMinistere }) => {
    const { user } = useAuth();
    const [ministeres, setMinisteres] = useState([]);
    const [ministereText, setMinistereText] = useState('');

    useEffect(() => {
        if (user?.role === 'super_admin') {
            fetch(`${getApiUrl()}/api/ministeres?limit=1000`, {
                headers: getAuthHeaders()
            })
            .then(res => res.json())
            .then(result => {
                const data = result.data || result;
                if (Array.isArray(data)) {
                    setMinisteres(data);
                }
            })
            .catch(console.error);
        }
    }, [user]);

    if (user?.role !== 'super_admin') return null;

    return (
        <Row className="mb-3">
            <Col md={6} lg={4}>
                <FormGroup className="mb-0">
                    <Label className="mb-1" style={{ fontSize: '0.85rem', fontWeight: 600 }}>Filtrer par Ministère</Label>
                    <Input
                        type="text"
                        bsSize="sm"
                        value={ministereText}
                        placeholder="Rechercher un ministère..."
                        list="ministere-filter-list"
                        onChange={(e) => {
                            const val = e.target.value;
                            setMinistereText(val);
                            const match = ministeres.find(m => (m.nom || m.libelle || m.code || '') === val);
                            setSelectedMinistere(match ? match.id : '');
                        }}
                    />
                    <datalist id="ministere-filter-list">
                        {ministeres.map(m => (
                            <option key={m.id} value={m.nom || m.libelle || m.code} />
                        ))}
                    </datalist>
                </FormGroup>
            </Col>
        </Row>
    );
};

export default MinistereFilter;
