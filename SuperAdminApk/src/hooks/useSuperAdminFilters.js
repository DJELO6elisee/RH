import { useState, useEffect, useMemo } from 'react';
import { Row, Col, Input, Label } from 'reactstrap';

const API_BASE = 'https://tourisme.2ise-groupe.com';

/**
 * Hook pour les filtres Super Admin (ministère, direction, sous-direction).
 * À utiliser sur les pages Profil de carrière et toute page listant des agents.
 * @param {boolean} isSuperAdmin
 * @returns {{
 *   filterMinistereId: string,
 *   filterDirectionId: string,
 *   filterSousDirectionId: string,
 *   setFilterMinistereId: Function,
 *   setFilterDirectionId: Function,
 *   setFilterSousDirectionId: Function,
 *   ministeresList: Array,
 *   directionsList: Array,
 *   sousDirectionsList: Array,
 *   loadingDirections: boolean,
 *   loadingSousDirections: boolean,
 *   queryParams: Object|null,
 *   FilterUI: React.ReactNode|null
 * }}
 */
export function useSuperAdminFilters(isSuperAdmin) {
    const [filterMinistereId, setFilterMinistereId] = useState('');
    const [filterDirectionId, setFilterDirectionId] = useState('');
    const [filterSousDirectionId, setFilterSousDirectionId] = useState('');
    const [ministeresList, setMinisteresList] = useState([]);
    const [directionsList, setDirectionsList] = useState([]);
    const [sousDirectionsList, setSousDirectionsList] = useState([]);
    const [loadingDirections, setLoadingDirections] = useState(false);
    const [loadingSousDirections, setLoadingSousDirections] = useState(false);

    useEffect(() => {
        if (!isSuperAdmin) return;
        const loadMinisteres = async () => {
            try {
                const res = await fetch(`${API_BASE}/api/ministeres?limit=500`, {
                    headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                });
                const result = await res.json();
                const data = result.data || result || [];
                setMinisteresList(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error('Erreur chargement ministères:', err);
                setMinisteresList([]);
            }
        };
        loadMinisteres();
    }, [isSuperAdmin]);

    useEffect(() => {
        if (!isSuperAdmin || !filterMinistereId) {
            setDirectionsList([]);
            setFilterDirectionId('');
            setFilterSousDirectionId('');
            setSousDirectionsList([]);
            return;
        }
        setLoadingDirections(true);
        setFilterDirectionId('');
        setFilterSousDirectionId('');
        setSousDirectionsList([]);
        fetch(`${API_BASE}/api/directions?id_ministere=${filterMinistereId}&limit=500`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
            .then(res => res.json())
            .then(result => {
                const data = result.data || result || [];
                setDirectionsList(Array.isArray(data) ? data : []);
            })
            .catch(err => {
                console.error('Erreur chargement directions:', err);
                setDirectionsList([]);
            })
            .finally(() => setLoadingDirections(false));
    }, [isSuperAdmin, filterMinistereId]);

    useEffect(() => {
        if (!isSuperAdmin || !filterDirectionId) {
            setSousDirectionsList([]);
            setFilterSousDirectionId('');
            return;
        }
        setLoadingSousDirections(true);
        setFilterSousDirectionId('');
        fetch(`${API_BASE}/api/sous_directions?id_direction=${filterDirectionId}&limit=500`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
            .then(res => res.json())
            .then(result => {
                const data = result.data || result || [];
                setSousDirectionsList(Array.isArray(data) ? data : []);
            })
            .catch(err => {
                console.error('Erreur chargement sous-directions:', err);
                setSousDirectionsList([]);
            })
            .finally(() => setLoadingSousDirections(false));
    }, [isSuperAdmin, filterDirectionId]);

    const queryParams = useMemo(() => {
        if (!isSuperAdmin) return null;
        const params = {};
        if (filterMinistereId) params.id_ministere = filterMinistereId;
        if (filterDirectionId) params.id_direction = filterDirectionId;
        if (filterSousDirectionId) params.id_sous_direction = filterSousDirectionId;
        return Object.keys(params).length > 0 ? params : null;
    }, [isSuperAdmin, filterMinistereId, filterDirectionId, filterSousDirectionId]);

    const FilterUI = useMemo(() => {
        if (!isSuperAdmin) return null;
        return (
            <Row className="align-items-end">
                <Col md={3}>
                    <Label className="mb-1">Ministère</Label>
                    <Input
                        type="select"
                        value={filterMinistereId}
                        onChange={(e) => setFilterMinistereId(e.target.value)}
                        style={{ border: '1px solid #ced4da' }}
                    >
                        <option value="">Tous les ministères</option>
                        {ministeresList.map(m => (
                            <option key={m.id} value={m.id}>{m.nom || m.libelle || m.code || m.id}</option>
                        ))}
                    </Input>
                </Col>
                <Col md={3}>
                    <Label className="mb-1">Direction</Label>
                    <Input
                        type="select"
                        value={filterDirectionId}
                        onChange={(e) => setFilterDirectionId(e.target.value)}
                        disabled={!filterMinistereId || loadingDirections}
                        style={{ border: '1px solid #ced4da' }}
                    >
                        <option value="">Toutes les directions</option>
                        {directionsList.map(d => (
                            <option key={d.id} value={d.id}>{d.libelle || d.libele || d.id}</option>
                        ))}
                    </Input>
                </Col>
                <Col md={3}>
                    <Label className="mb-1">Sous-direction</Label>
                    <Input
                        type="select"
                        value={filterSousDirectionId}
                        onChange={(e) => setFilterSousDirectionId(e.target.value)}
                        disabled={!filterDirectionId || loadingSousDirections}
                        style={{ border: '1px solid #ced4da' }}
                    >
                        <option value="">Toutes les sous-directions</option>
                        {sousDirectionsList.map(sd => (
                            <option key={sd.id} value={sd.id}>{sd.libelle || sd.libele || sd.id}</option>
                        ))}
                    </Input>
                </Col>
            </Row>
        );
    }, [isSuperAdmin, filterMinistereId, filterDirectionId, filterSousDirectionId, ministeresList, directionsList, sousDirectionsList, loadingDirections, loadingSousDirections]);

    return {
        filterMinistereId,
        filterDirectionId,
        filterSousDirectionId,
        setFilterMinistereId,
        setFilterDirectionId,
        setFilterSousDirectionId,
        ministeresList,
        directionsList,
        sousDirectionsList,
        loadingDirections,
        loadingSousDirections,
        queryParams,
        FilterUI
    };
}
