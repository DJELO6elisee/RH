import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
    Alert,
    Badge,
    Button,
    Card,
    CardBody,
    CardHeader,
    CardTitle,
    Col,
    FormGroup,
    Input,
    Label,
    Modal,
    ModalBody,
    ModalFooter,
    ModalHeader,
    Row,
    Spinner,
    Table
} from 'reactstrap';
import { MdRefresh, MdSearch, MdTrendingUp, MdVisibility, MdDownload, MdPrint } from 'react-icons/md';
import { useAuth } from '../contexts/AuthContext';


const REMOTE_API_BASE_URL = 'https://tourisme.2ise-groupe.com/api';
const LOCAL_API_BASE_URL = 'https://tourisme.2ise-groupe.com/api';

const resolveApiBaseUrl = () => {
    if (process.env.REACT_APP_API_URL) {
        return process.env.REACT_APP_API_URL;
    }

    if (typeof window !== 'undefined') {
        const host = window.location.hostname;
        if (host === 'localhost' || host === '127.0.0.1') {
            return LOCAL_API_BASE_URL;
        }
    }
    return REMOTE_API_BASE_URL;
};

const API_BASE_URL = resolveApiBaseUrl();
const PROLONGEMENTS_CACHE_PREFIX = 'prolongements_retraite_cache';

const normalizeString = (value) => {
    if (!value) {
        return '';
    }
    return value
        .toString()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase();
};

const cleanLabel = (value) => (value ? value.toString().trim() : '');
const normalizeSearch = (value) => normalizeString(value || '');

const getDirectionLabel = (agent) =>
    cleanLabel(
        agent?.direction_libelle ||
        agent?.direction_libele ||
        agent?.direction_nom ||
        agent?.direction ||
        agent?.direction_name ||
        agent?.direction_principale ||
        agent?.direction_ministere
    );

const getSousDirectionLabel = (agent) =>
    cleanLabel(
        agent?.sous_direction_libele ||
        agent?.sous_direction_libelle ||
        agent?.sous_direction_nom ||
        agent?.sous_direction ||
        agent?.sousDirection
    );

const getServiceLabel = (agent) =>
    cleanLabel(
        agent?.service_libelle ||
        agent?.service_libele ||
        agent?.service_nom ||
        agent?.service ||
        agent?.nom_service
    );

const calculateRetirementAgeFromGrade = (gradeLabel = '') => {
    if (!gradeLabel) {
        return 60;
    }
    const normalized = gradeLabel.toUpperCase().trim();
    const grades65 = ['A4', 'A5', 'A6', 'A7'];
    return grades65.includes(normalized) ? 65 : 60;
};

const buildRetirementInfo = (agent) => {
    const birthDate = agent?.date_de_naissance ? new Date(agent.date_de_naissance) : null;
    const birthYear =
        birthDate && !Number.isNaN(birthDate.getTime()) ? birthDate.getFullYear() : null;

    const candidateDates = [
        agent?.date_retraite,
        agent?.date_retraite_calculee,
        agent?.date_de_retraite
    ].filter(Boolean);

    let retirementDate = null;
    for (const candidate of candidateDates) {
        const parsed = new Date(candidate);
        if (!Number.isNaN(parsed.getTime())) {
            retirementDate = parsed;
            break;
        }
    }

    if (!retirementDate && birthYear !== null) {
        const defaultAge = calculateRetirementAgeFromGrade(agent?.grade_libele || agent?.grade_libelle);
        retirementDate = new Date(birthYear + defaultAge, 11, 31);
    }

    const retirementYear =
        retirementDate && !Number.isNaN(retirementDate.getTime()) ? retirementDate.getFullYear() : null;

    const retirementAge =
        birthYear !== null && retirementYear !== null ? retirementYear - birthYear : null;

    return {
        birthDate,
        retirementDate,
        retirementYear,
        retirementAge
    };
};

const isImageType = (mimeType, fileName) => {
    if (mimeType && mimeType.startsWith('image/')) {
        return true;
    }
    if (fileName) {
        return /\.(png|jpe?g|gif|bmp|webp)$/i.test(fileName);
    }
    return false;
};

const ProlongementRetraitePage = () => {
    const { user } = useAuth();
    const [agents, setAgents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [directionFilter, setDirectionFilter] = useState('');
    const [sousDirectionFilter, setSousDirectionFilter] = useState('');
    const [serviceFilter, setServiceFilter] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedAgent, setSelectedAgent] = useState(null);
    const [newRetirementAge, setNewRetirementAge] = useState('');
    const [modalError, setModalError] = useState(null);
    const [saving, setSaving] = useState(false);
    const [resetting, setResetting] = useState(false);
    const [periodYears, setPeriodYears] = useState('');
    const [totalAgentsCount, setTotalAgentsCount] = useState(0);
    const [numeroActe, setNumeroActe] = useState('');
    const [nombreAnnees, setNombreAnnees] = useState('');
    const [uploadedFile, setUploadedFile] = useState(null);
    const [natureActe, setNatureActe] = useState('');
    const [dateActe, setDateActe] = useState('');
    const [autreNature, setAutreNature] = useState('');
    const [prolongements, setProlongements] = useState(new Map()); // Map<agentId, prolongementData>
    const [viewActeModalOpen, setViewActeModalOpen] = useState(false);
    const [selectedProlongement, setSelectedProlongement] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [previewMeta, setPreviewMeta] = useState(null);
    const [previewAgentId, setPreviewAgentId] = useState(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewError, setPreviewError] = useState(null);
    const [printModalOpen, setPrintModalOpen] = useState(false);
    const [printModalUrl, setPrintModalUrl] = useState(null);
    const [printModalMeta, setPrintModalMeta] = useState(null);
    const [printModalLoading, setPrintModalLoading] = useState(false);
    const [printModalError, setPrintModalError] = useState(null);
    const prolongementsStorageKey = useMemo(() => {
        const orgId = user?.organization?.id ? `_${user.organization.id}` : '_global';
        return `${PROLONGEMENTS_CACHE_PREFIX}${orgId}`;
    }, [user?.organization?.id]);

    const getAuthHeaders = useCallback(() => {
        const token = localStorage.getItem('token');
        return {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` })
        };
    }, []);

    const getAuthHeadersForFiles = useCallback(() => {
        const token = localStorage.getItem('token');
        return token ? { Authorization: `Bearer ${token}` } : {};
    }, []);

    const fetchProlongementFile = useCallback(
        async (agentId) => {
            if (!agentId) {
                throw new Error("Agent introuvable pour ouvrir l'acte.");
            }

            const response = await fetch(`${API_BASE_URL}/agents/${agentId}/prolongement-retraite/file`, {
                headers: getAuthHeadersForFiles()
            });

            if (!response.ok) {
                throw new Error(`Impossible de charger le document (statut ${response.status}).`);
            }

            const blob = await response.blob();
            const disposition = response.headers.get('Content-Disposition') || '';
            let fileName = 'acte-prolongement';
            const match = disposition.match(/filename="?([^"]+)"?/i);
            if (match && match[1]) {
                fileName = decodeURIComponent(match[1]);
            }

            const mimeType = response.headers.get('Content-Type') || blob.type || 'application/pdf';
            return { blob, fileName, mimeType };
        },
        [getAuthHeadersForFiles]
    );

    const loadProlongementPreview = useCallback(
        async (agentId) => {
            setPreviewLoading(true);
            setPreviewError(null);
            try {
                const { blob, fileName, mimeType } = await fetchProlongementFile(agentId);
                const objectUrl = window.URL.createObjectURL(blob);
                setPreviewUrl((prev) => {
                    if (prev) {
                        window.URL.revokeObjectURL(prev);
                    }
                    return objectUrl;
                });
                setPreviewMeta({ fileName, mimeType });
                setPreviewAgentId(agentId);
                return { objectUrl, fileName, mimeType };
            } catch (error) {
                setPreviewError(error.message || "Impossible de charger le document.");
                setPreviewUrl((prev) => {
                    if (prev) {
                        window.URL.revokeObjectURL(prev);
                    }
                    return null;
                });
                throw error;
            } finally {
                setPreviewLoading(false);
            }
        },
        [fetchProlongementFile]
    );

    const ensurePreviewForAgent = useCallback(
        async (agentId) => {
            if (previewUrl && previewAgentId === agentId) {
                return { objectUrl: previewUrl, fileName: previewMeta?.fileName, mimeType: previewMeta?.mimeType };
            }
            return loadProlongementPreview(agentId);
        },
        [previewUrl, previewAgentId, previewMeta, loadProlongementPreview]
    );

    const openProlongementDocument = useCallback(
        async (agentId) => {
            try {
                await ensurePreviewForAgent(agentId);
            } catch (error) {
                console.error('Erreur lors du chargement du document:', error);
                alert("Impossible d'afficher le document. Vérifiez votre connexion ou réessayez.");
            }
        },
        [ensurePreviewForAgent]
    );

    const downloadProlongementDocument = useCallback(
        async (agentId) => {
            try {
                const { blob, fileName } = await fetchProlongementFile(agentId);
                const objectUrl = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = objectUrl;
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                setTimeout(() => window.URL.revokeObjectURL(objectUrl), 60 * 1000);
            } catch (error) {
                console.error('Erreur lors du téléchargement du document:', error);
                alert("Impossible de télécharger le document. Vérifiez votre connexion ou réessayez.");
            }
        },
        [fetchProlongementFile]
    );

    const openPrintModalForAgent = useCallback(
        async (agentId) => {
            if (!agentId) {
                alert("Aucun document n'est associé à cet acte.");
                return;
            }
            setPrintModalOpen(true);
            setPrintModalLoading(true);
            setPrintModalError(null);
            try {
                const { blob, fileName, mimeType } = await fetchProlongementFile(agentId);
                const objectUrl = window.URL.createObjectURL(blob);
                setPrintModalUrl((prev) => {
                    if (prev) {
                        window.URL.revokeObjectURL(prev);
                    }
                    return objectUrl;
                });
                setPrintModalMeta({ fileName, mimeType });
            } catch (error) {
                console.error('Erreur lors du chargement pour impression:', error);
                setPrintModalError(error.message || "Impossible de charger le document.");
                setPrintModalUrl((prev) => {
                    if (prev) {
                        window.URL.revokeObjectURL(prev);
                    }
                    return null;
                });
            } finally {
                setPrintModalLoading(false);
            }
        },
        [fetchProlongementFile]
    );

    const triggerPrintFromModal = useCallback(() => {
        if (!printModalUrl) {
            return;
        }
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        iframe.src = printModalUrl;
        iframe.onload = () => {
            try {
                iframe.contentWindow?.focus();
                iframe.contentWindow?.print();
            } catch (err) {
                console.warn("Impossible de lancer l'impression automatiquement:", err);
            } finally {
                document.body.removeChild(iframe);
            }
        };
        document.body.appendChild(iframe);
    }, [printModalUrl]);

    const isFonctionnaire = useCallback((agent) => {
        if (!agent) return false;
        if (agent.id_type_d_agent && String(agent.id_type_d_agent) === '1') {
            return true;
        }
        return normalizeString(agent.type_agent_libele).includes('fonctionnaire');
    }, []);

    const loadSingleProlongement = useCallback(async (agentId) => {
        try {
            // Normaliser l'ID pour éviter les problèmes de type (string vs number)
            const normalizedAgentId = typeof agentId === 'string' ? parseInt(agentId, 10) : agentId;
            const url = `${API_BASE_URL}/agents/${normalizedAgentId}/prolongement-retraite`;
            
            console.log(`🔍 Chargement du prolongement pour agent ID: ${agentId} (normalisé: ${normalizedAgentId})`);
            console.log(`🔍 URL: ${url}`);
            
            const response = await fetch(url, {
                headers: getAuthHeaders()
            });
            
            console.log(`🔍 Réponse status: ${response.status}, ok: ${response.ok}`);
            
            if (response.ok) {
                const result = await response.json();
                console.log(`🔍 Résultat JSON:`, result);
                
                if (result.success && result.data) {
                    // Accepter le prolongement même si id ou id_agent sont manquants
                    // Normaliser les IDs pour la Map
                    const mapKey = normalizedAgentId;
                    setProlongements((prev) => {
                        const newMap = new Map(prev);
                        newMap.set(mapKey, result.data);
                        console.log(`✅ Prolongement chargé pour agent ${mapKey}`, {
                            id: result.data.id,
                            id_agent: result.data.id_agent,
                            numero_acte: result.data.numero_acte,
                            nature_acte: result.data.nature_acte,
                            date_acte: result.data.date_acte,
                            dataKeys: Object.keys(result.data)
                        });
                        return new Map(newMap); // Créer une nouvelle référence pour forcer le re-render
                    });
                    return result.data;
                } else {
                    console.log(`ℹ️ Pas de prolongement valide pour agent ${normalizedAgentId} - success: ${result.success}, hasData: ${!!result.data}`);
                    return null;
                }
            } else if (response.status === 404) {
                // Agent sans prolongement - normal
                console.log(`ℹ️ Agent ${normalizedAgentId} n'a pas de prolongement (404)`);
                return null;
            } else {
                console.warn(`⚠️ Erreur ${response.status} lors du chargement du prolongement pour agent ${normalizedAgentId}`);
                return null;
            }
        } catch (err) {
            console.error(`❌ Erreur lors du chargement du prolongement pour agent ${agentId}:`, err);
            return null;
        }
    }, [getAuthHeaders]);

    const loadProlongements = useCallback(async (agentsList) => {
        if (!agentsList || agentsList.length === 0) {
            return;
        }
        
        const prolongementsMap = new Map();
        console.log('🔄 Chargement des prolongements pour', agentsList.length, 'agents');
        
        // Charger les prolongements pour chaque agent
        const promises = agentsList.map(async (agent) => {
            try {
                // Normaliser l'ID pour éviter les problèmes de type (string vs number)
                const normalizedAgentId = typeof agent.id === 'string' ? parseInt(agent.id, 10) : agent.id;
                
                // Log spécial pour l'agent M0008
                const isTargetAgent = agent.matricule === 'M0008' || agent.nom?.includes('TEST DIRECTEUR DE CABINET');
                if (isTargetAgent) {
                    console.log(`🔍 Tentative de chargement du prolongement pour agent ID: ${agent.id} (normalisé: ${normalizedAgentId}, ${agent.nom} ${agent.prenom}, Matricule: ${agent.matricule})`);
                }
                
                const url = `${API_BASE_URL}/agents/${normalizedAgentId}/prolongement-retraite`;
                const response = await fetch(url, {
                    headers: getAuthHeaders()
                });
                
                if (isTargetAgent) {
                    console.log(`🔍 Réponse pour agent ${agent.id}:`, {
                        status: response.status,
                        statusText: response.statusText,
                        ok: response.ok
                    });
                }
                
                // Seulement ajouter si la réponse est OK (200) et qu'il y a des données
                if (response.ok) {
                    const result = await response.json();
                    if (isTargetAgent) {
                        console.log(`🔍 Résultat JSON pour agent ${agent.id}:`, result);
                    }
                    
                    if (result.success && result.data) {
                        // Accepter le prolongement même si id ou id_agent sont manquants
                        // car ils peuvent être null dans certains cas
                        // Utiliser l'ID normalisé comme clé de la Map
                        prolongementsMap.set(normalizedAgentId, result.data);
                        console.log(`✅ Prolongement trouvé pour agent ${normalizedAgentId} (${agent.nom} ${agent.prenom})`, {
                            id: result.data.id,
                            id_agent: result.data.id_agent,
                            numero_acte: result.data.numero_acte,
                            hasFile: !!result.data.fichier,
                            dataKeys: Object.keys(result.data),
                            mapKey: normalizedAgentId
                        });
                        
                        if (isTargetAgent) {
                            console.log(`✅✅✅ PROLONGEMENT TROUVÉ POUR AGENT ${normalizedAgentId} (${agent.nom} ${agent.prenom})`, result.data);
                        }
                    } else {
                        if (isTargetAgent) {
                            console.warn(`⚠️ Pas de données dans la réponse pour agent ${agent.id}:`, {
                                success: result.success,
                                hasData: !!result.data,
                                result: result
                            });
                        }
                        console.log(`ℹ️  Pas de prolongement pour agent ${agent.id} (${agent.nom} ${agent.prenom}) - success: ${result.success}`);
                    }
                } else if (response.status === 404) {
                    if (isTargetAgent) {
                        console.warn(`⚠️⚠️⚠️ 404 - Agent ${agent.id} (${agent.nom} ${agent.prenom}, Matricule: ${agent.matricule}) n'a PAS de prolongement dans l'API`);
                    }
                    // Agent sans prolongement dans l'API - normal, ne pas logger comme erreur
                } else {
                    if (isTargetAgent) {
                        console.error(`❌❌❌ Erreur ${response.status} pour agent ${agent.id} (${agent.nom} ${agent.prenom})`);
                    }
                    console.warn(`⚠️  Erreur ${response.status} pour agent ${agent.id} (${agent.nom} ${agent.prenom})`);
                }
            } catch (err) {
                // Logger l'erreur mais ne pas bloquer le chargement
                const isTargetAgent = agent.matricule === 'M0008' || agent.nom?.includes('TEST DIRECTEUR DE CABINET');
                if (isTargetAgent) {
                    console.error(`❌❌❌ ERREUR CRITIQUE pour agent ${agent.id} (${agent.nom} ${agent.prenom}):`, err);
                }
                console.error(`❌ Erreur lors du chargement du prolongement pour agent ${agent.id} (${agent.nom} ${agent.prenom}):`, err.message);
            }
        });
        
        await Promise.all(promises);
        console.log(`📊 ${prolongementsMap.size} prolongement(s) chargé(s) sur ${agentsList.length} agents`);
        
        // Log détaillé pour débogage
        if (prolongementsMap.size > 0) {
            console.log('📋 Agents avec prolongement:', Array.from(prolongementsMap.keys()));
            prolongementsMap.forEach((prolongement, agentId) => {
                const agent = agentsList.find(a => a.id === agentId);
                console.log(`  - Agent ${agentId} (${agent?.nom} ${agent?.prenom}):`, {
                    id: prolongement.id,
                    id_agent: prolongement.id_agent,
                    numero_acte: prolongement.numero_acte,
                    nombre_annees: prolongement.nombre_annees,
                    hasFile: !!prolongement.fichier
                });
            });
        }
        
        // Mettre à jour l'état en fusionnant avec les prolongements existants
        // pour conserver les prolongements créés localement qui ne sont pas encore dans l'API
        setProlongements((prev) => {
            const mergedMap = new Map(prev);
            // Ajouter les nouveaux prolongements trouvés dans l'API
            prolongementsMap.forEach((value, key) => {
                mergedMap.set(key, value);
            });
            // Conserver les prolongements existants qui ne sont pas dans la nouvelle Map
            // (ceux qui viennent d'être créés et ne sont pas encore dans l'API)
            prev.forEach((value, key) => {
                if (!prolongementsMap.has(key) && value && typeof value === 'object') {
                    // Vérifier que l'agent existe toujours dans la liste
                    // Normaliser les IDs pour la comparaison
                    const agentExists = agentsList.some(a => {
                        const normalizedAgentId = typeof a.id === 'string' ? parseInt(a.id, 10) : a.id;
                        const normalizedKey = typeof key === 'string' ? parseInt(key, 10) : key;
                        return normalizedAgentId === normalizedKey || a.id === key;
                    });
                    
                    if (agentExists) {
                        mergedMap.set(key, value);
                        console.log(`ℹ️  Conservation du prolongement local pour agent ${key} (non trouvé dans l'API)`);
                    }
                }
            });
            return mergedMap;
        });
        
        // Log final pour vérification
        console.log('📋 Résumé du chargement des prolongements:');
        console.log(`  - Agents traités: ${agentsList.length}`);
        console.log(`  - Prolongements trouvés: ${prolongementsMap.size}`);
        if (prolongementsMap.size > 0) {
            console.log(`  - IDs des agents avec prolongement: [${Array.from(prolongementsMap.keys()).join(', ')}]`);
        }
    }, [getAuthHeaders]);

    const loadAgents = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const params = new URLSearchParams({
                statut_emploi: 'actif',
                id_type_d_agent: '1',
                limit: '5000',
                sortBy: 'nom',
                sortOrder: 'ASC'
            });

            if (user?.organization?.type === 'ministere' && user?.organization?.id) {
                params.append('id_ministere', user.organization.id);
            }

            const response = await fetch(`${API_BASE_URL}/agents?${params.toString()}`, {
                headers: getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error(`Statut HTTP ${response.status}`);
            }

            const result = await response.json();
            let agentsData = [];

            if (Array.isArray(result?.data)) {
                agentsData = result.data;
            } else if (Array.isArray(result)) {
                agentsData = result;
            }

            const fonctionnairesOnly = agentsData.filter(isFonctionnaire);
            setAgents(fonctionnairesOnly);
            setTotalAgentsCount(fonctionnairesOnly.length);
            
            // Charger les prolongements pour tous les agents
            await loadProlongements(fonctionnairesOnly);
        } catch (err) {
            console.error('Erreur lors du chargement des agents:', err);
            setError('Impossible de récupérer les agents pour le moment.');
        } finally {
            setLoading(false);
        }
    }, [getAuthHeaders, user, isFonctionnaire, loadProlongements]);

    useEffect(() => {
        loadAgents();
    }, [loadAgents]);

useEffect(() => {
    if (!viewActeModalOpen && previewUrl) {
        window.URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
        setPreviewMeta(null);
        setPreviewAgentId(null);
        setPreviewError(null);
        setPreviewLoading(false);
    }
}, [viewActeModalOpen, previewUrl]);

useEffect(() => {
    return () => {
        if (previewUrl) {
            window.URL.revokeObjectURL(previewUrl);
        }
    };
}, [previewUrl]);

useEffect(() => {
    if (!printModalOpen && printModalUrl) {
        window.URL.revokeObjectURL(printModalUrl);
        setPrintModalUrl(null);
        setPrintModalMeta(null);
        setPrintModalError(null);
        setPrintModalLoading(false);
    }
}, [printModalOpen, printModalUrl]);

useEffect(() => {
    return () => {
        if (printModalUrl) {
            window.URL.revokeObjectURL(printModalUrl);
        }
    };
}, [printModalUrl]);

useEffect(() => {
    if (!viewActeModalOpen && previewUrl) {
        window.URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
        setPreviewMeta(null);
        setPreviewAgentId(null);
        setPreviewError(null);
        setPreviewLoading(false);
    }
}, [viewActeModalOpen, previewUrl]);

useEffect(() => {
    return () => {
        if (previewUrl) {
            window.URL.revokeObjectURL(previewUrl);
        }
    };
}, [previewUrl]);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }
        try {
            const cachedValue = localStorage.getItem(prolongementsStorageKey);
            if (!cachedValue) {
                return;
            }

            const parsed = JSON.parse(cachedValue);
            const entries = Array.isArray(parsed?.entries)
                ? parsed.entries
                : Array.isArray(parsed)
                    ? parsed
                    : [];

            if (!entries.length) {
                return;
            }

            const cacheMap = new Map();
            entries.forEach(([key, value]) => {
                if (!value || typeof value !== 'object') {
                    return;
                }
                const normalizedKey =
                    typeof key === 'string' ? parseInt(key, 10) : key;
                if (!Number.isNaN(normalizedKey)) {
                    cacheMap.set(normalizedKey, value);
                }
            });

            if (cacheMap.size > 0) {
                setProlongements(new Map(cacheMap));
                console.log('♻️ Prolongements rechargés depuis le cache local:', cacheMap.size);
            }
        } catch (err) {
            console.warn('Impossible de recharger le cache des prolongements:', err);
        }
    }, [prolongementsStorageKey]);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }
        try {
            if (prolongements.size === 0) {
                localStorage.removeItem(prolongementsStorageKey);
                return;
            }
            const serialized = {
                version: 1,
                updatedAt: new Date().toISOString(),
                entries: Array.from(prolongements.entries()).map(([key, value]) => [
                    typeof key === 'string' ? parseInt(key, 10) : key,
                    value
                ])
            };
            localStorage.setItem(
                prolongementsStorageKey,
                JSON.stringify(serialized)
            );
        } catch (err) {
            console.warn('Impossible de sauvegarder le cache des prolongements:', err);
        }
    }, [prolongements, prolongementsStorageKey]);

    // S'assurer que les prolongements sont chargés si les agents changent
    useEffect(() => {
        if (agents.length > 0 && prolongements.size === 0) {
            console.log('🔄 Aucun prolongement chargé, rechargement...');
            loadProlongements(agents).catch(err => {
                console.error('Erreur lors du chargement initial des prolongements:', err);
            });
        }
    }, [agents, prolongements.size, loadProlongements]);

    const retirementInfos = useMemo(() => {
        const map = new Map();
        agents.forEach((agent) => {
            map.set(agent.id, buildRetirementInfo(agent));
        });
        return map;
    }, [agents]);

    const directionOptions = useMemo(() => {
        const set = new Set();
        agents.forEach((agent) => {
            const label = getDirectionLabel(agent);
            if (label) {
                set.add(label);
            }
        });
        return Array.from(set).sort();
    }, [agents]);

    const sousDirectionOptions = useMemo(() => {
        const set = new Set();
        agents
            .filter((agent) => !directionFilter || normalizeSearch(getDirectionLabel(agent)).includes(normalizeSearch(directionFilter)))
            .forEach((agent) => {
                const label = getSousDirectionLabel(agent);
                if (label) {
                    set.add(label);
                }
            });
        return Array.from(set).sort();
    }, [agents, directionFilter]);

    const serviceOptions = useMemo(() => {
        const set = new Set();
        agents
            .filter((agent) => !directionFilter || normalizeSearch(getDirectionLabel(agent)).includes(normalizeSearch(directionFilter)))
            .filter((agent) => !sousDirectionFilter || normalizeSearch(getSousDirectionLabel(agent)).includes(normalizeSearch(sousDirectionFilter)))
            .forEach((agent) => {
                const label = getServiceLabel(agent);
                if (label) {
                    set.add(label);
                }
            });
        return Array.from(set).sort();
    }, [agents, directionFilter, sousDirectionFilter]);

    const filteredAgents = useMemo(() => {
        const term = normalizeString(searchTerm);
        const now = new Date();
        const currentYear = now.getFullYear();
        return agents
            .filter((agent) => {
                if (directionFilter && !normalizeSearch(getDirectionLabel(agent)).includes(normalizeSearch(directionFilter))) {
                    return false;
                }
                if (sousDirectionFilter && !normalizeSearch(getSousDirectionLabel(agent)).includes(normalizeSearch(sousDirectionFilter))) {
                    return false;
                }
                if (serviceFilter && !normalizeSearch(getServiceLabel(agent)).includes(normalizeSearch(serviceFilter))) {
                    return false;
                }
                if (term) {
                    const haystack = normalizeString(
                        `${agent.nom || ''} ${agent.prenom || ''} ${agent.matricule || ''}`
                    );
                    if (!haystack.includes(term)) {
                        return false;
                    }
                }
                if (periodYears) {
                    const info = retirementInfos.get(agent.id) || {};
                    if (!info.retirementYear) {
                        return false;
                    }
                    const limitYear = currentYear + parseInt(periodYears, 10);
                    if (Number.isNaN(limitYear) || info.retirementYear > limitYear) {
                        return false;
                    }
                }
                return true;
            })
            .sort((a, b) => {
                const infoA = retirementInfos.get(a.id) || {};
                const infoB = retirementInfos.get(b.id) || {};
                const yearA = infoA.retirementYear || 9999;
                const yearB = infoB.retirementYear || 9999;
                if (yearA === yearB) {
                    return normalizeString(a.nom).localeCompare(normalizeString(b.nom));
                }
                return yearA - yearB;
            });
    }, [
        agents,
        directionFilter,
        sousDirectionFilter,
        serviceFilter,
        searchTerm,
        retirementInfos,
        periodYears
    ]);

    const resetFilters = () => {
        setDirectionFilter('');
        setSousDirectionFilter('');
        setServiceFilter('');
        setSearchTerm('');
        setPeriodYears('');
    };

    const openModal = (agent) => {
        const info = retirementInfos.get(agent.id) || {};
        const baseAge =
            info.retirementAge ||
            calculateRetirementAgeFromGrade(agent.grade_libele || agent.grade_libelle);

        setSelectedAgent({
            ...agent,
            baseRetirementAge: baseAge,
            retirementInfo: info
        });
        setModalError(null);
        setNumeroActe('');
        setNombreAnnees('');
        setNewRetirementAge(baseAge ? baseAge.toString() : '60');
        setUploadedFile(null);
        setNatureActe('');
        setDateActe('');
        setAutreNature('');
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setSelectedAgent(null);
        setModalError(null);
        setNewRetirementAge('');
        setNumeroActe('');
        setNombreAnnees('');
        setUploadedFile(null);
        setNatureActe('');
        setDateActe('');
        setAutreNature('');
    };

    const handleExtendRetirement = async () => {
        if (!selectedAgent) {
            return;
        }

        // Valider que le numéro de l'acte est saisi (obligatoire)
        if (!numeroActe || numeroActe.trim() === '') {
            setModalError('Veuillez saisir le numéro de l\'acte (champ obligatoire).');
            return;
        }

        // Valider que la nature de l'acte est sélectionnée (obligatoire)
        if (!natureActe || natureActe.trim() === '') {
            setModalError('Veuillez sélectionner la nature de l\'acte (champ obligatoire).');
            return;
        }

        // Valider que si "AUTRES" est sélectionné, le champ autre nature est rempli
        if (natureActe === 'AUTRES' && (!autreNature || autreNature.trim() === '')) {
            setModalError('Veuillez saisir la nature de l\'acte lorsque "AUTRES" est sélectionné.');
            return;
        }

        // Valider que la date est saisie (obligatoire)
        if (!dateActe || dateActe.trim() === '') {
            setModalError('Veuillez saisir la date de l\'acte (champ obligatoire).');
            return;
        }

        // Valider que l'année de prolongement est saisie (obligatoire)
        if (!nombreAnnees || nombreAnnees.trim() === '') {
            setModalError('Veuillez saisir l\'année de prolongement (champ obligatoire).');
            return;
        }

        const yearsValue = parseInt(nombreAnnees, 10);
        if (Number.isNaN(yearsValue) || yearsValue <= 0 || yearsValue > 15) {
            setModalError('Veuillez saisir un nombre d\'années de prolongement valide (entre 1 et 15 ans).');
            return;
        }

        // Valider que le fichier est uploadé (obligatoire)
        if (!uploadedFile) {
            setModalError('Veuillez uploader le fichier de prolongation (champ obligatoire).');
            return;
        }

        // Calculer le nouvel âge de retraite à partir du nombre d'années
        const newAge = selectedAgent.baseRetirementAge + yearsValue;
        if (newAge > 75) {
            setModalError(`Le nombre d'années saisi entraînerait un âge de retraite supérieur à 75 ans. Maximum autorisé : ${75 - selectedAgent.baseRetirementAge} ans.`);
            return;
        }

        try {
            setSaving(true);
            setModalError(null);
            const attemptExtend = async (baseUrl) => {
                const token = localStorage.getItem('token');
                const headers = {
                    ...(token && { Authorization: `Bearer ${token}` })
                };

                // Le fichier est obligatoire, donc on utilise toujours FormData
                const formData = new FormData();
                formData.append('nombre_annees', yearsValue);
                formData.append('numero_acte', numeroActe);
                formData.append('nature_acte', natureActe === 'AUTRES' ? autreNature.toUpperCase() : natureActe);
                formData.append('date_acte', dateActe);
                formData.append('file', uploadedFile);
                const body = formData;
                // Ne pas définir Content-Type pour FormData, le navigateur le fera automatiquement

                const response = await fetch(
                    `${baseUrl}/agents/${selectedAgent.id}/extend-retirement`,
                    {
                        method: 'PATCH',
                        headers: headers,
                        body: body
                    }
                );
                const result = await response.json();
                if (!response.ok || !result.success) {
                    throw new Error(result.message || 'Une erreur est survenue lors du prolongement.');
                }
                return result;
            };

            let result = null;
            let lastError = null;

            try {
                result = await attemptExtend(API_BASE_URL);
            } catch (err) {
                lastError = err;
                const isCorsIssue = err instanceof TypeError || /Failed to fetch/i.test(err.message) || /CORS/i.test(err.message);
                if (isCorsIssue && API_BASE_URL === REMOTE_API_BASE_URL) {
                    try {
                        result = await attemptExtend(LOCAL_API_BASE_URL);
                    } catch (fallbackError) {
                        lastError = fallbackError;
                    }
                }
            }

            if (!result) {
                throw lastError || new Error('Impossible de prolonger la retraite.');
            }

            const updatedDate = result?.data?.date_retraite;
            // Sauvegarder la date de retraite initiale avant la mise à jour
            const initialRetirementDate = selectedAgent.date_retraite;

            // Construire l'objet prolongement directement depuis la réponse de l'API
            // et le mettre à jour immédiatement dans l'état
            if (result?.data) {
                const prolongementData = {
                    id: result.data.prolongement_id || null,
                    id_agent: selectedAgent.id, // Toujours défini, même si id est null
                    numero_acte: result.data.numero_acte || null,
                    nature_acte: result.data.nature_acte || null,
                    date_acte: result.data.date_acte || null,
                    nombre_annees: result.data.nombre_annees || null,
                    fichier: result.data.fichier_uploaded ? {
                        chemin: result.data.fichier_uploaded.chemin,
                        nom: result.data.fichier_uploaded.nom,
                        taille: result.data.fichier_uploaded.taille,
                        type: result.data.fichier_uploaded.type
                    } : null,
                    age_retraite_initial: result.data.previous_age,
                    age_retraite_prolonge: result.data.new_age,
                    date_retraite_initial: initialRetirementDate,
                    date_retraite_prolongee: result.data.date_retraite,
                    date_prolongement: new Date().toISOString()
                };

                // Mettre à jour directement la Map des prolongements AVANT de mettre à jour les agents
                // Normaliser l'ID pour éviter les problèmes de type
                const normalizedAgentId = typeof selectedAgent.id === 'string' ? parseInt(selectedAgent.id, 10) : selectedAgent.id;
                setProlongements((prev) => {
                    const newMap = new Map(prev);
                    newMap.set(normalizedAgentId, prolongementData);
                    console.log('✅ Prolongement ajouté immédiatement à la Map pour agent', normalizedAgentId, 'Données:', prolongementData);
                    console.log('📊 Validation - hasId:', !!prolongementData.id, 'hasIdAgent:', !!prolongementData.id_agent, 'willShowButton:', !!(prolongementData.id || prolongementData.id_agent));
                    console.log('📊 Taille de la Map après ajout:', newMap.size);
                    console.log('📊 Clés dans la Map:', Array.from(newMap.keys()));
                    // Forcer un re-render en retournant une nouvelle référence
                    return new Map(newMap);
                });
            }

            // Mettre à jour la liste des agents avec la nouvelle date de retraite
            setAgents((prev) => {
                return prev.map((agent) =>
                    agent.id === selectedAgent.id
                        ? { ...agent, date_retraite: updatedDate }
                        : agent
                );
            });

            // En arrière-plan, récupérer le prolongement complet depuis l'API pour s'assurer de la cohérence
            // (au cas où il y aurait des champs supplémentaires)
            // Charger immédiatement le prolongement depuis l'API pour garantir la cohérence
            // Mais NE PAS supprimer le prolongement de la Map si l'API retourne 404
            setTimeout(async () => {
                try {
                    const normalizedAgentId = typeof selectedAgent.id === 'string' ? parseInt(selectedAgent.id, 10) : selectedAgent.id;
                    const apiProlongement = await loadSingleProlongement(normalizedAgentId);
                    if (apiProlongement && typeof apiProlongement === 'object') {
                        console.log('✅ Prolongement synchronisé depuis l\'API pour agent', normalizedAgentId, apiProlongement);
                        // Mettre à jour la Map avec les données complètes de l'API
                        setProlongements((prev) => {
                            const newMap = new Map(prev);
                            newMap.set(normalizedAgentId, apiProlongement);
                            console.log('📊 Map mise à jour avec le prolongement synchronisé, clés:', Array.from(newMap.keys()));
                            return new Map(newMap);
                        });
                    } else {
                        console.warn('⚠️ Prolongement non trouvé dans l\'API après création (404), mais conservé dans la Map locale pour agent', normalizedAgentId);
                        // Ne pas supprimer le prolongement de la Map même si l'API retourne 404
                        // Le prolongement créé localement reste visible
                    }
                } catch (err) {
                    console.error('Erreur lors de la synchronisation du prolongement:', err);
                    // En cas d'erreur, ne pas supprimer le prolongement de la Map
                    // Il reste visible avec les données créées localement
                }
            }, 1000); // Augmenter le délai pour laisser le temps à la base de données de s'actualiser

            const newRetirementYear = selectedAgent.retirementInfo?.retirementYear 
                ? selectedAgent.retirementInfo.retirementYear + yearsValue 
                : result?.data?.retirement_year;
            
            setSuccessMessage(
                `Prolongement effectué : ${selectedAgent.nom} ${selectedAgent.prenom} partira à ${result?.data?.new_age ?? newAge} ans (année ${newRetirementYear ?? ''}).`
            );
            closeModal();
        } catch (err) {
            console.error('Erreur lors du prolongement:', err);
            setModalError(err.message || 'Impossible de prolonger la retraite.');
        } finally {
            setSaving(false);
        }
    };

    const handleResetRetirement = async () => {
        if (!selectedAgent) return;

        try {
            setResetting(true);
            setModalError(null);

            const response = await fetch(
                `${API_BASE_URL}/agents/${selectedAgent.id}/calculate-retirement`,
                {
                    method: 'GET',
                    headers: getAuthHeaders()
                }
            );

            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.message || 'Impossible de réinitialiser la date de retraite.');
            }

            const updatedDate = result?.data?.date_retraite;
            const updatedAge = result?.data?.age_retraite;
            const updatedYear = result?.data?.date_retraite
                ? new Date(result.data.date_retraite).getFullYear()
                : null;

            setAgents((prev) =>
                prev.map((agent) =>
                    agent.id === selectedAgent.id
                        ? { ...agent, date_retraite: updatedDate, age_retraite_calcule: updatedAge }
                        : agent
                )
            );

            setSuccessMessage(
                `Date de retraite restaurée : ${selectedAgent.nom} ${selectedAgent.prenom} partira à ${updatedAge || ''} ans (année ${updatedYear || ''}).`
            );
            closeModal();
        } catch (err) {
            console.error('Erreur lors de la réinitialisation:', err);
            setModalError(err.message || 'Impossible de réinitialiser la date de retraite.');
        } finally {
            setResetting(false);
        }
    };

    const hasNoData = !loading && filteredAgents.length === 0;
    const currentProlongementAgentId = selectedProlongement?.id_agent || null;
    const previewMatchesSelection =
        !!currentProlongementAgentId && !!previewUrl && previewAgentId === currentProlongementAgentId;

    return (
        <Card>
            <CardHeader className="d-flex justify-content-between align-items-center">
                <div>
                    <CardTitle tag="h5" className="mb-0">
                        Prolongement des retraites (Fonctionnaires)
                    </CardTitle>
                    <small className="text-muted">
                        Liste dynamique des fonctionnaires actifs du ministère avec possibilité de prolonger leur âge de départ.
                    </small>
                </div>
                <div>
                    <Button color="secondary" className="me-2" onClick={resetFilters}>
                        Réinitialiser
                    </Button>
                    <Button color="primary" onClick={loadAgents}>
                        {loading ? (
                            <Spinner size="sm" color="light" className="me-2" />
                        ) : (
                            <MdRefresh className="me-2" />
                        )}
                        Actualiser
                    </Button>
                </div>
            </CardHeader>
            <CardBody>
                <Alert color="light" className="border">
                    {totalAgentsCount} fonctionnaires actifs chargés. Utilisez les filtres (direction, sous-direction, service, période ou recherche) pour cibler les agents à prolonger.
                </Alert>
                {error && (
                    <Alert color="danger" toggle={() => setError(null)}>
                        {error}
                    </Alert>
                )}
                {successMessage && (
                    <Alert color="success" toggle={() => setSuccessMessage(null)}>
                        {successMessage}
                    </Alert>
                )}
                <Row className="g-3 mb-4">
                    <Col xs={12} md={6} lg={3}>
                        <FormGroup>
                            <Label>Direction</Label>
                            <Input
                                type="text"
                                value={directionFilter}
                                onChange={(e) => {
                                    setDirectionFilter(e.target.value);
                                    setSousDirectionFilter('');
                                    setServiceFilter('');
                                }}
                                placeholder="Toutes les directions"
                                list="direction-options"
                            />
                            <datalist id="direction-options">
                                {directionOptions.map((direction) => (
                                    <option key={direction} value={direction} />
                                ))}
                            </datalist>
                        </FormGroup>
                    </Col>
                    <Col xs={12} md={6} lg={3}>
                        <FormGroup>
                            <Label>Sous-direction</Label>
                            <Input
                                type="text"
                                value={sousDirectionFilter}
                                onChange={(e) => {
                                    setSousDirectionFilter(e.target.value);
                                    setServiceFilter('');
                                }}
                                placeholder="Toutes les sous-directions"
                                list="sous-direction-options"
                            />
                            <datalist id="sous-direction-options">
                                {sousDirectionOptions.map((sousDirection) => (
                                    <option key={sousDirection} value={sousDirection} />
                                ))}
                            </datalist>
                        </FormGroup>
                    </Col>
                    <Col xs={12} md={6} lg={3}>
                        <FormGroup>
                            <Label>Service</Label>
                            <Input
                                type="text"
                                value={serviceFilter}
                                onChange={(e) => setServiceFilter(e.target.value)}
                                placeholder="Tous les services"
                                list="service-options"
                            />
                            <datalist id="service-options">
                                {serviceOptions.map((service) => (
                                    <option key={service} value={service} />
                                ))}
                            </datalist>
                        </FormGroup>
                    </Col>
                    <Col xs={12} md={6} lg={3}>
                        <FormGroup>
                            <Label>Période (années)</Label>
                            <Input
                                type="number"
                                min="1"
                                placeholder="Toutes les périodes"
                                value={periodYears}
                                onChange={(e) => setPeriodYears(e.target.value)}
                            />
                            <small className="text-muted">
                                Exemple&nbsp;: 10 pour afficher les départs d&apos;ici 10 ans
                            </small>
                        </FormGroup>
                    </Col>
                    <Col xs={12} md={6} lg={3}>
                        <FormGroup>
                            <Label>Recherche</Label>
                            <div className="d-flex align-items-center">
                                <MdSearch className="me-2 text-muted" />
                                <Input
                                    type="text"
                                    placeholder="Nom, prénoms ou matricule"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </FormGroup>
                    </Col>
                </Row>

                <div className="d-flex justify-content-between align-items-center mb-3">
                    <div>
                        <strong>{filteredAgents.length}</strong> agent(s) listé(s) sur{' '}
                        <strong>{totalAgentsCount}</strong> fonctionnaires actifs.
                        {prolongements.size > 0 && (
                            <span className="ms-2 text-success">
                                ({prolongements.size} avec prolongement)
                            </span>
                        )}
                    </div>
                    <div className="d-flex gap-2 align-items-center">
                        <Badge color="light" className="text-dark border">
                            Prolongements ciblés par direction / sous-direction / service
                        </Badge>
                        <Button
                            color="info"
                            size="sm"
                            onClick={async () => {
                                console.log('🔄 Rechargement manuel des prolongements...');
                                console.log('📊 Nombre d\'agents:', agents.length);
                                console.log('📊 Prolongements actuels dans la Map:', prolongements.size);
                                console.log('📊 IDs des agents dans la Map:', Array.from(prolongements.keys()));
                                
                                // Chercher spécifiquement l'agent M0008
                                const targetAgent = agents.find(a => a.matricule === 'M0008' || a.nom?.includes('TEST DIRECTEUR DE CABINET'));
                                if (targetAgent) {
                                    console.log(`🔍 Agent cible trouvé: ${targetAgent.id} (${targetAgent.nom} ${targetAgent.prenom}, Matricule: ${targetAgent.matricule})`);
                                    console.log(`🔍 Prolongement actuel pour cet agent:`, prolongements.get(targetAgent.id));
                                    
                                    // Forcer le rechargement pour cet agent spécifique
                                    const singleProlongement = await loadSingleProlongement(targetAgent.id);
                                    if (singleProlongement) {
                                        console.log(`✅✅✅ Prolongement rechargé avec succès pour agent ${targetAgent.id}:`, singleProlongement);
                                    } else {
                                        console.warn(`⚠️⚠️⚠️ Aucun prolongement trouvé dans l'API pour agent ${targetAgent.id}`);
                                    }
                                } else {
                                    console.warn('⚠️ Agent M0008 non trouvé dans la liste des agents');
                                }
                                
                                await loadProlongements(agents);
                                console.log('✅ Rechargement des prolongements terminé');
                                console.log('📊 Nouveaux prolongements dans la Map:', prolongements.size);
                                console.log('📊 IDs des agents dans la Map après rechargement:', Array.from(prolongements.keys()));
                                
                                if (targetAgent) {
                                    console.log(`🔍 Prolongement après rechargement pour agent ${targetAgent.id}:`, prolongements.get(targetAgent.id));
                                }
                            }}
                            title="Recharger les prolongements"
                        >
                            <MdRefresh className="me-1" />
                            Recharger les prolongements
                        </Button>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center my-5">
                        <Spinner color="primary" />
                        <p className="mt-2">Chargement des agents...</p>
                    </div>
                ) : hasNoData ? (
                    <Alert color="light" className="text-center">
                        Aucun agent ne correspond aux filtres sélectionnés.
                    </Alert>
                ) : (
                    <div className="table-responsive">
                        <Table hover className="align-middle">
                            <thead>
                                <tr>
                                    <th>Agent</th>
                                    <th>Direction</th>
                                    <th>Sous-direction</th>
                                    <th>Service</th>
                                    <th>Année de retraite</th>
                                    <th>Âge prévu</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredAgents.map((agent) => {
                                    const info = retirementInfos.get(agent.id) || {};
                                    // Normaliser l'ID pour la recherche dans la Map
                                    const normalizedAgentId = typeof agent.id === 'string' ? parseInt(agent.id, 10) : agent.id;
                                    const prolongement = prolongements.get(normalizedAgentId) || prolongements.get(agent.id);
                                    
                                    // Condition simplifiée et plus permissive
                                    // Un prolongement est valide s'il existe et est un objet
                                    // On accepte même si certaines propriétés sont manquantes
                                    const hasProlongement = prolongement !== null && 
                                                           prolongement !== undefined && 
                                                           typeof prolongement === 'object';
                                    
                                    // Log de débogage pour l'agent spécifique mentionné par l'utilisateur
                                    if (agent.matricule === 'M0008' || agent.nom?.includes('TEST DIRECTEUR DE CABINET') || agent.nom?.includes('TEST')) {
                                        console.log(`🔍 DEBUG Agent ${agent.id} (${agent.nom} ${agent.prenom}, Matricule: ${agent.matricule}):`, {
                                            prolongementInMap: !!prolongement,
                                            prolongement: prolongement,
                                            hasProlongement: hasProlongement,
                                            prolongementId: prolongement?.id,
                                            idAgent: prolongement?.id_agent,
                                            numeroActe: prolongement?.numero_acte,
                                            totalProlongementsInMap: prolongements.size,
                                            agentIdsInMap: Array.from(prolongements.keys()),
                                            prolongementKeys: prolongement ? Object.keys(prolongement) : [],
                                            prolongementStringified: prolongement ? JSON.stringify(prolongement, null, 2) : 'null'
                                        });
                                    }
                                    
                                    // Log pour débogage si le prolongement existe mais ne passe pas la condition
                                    if (prolongement && !hasProlongement) {
                                        console.warn(`⚠️ Prolongement trouvé pour agent ${agent.id} (${agent.nom} ${agent.prenom}) mais ne passe pas la validation:`, {
                                            prolongementType: typeof prolongement,
                                            prolongementValue: prolongement,
                                            isNull: prolongement === null,
                                            isUndefined: prolongement === undefined,
                                            isObject: typeof prolongement === 'object'
                                        });
                                    }
                                    
                                    return (
                                        <tr key={agent.id}>
                                            <td>
                                                <div className="fw-bold text-uppercase">
                                                    {agent.nom} {agent.prenom}
                                                </div>
                                                <small className="text-dark fw-semibold">
                                                    Matricule : {agent.matricule || 'N/A'}
                                                </small>
                                            </td>
                                            <td>{getDirectionLabel(agent) || <span className="text-dark fw-semibold">Aucun</span>}</td>
                                            <td>{getSousDirectionLabel(agent) || <span className="text-dark fw-semibold">Aucun</span>}</td>
                                            <td>{getServiceLabel(agent) || <span className="text-dark fw-semibold">Aucun</span>}</td>
                                            <td>
                                                {info.retirementYear ? (
                                                    <span className="fw-semibold text-dark" style={{ backgroundColor: '#fff', padding: '4px 8px', border: '1px solid #dee2e6', borderRadius: 4 }}>
                                                        {info.retirementYear}
                                                    </span>
                                                ) : (
                                                    'N/A'
                                                )}
                                            </td>
                                            <td>{info.retirementAge ? `${info.retirementAge} ans` : 'N/A'}</td>
                                            <td>
                                                <div className="d-flex gap-2">
                                                    {hasProlongement && (
                                                        <Button
                                                            color="info"
                                                            size="sm"
                                                            onClick={async () => {
                                                                // Recharger les données depuis l'API pour avoir les données les plus récentes
                                                                const freshProlongement = await loadSingleProlongement(normalizedAgentId);
                                                                if (freshProlongement) {
                                                                    setSelectedProlongement(freshProlongement);
                                                                } else {
                                                                    // Si le rechargement échoue, utiliser les données de la Map
                                                                    setSelectedProlongement(prolongement);
                                                                }
                                                                setViewActeModalOpen(true);
                                                            }}
                                                            title="Voir l'acte de prolongement"
                                                        >
                                                            <MdVisibility className="me-1" />
                                                            Voir l'acte
                                                        </Button>
                                                    )}
                                                    <Button
                                                        color="warning"
                                                        size="sm"
                                                        onClick={() => openModal(agent)}
                                                    >
                                                        <MdTrendingUp className="me-1" />
                                                        Prolonger
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </Table>
                    </div>
                )}
            </CardBody>

            <Modal isOpen={modalOpen} toggle={closeModal}>
                <ModalHeader toggle={closeModal}>
                    Prolonger la retraite
                </ModalHeader>
                <ModalBody>
                    {modalError && (
                        <Alert color="danger">
                            {modalError}
                        </Alert>
                    )}
                    {selectedAgent && (
                        <>
                            <p className="mb-2">
                                Agent : <strong>{selectedAgent.nom} {selectedAgent.prenom}</strong>
                            </p>
                            <p className="mb-2">
                                Année actuelle prévue :{' '}
                                {selectedAgent.retirementInfo?.retirementYear || 'N/A'}
                            </p>
                            <p className="mb-3">
                                Âge actuel prévu :{' '}
                                {selectedAgent.baseRetirementAge
                                    ? `${selectedAgent.baseRetirementAge} ans`
                                    : 'N/A'}
                            </p>
                            <FormGroup>
                                <Label>Numéro de l'acte <span className="text-danger">*</span></Label>
                                <Input
                                    type="text"
                                    value={numeroActe}
                                    onChange={(e) => setNumeroActe(e.target.value)}
                                    placeholder="Saisir le numéro de l'acte"
                                    required
                                />
                            </FormGroup>
                            <FormGroup>
                                <Label>Nature de l'acte <span className="text-danger">*</span></Label>
                                <Input
                                    type="select"
                                    value={natureActe}
                                    onChange={(e) => {
                                        setNatureActe(e.target.value);
                                        if (e.target.value !== 'AUTRES') {
                                            setAutreNature('');
                                        }
                                    }}
                                    required
                                >
                                    <option value="">Sélectionner la nature de l'acte</option>
                                    <option value="DÉCRET">DÉCRET</option>
                                    <option value="ARRÊTÉ">ARRÊTÉ</option>
                                    <option value="AUTRES">AUTRES</option>
                                </Input>
                                {natureActe === 'AUTRES' && (
                                    <Input
                                        type="text"
                                        value={autreNature}
                                        onChange={(e) => setAutreNature(e.target.value.toUpperCase())}
                                        placeholder="Saisir la nature de l'acte"
                                        className="mt-2"
                                        style={{ textTransform: 'uppercase' }}
                                        required
                                    />
                                )}
                            </FormGroup>
                            <FormGroup>
                                <Label>Date de l'acte <span className="text-danger">*</span></Label>
                                <Input
                                    type="date"
                                    value={dateActe}
                                    onChange={(e) => setDateActe(e.target.value)}
                                    required
                                />
                            </FormGroup>
                            <FormGroup>
                                <Label>Année de prolongement <span className="text-danger">*</span></Label>
                                <Input
                                    type="number"
                                    min="1"
                                    max={selectedAgent.baseRetirementAge ? (75 - selectedAgent.baseRetirementAge) : 15}
                                    value={nombreAnnees}
                                    onChange={(e) => {
                                        const years = e.target.value;
                                        setNombreAnnees(years);
                                        // Calculer automatiquement le nouvel âge et l'année de retraite
                                        if (years && selectedAgent.baseRetirementAge) {
                                            const yearsInt = parseInt(years, 10);
                                            if (!isNaN(yearsInt) && yearsInt > 0) {
                                                const newAge = selectedAgent.baseRetirementAge + yearsInt;
                                                if (newAge <= 75) {
                                                    setNewRetirementAge(newAge.toString());
                                                } else {
                                                    setNewRetirementAge('75');
                                                    setNombreAnnees((75 - selectedAgent.baseRetirementAge).toString());
                                                }
                                            }
                                        }
                                    }}
                                    placeholder="Saisir le nombre d'années de prolongement"
                                    required
                                />
                                <small className="text-muted">
                                    Le nombre d'années sera ajouté à l'âge actuel de retraite ({selectedAgent.baseRetirementAge || 60} ans). 
                                    {selectedAgent.baseRetirementAge && (
                                        <span> Maximum : {75 - selectedAgent.baseRetirementAge} ans (âge max 75 ans)</span>
                                    )}
                                </small>
                            </FormGroup>
                            <FormGroup>
                                <Label>Nouvel âge de départ en retraite (calculé automatiquement)</Label>
                                <Input
                                    type="number"
                                    min={selectedAgent.baseRetirementAge ? selectedAgent.baseRetirementAge + 1 : 60}
                                    max="75"
                                    value={newRetirementAge}
                                    readOnly
                                    style={{ backgroundColor: '#f8f9fa', cursor: 'not-allowed' }}
                                />
                                <small className="text-muted">
                                    L'âge est calculé automatiquement à partir de l'année de prolongement. 
                                    {selectedAgent.retirementInfo?.birthDate && newRetirementAge && (() => {
                                        const birthDate = new Date(selectedAgent.retirementInfo.birthDate);
                                        if (!Number.isNaN(birthDate.getTime())) {
                                            const birthYear = birthDate.getFullYear();
                                            const newRetirementYear = birthYear + parseInt(newRetirementAge, 10);
                                            return <span> La nouvelle année de retraite sera : {newRetirementYear}</span>;
                                        }
                                        return null;
                                    })()}
                                </small>
                            </FormGroup>
                            <FormGroup>
                                <Label>Fichier <span className="text-danger">*</span></Label>
                                <Input
                                    type="file"
                                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                    onChange={(e) => {
                                        const file = e.target.files && e.target.files[0] ? e.target.files[0] : null;
                                        setUploadedFile(file);
                                    }}
                                    required
                                />
                                <small className="text-muted">
                                    Uploader le fichier de prolongation de retraite (PDF, DOC, DOCX, JPG, JPEG, PNG)
                                </small>
                                {uploadedFile && (
                                    <div className="mt-2">
                                        <Alert color="info" className="mb-0 py-2">
                                            <i className="fa fa-file me-2"></i>
                                            Fichier sélectionné : {uploadedFile.name}
                                        </Alert>
                                    </div>
                                )}
                            </FormGroup>
                        </>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button color="secondary" onClick={closeModal} disabled={saving || resetting}>
                        Annuler
                    </Button>
                    <Button
                        color="danger"
                        onClick={handleResetRetirement}
                        disabled={saving || resetting}
                    >
                        {resetting && <Spinner size="sm" color="light" className="me-2" />}
                        Restaurer la date initiale
                    </Button>
                    <Button
                        color="primary"
                        onClick={handleExtendRetirement}
                        disabled={saving || resetting}
                    >
                        {saving && <Spinner size="sm" color="light" className="me-2" />}
                        Enregistrer
                    </Button>
                </ModalFooter>
            </Modal>

            {/* Modal pour voir l'acte de prolongement */}
            <Modal isOpen={viewActeModalOpen} toggle={() => setViewActeModalOpen(false)} size="lg">
                <ModalHeader toggle={() => setViewActeModalOpen(false)}>
                    Détails de l'acte de prolongement
                </ModalHeader>
                <ModalBody>
                    {selectedProlongement ? (
                        <>
                            <Row>
                                <Col md={6}>
                                    <FormGroup>
                                        <Label className="fw-bold">Numéro de l'acte</Label>
                                        <p className="mb-0">{selectedProlongement.numero_acte || 'Non renseigné'}</p>
                                    </FormGroup>
                                </Col>
                                <Col md={6}>
                                    <FormGroup>
                                        <Label className="fw-bold">Nature de l'acte</Label>
                                        <p className="mb-0">{selectedProlongement.nature_acte || 'Non renseigné'}</p>
                                    </FormGroup>
                                </Col>
                            </Row>
                            <Row>
                                <Col md={6}>
                                    <FormGroup>
                                        <Label className="fw-bold">Date de l'acte</Label>
                                        <p className="mb-0">
                                            {selectedProlongement.date_acte 
                                                ? new Date(selectedProlongement.date_acte).toLocaleDateString('fr-FR', {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric'
                                                })
                                                : 'Non renseigné'}
                                        </p>
                                    </FormGroup>
                                </Col>
                                <Col md={6}>
                                    <FormGroup>
                                        <Label className="fw-bold">Nombre d'années ajoutées</Label>
                                        <p className="mb-0">
                                            {selectedProlongement.nombre_annees ? `${selectedProlongement.nombre_annees} année(s)` : 'Non renseigné'}
                                        </p>
                                    </FormGroup>
                                </Col>
                            </Row>
                            <Row>
                                <Col md={6}>
                                    <FormGroup>
                                        <Label className="fw-bold">Âge de retraite initial</Label>
                                        <p className="mb-0">
                                            {selectedProlongement.age_retraite_initial ? `${selectedProlongement.age_retraite_initial} ans` : 'N/A'}
                                        </p>
                                    </FormGroup>
                                </Col>
                                <Col md={6}>
                                    <FormGroup>
                                        <Label className="fw-bold">Nouvel âge de retraite</Label>
                                        <p className="mb-0">
                                            {selectedProlongement.age_retraite_prolonge ? `${selectedProlongement.age_retraite_prolonge} ans` : 'N/A'}
                                        </p>
                                    </FormGroup>
                                </Col>
                            </Row>
                            {selectedProlongement.fichier && selectedProlongement.fichier.chemin && (
                                <FormGroup>
                                    <Label className="fw-bold">Fichier uploadé</Label>
                                    <div className="mt-2">
                                        <Alert color="info" className="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-2">
                                            <div className="flex-grow-1">
                                                <i className="fa fa-file me-2"></i>
                                                <strong>{selectedProlongement.fichier.nom}</strong>
                                                {selectedProlongement.fichier.taille && (
                                                    <small className="ms-2 text-muted">
                                                        ({(selectedProlongement.fichier.taille / 1024).toFixed(2)} KB)
                                                    </small>
                                                )}
                                            </div>
                                            <div className="d-flex flex-wrap gap-2">
                                                <Button
                                                    type="button"
                                                    color="primary"
                                                    size="sm"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        if (!currentProlongementAgentId) {
                                                            alert("Aucun document n'est associé à cet acte.");
                                                            return;
                                                        }
                                                        openProlongementDocument(currentProlongementAgentId);
                                                    }}
                                                >
                                                    <MdVisibility className="me-1" />
                                                    Voir
                                                </Button>
                                                <Button
                                                    type="button"
                                                    color="success"
                                                    size="sm"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        if (!currentProlongementAgentId) {
                                                            alert("Aucun document n'est associé à cet acte.");
                                                            return;
                                                        }
                                                        downloadProlongementDocument(currentProlongementAgentId);
                                                    }}
                                                >
                                                    <MdDownload className="me-1" />
                                                    Télécharger
                                                </Button>
                                                <Button
                                                    type="button"
                                                    color="secondary"
                                                    size="sm"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        if (!currentProlongementAgentId) {
                                                            alert("Aucun document n'est associé à cet acte.");
                                                            return;
                                                        }
                                                        openPrintModalForAgent(currentProlongementAgentId);
                                                    }}
                                                >
                                                    <MdPrint className="me-1" />
                                                    Imprimer
                                                </Button>
                                            </div>
                                        </Alert>
                                        <div className="mt-3 w-100">
                                            {previewError && (
                                                <Alert color="danger" className="mb-3">
                                                    {previewError}
                                                </Alert>
                                            )}
                                            {previewLoading ? (
                                                <div className="text-center py-4">
                                                    <Spinner color="primary" />
                                                    <p className="mt-2 mb-0">Chargement du document...</p>
                                                </div>
                                            ) : previewMatchesSelection ? (
                                                isImageType(previewMeta?.mimeType, previewMeta?.fileName) ? (
                                                    <img
                                                        src={previewUrl}
                                                        alt="Aperçu de l'acte de prolongement"
                                                        style={{ maxWidth: '100%', border: '1px solid #dee2e6', borderRadius: 4 }}
                                                    />
                                                ) : (
                                                    <iframe
                                                        src={previewUrl}
                                                        title="Aperçu de l'acte de prolongement"
                                                        style={{ width: '100%', height: '500px', border: '1px solid #dee2e6', borderRadius: 4 }}
                                                    />
                                                )
                                            ) : (
                                                <Alert color="light" className="mb-0">
                                                    Cliquez sur <strong>Voir</strong> pour afficher le document dans cette fenêtre.
                                                </Alert>
                                            )}
                                        </div>
                                    </div>
                                </FormGroup>
                            )}
                            {selectedProlongement.date_prolongement && (
                                <FormGroup>
                                    <Label className="fw-bold">Date du prolongement</Label>
                                    <p className="mb-0">
                                        {new Date(selectedProlongement.date_prolongement).toLocaleDateString('fr-FR', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </p>
                                </FormGroup>
                            )}
                        </>
                    ) : (
                        <Alert color="warning">
                            Aucune information de prolongement disponible.
                        </Alert>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button color="secondary" onClick={() => setViewActeModalOpen(false)}>
                        Fermer
                    </Button>
                </ModalFooter>
            </Modal>

            <Modal isOpen={printModalOpen} toggle={() => setPrintModalOpen(false)} size="xl">
                <ModalHeader toggle={() => setPrintModalOpen(false)}>
                    Impression de l'acte de prolongement
                </ModalHeader>
                <ModalBody>
                    {printModalError && (
                        <Alert color="danger" className="mb-3">
                            {printModalError}
                        </Alert>
                    )}
                    {printModalLoading ? (
                        <div className="text-center py-5">
                            <Spinner color="primary" />
                            <p className="mt-3 mb-0">Préparation du document...</p>
                        </div>
                    ) : printModalUrl ? (
                        isImageType(printModalMeta?.mimeType, printModalMeta?.fileName) ? (
                            <img
                                src={printModalUrl}
                                alt="Aperçu avant impression"
                                style={{ maxWidth: '100%', border: '1px solid #dee2e6', borderRadius: 4 }}
                            />
                        ) : (
                            <iframe
                                src={printModalUrl}
                                title="Aperçu avant impression"
                                style={{ width: '100%', height: '600px', border: '1px solid #dee2e6', borderRadius: 4 }}
                            />
                        )
                    ) : (
                        <Alert color="light" className="mb-0">
                            Sélectionnez un acte pour préparer l'impression.
                        </Alert>
                    )}
                </ModalBody>
                <ModalFooter>
                    <Button color="secondary" onClick={() => setPrintModalOpen(false)}>
                        Fermer
                    </Button>
                    <Button color="primary" onClick={triggerPrintFromModal} disabled={!printModalUrl || printModalLoading}>
                        <MdPrint className="me-2" />
                        Lancer l'impression
                    </Button>
                </ModalFooter>
            </Modal>
        </Card>
    );
};

export default ProlongementRetraitePage;


