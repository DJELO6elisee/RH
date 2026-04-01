import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
    Alert,
    Badge,
    Button,
    ButtonDropdown,
    Card,
    CardBody,
    CardHeader,
    CardTitle,
    Col,
    DropdownItem,
    DropdownMenu,
    DropdownToggle,
    FormGroup,
    Input,
    Label,
    Row,
    Spinner,
    Table,
    Modal,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Collapse
} from 'reactstrap';
import {
    MdApartment,
    MdExpandLess,
    MdExpandMore,
    MdGroup,
    MdRefresh,
    MdSearch,
    MdVisibility,
    MdFileDownload,
    MdPrint
} from 'react-icons/md';
import { useAuth } from '../contexts/AuthContext';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { saveAs } from 'file-saver';
import {
    buildGroupedDataFromHierarchyTree,
    exportHierarchicalReportExcel
} from '../utils/hierarchicalReportExcel';

const DEFAULT_LABELS = {
    direction: 'Direction non renseignée',
    service: 'Service non renseigné',
    sousDirection: 'Sous-direction non renseignée',
    job: 'Emploi non renseigné'
};

const VerificationRetraitesPage = () => {
    const { user } = useAuth();
    const [agents, setAgents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filtersApplied, setFiltersApplied] = useState(false);
    const [currentFilters, setCurrentFilters] = useState({
        periodYears: '',
        directionId: '',
        direction: '',
        serviceId: '',
        service: '',
        sousDirectionId: '',
        sousDirection: '',
        search: ''
    });
    const [periodYears, setPeriodYears] = useState('');
    const [selectedDirectionId, setSelectedDirectionId] = useState('');
    const [selectedDirectionLabel, setSelectedDirectionLabel] = useState('');
    const [selectedServiceId, setSelectedServiceId] = useState('');
    const [selectedServiceLabel, setSelectedServiceLabel] = useState('');
    const [selectedSousDirectionId, setSelectedSousDirectionId] = useState('');
    const [selectedSousDirectionLabel, setSelectedSousDirectionLabel] = useState('');
    const [expandedDirections, setExpandedDirections] = useState({});
    const [expandedServices, setExpandedServices] = useState({});
    const [directionsList, setDirectionsList] = useState([]);
    const [servicesList, setServicesList] = useState([]);
    const [sousDirectionsList, setSousDirectionsList] = useState([]);
    const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
    const [projectionExportDropdownOpen, setProjectionExportDropdownOpen] = useState(false);
    const [hierarchicalExportDropdownOpen, setHierarchicalExportDropdownOpen] = useState(false);
    const [jobExportDropdownOpen, setJobExportDropdownOpen] = useState(false);
    const initialFiltersAppliedRef = useRef(false);
    const [directionSuggestions, setDirectionSuggestions] = useState([]);
    const [serviceSuggestions, setServiceSuggestions] = useState([]);
    const [sousDirectionSuggestions, setSousDirectionSuggestions] = useState([]);
    const [isDirectionInputFocused, setIsDirectionInputFocused] = useState(false);
    const [isServiceInputFocused, setIsServiceInputFocused] = useState(false);
    const [isSousDirectionInputFocused, setIsSousDirectionInputFocused] = useState(false);
    const [expandedJobs, setExpandedJobs] = useState({});
    const [searchSectionOpen, setSearchSectionOpen] = useState(false);

    const getAuthHeaders = () => {
        const token = localStorage.getItem('token');
        return {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` })
        };
    };

    const loadAgents = async () => {
        try {
            setLoading(true);
            setError(null);

            const buildUrl = (statut) => {
                const params = new URLSearchParams({
                    id_type_d_agent: '1',
                    limit: '5000',
                    sortBy: 'nom',
                    sortOrder: 'ASC'
                });

                if (statut) {
                    params.append('statut_emploi', statut);
                }

                if (user?.organization?.type === 'ministere' && user?.organization?.id) {
                    params.append('id_ministere', user.organization.id);
                }

                return `https://tourisme.2ise-groupe.com/api/agents?${params.toString()}`;
            };

            const [retiredResponse, activeResponse] = await Promise.all([
                fetch(buildUrl('retraite'), { headers: getAuthHeaders() }),
                fetch(buildUrl('actif'), { headers: getAuthHeaders() })
            ]);

            if (!retiredResponse.ok) {
                throw new Error(`HTTP error (retraités) status: ${retiredResponse.status}`);
            }

            if (!activeResponse.ok) {
                throw new Error(`HTTP error (actifs) status: ${activeResponse.status}`);
            }

            const [retiredResult, activeResult] = await Promise.all([
                retiredResponse.json(),
                activeResponse.json()
            ]);

            const extractData = (result) => {
                if (result?.data && Array.isArray(result.data)) {
                    return result.data;
                }
                if (Array.isArray(result)) {
                    return result;
                }
                if (result?.success && Array.isArray(result.data)) {
                    return result.data;
                }
                return [];
            };

            let combinedAgents = [
                ...extractData(retiredResult),
                ...extractData(activeResult)
            ];

            if (user?.organization?.type === 'ministere' && user?.organization?.id) {
                const targetMinistereId = String(user.organization.id);
                combinedAgents = combinedAgents.filter((agent) => {
                    const agentMinistere =
                        agent.id_ministere ??
                        agent.id_ministere_actuel ??
                        agent.ministere_id ??
                        agent.id_ministere_principal ??
                        null;

                    if (agentMinistere === null || agentMinistere === undefined) {
                        return false;
                    }

                    return String(agentMinistere) === targetMinistereId;
                });
            }

            setAgents(combinedAgents);
        } catch (err) {
            console.error('Erreur lors du chargement des agents:', err);
            setError('Impossible de récupérer les données de retraite pour le moment.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadAgents();
    }, []);

    useEffect(() => {
        setSelectedServiceId('');
        setSelectedServiceLabel('');
    }, [selectedDirectionId]);

    useEffect(() => {
        setSelectedSousDirectionId('');
        setSelectedSousDirectionLabel('');
    }, [selectedServiceId]);

    useEffect(() => {
        return () => {
        };
    }, []);

    useEffect(() => {
        if (
            !initialFiltersAppliedRef.current &&
            agents.length > 0
        ) {
            setCurrentFilters({
                periodYears,
                directionId: selectedDirectionId,
                direction: selectedDirectionLabel,
                serviceId: selectedServiceId,
                service: selectedServiceLabel,
                sousDirectionId: selectedSousDirectionId,
                sousDirection: selectedSousDirectionLabel,
                search: searchTerm
            });
            setFiltersApplied(true);
            initialFiltersAppliedRef.current = true;
        }
    }, [agents]);

    useEffect(() => {
        const loadDirections = async () => {
            try {
                let url = 'https://tourisme.2ise-groupe.com/api/directions/select/all';
                const params = new URLSearchParams();
                if (user?.organization?.type === 'ministere' && user?.organization?.id) {
                    params.append('id_ministere', user.organization.id);
                }
                if ([...params].length > 0) {
                    url += `?${params.toString()}`;
                }

                const response = await fetch(url, {
                    headers: getAuthHeaders()
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const result = await response.json();
                if (Array.isArray(result)) {
                    setDirectionsList(result);
                } else if (result?.success && Array.isArray(result.data)) {
                    setDirectionsList(result.data);
                }
            } catch (err) {
                console.error('Erreur lors du chargement des directions:', err);
            }
        };

        const loadServices = async () => {
            try {
                let url = 'https://tourisme.2ise-groupe.com/api/services/select/all';
                const params = new URLSearchParams();
                if (user?.organization?.type === 'ministere' && user?.organization?.id) {
                    params.append('id_ministere', user.organization.id);
                }
                if ([...params].length > 0) {
                    url += `?${params.toString()}`;
                }

                const response = await fetch(url, {
                    headers: getAuthHeaders()
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const result = await response.json();
                if (Array.isArray(result)) {
                    setServicesList(result);
                } else if (result?.success && Array.isArray(result.data)) {
                    setServicesList(result.data);
                }
            } catch (err) {
                console.error('Erreur lors du chargement des services:', err);
            }
        };

        const loadSousDirections = async () => {
            try {
                let url = 'https://tourisme.2ise-groupe.com/api/sous_directions/select/all';
                const params = new URLSearchParams();
                if (user?.organization?.type === 'ministere' && user?.organization?.id) {
                    params.append('id_ministere', user.organization.id);
                }
                if ([...params].length > 0) {
                    url += `?${params.toString()}`;
                }

                const response = await fetch(url, {
                    headers: getAuthHeaders()
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const result = await response.json();
                if (Array.isArray(result)) {
                    setSousDirectionsList(result);
                } else if (result?.success && Array.isArray(result.data)) {
                    setSousDirectionsList(result.data);
                }
            } catch (err) {
                console.error('Erreur lors du chargement des sous-directions:', err);
            }
        };

        loadDirections();
        loadServices();
        loadSousDirections();
    }, [user?.organization?.id, user?.organization?.type]);

    const calculateRetirementAge = (gradeLibelle) => {
        if (!gradeLibelle) return 60;
        const normalized = gradeLibelle.toUpperCase().trim();
        const grades65 = ['A4', 'A5', 'A6', 'A7'];
        return grades65.includes(normalized) ? 65 : 60;
    };

    const buildRetirementDateFromBirth = (agent) => {
        if (!agent?.date_de_naissance) return null;
        const birthDate = new Date(agent.date_de_naissance);
        if (Number.isNaN(birthDate.getTime())) return null;
        const age = calculateRetirementAge(agent.grade_libele || agent.grade_libelle);
        const retirementYear = birthDate.getFullYear() + age;
        return new Date(retirementYear, 11, 31);
    };

    const getRetirementDateValue = (agent) => {
        const rawDate =
            agent.date_retraite ||
            agent.date_retraite_calculee ||
            agent.date_de_retraite;
        if (!rawDate) {
            return buildRetirementDateFromBirth(agent);
        }
        const parsed = new Date(rawDate);
        if (!Number.isNaN(parsed.getTime())) {
            return parsed;
        }
        return buildRetirementDateFromBirth(agent);
    };

    const toggleDirection = (directionName) => {
        setExpandedDirections((prev) => ({
            ...prev,
            [directionName]: !prev[directionName]
        }));
    };

    const toggleService = (directionName, serviceName) => {
        const key = `${directionName}__${serviceName}`;
        setExpandedServices((prev) => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    const toggleJobGroup = (jobName) => {
        setExpandedJobs((prev) => ({
            ...prev,
            [jobName]: !prev[jobName]
        }));
    };

    const getDirectionLabelFromEntity = (entity) =>
        entity?.libelle ||
        entity?.libele ||
        entity?.nom ||
        entity?.name ||
        '';

    const getServiceLabelFromEntity = (service) =>
        service?.libelle ||
        service?.libele ||
        service?.nom ||
        service?.name ||
        '';

    const getServiceDirectionLabel = (service) =>
        service?.direction_libelle ||
        service?.direction_nom ||
        service?.direction ||
        '';

    const getSousDirectionLabelFromEntity = (sous) =>
        sous?.libelle ||
        sous?.libele ||
        sous?.nom ||
        sous?.name ||
        '';

    const getSousDirectionServiceLabel = (sous) =>
        sous?.service_libelle ||
        sous?.service_libele ||
        sous?.service ||
        '';

    const getSousDirectionDirectionLabel = (sous) =>
        sous?.direction_libelle ||
        sous?.direction_libele ||
        sous?.direction_nom ||
        sous?.direction ||
        '';

    const getDirectionIdFromEntity = (direction) =>
        direction?.id ??
        direction?.id_direction ??
        direction?.direction_id ??
        direction?.value ??
        null;

    const getServiceIdFromEntity = (service) =>
        service?.id ??
        service?.id_service ??
        service?.service_id ??
        null;

    const getServiceDirectionId = (service) =>
        service?.id_direction ??
        service?.direction_id ??
        service?.direction?.id ??
        null;

    const getSousDirectionIdFromEntity = (sous) =>
        sous?.id ??
        sous?.id_sous_direction ??
        sous?.sous_direction_id ??
        null;

    const getSousDirectionServiceId = (sous) =>
        sous?.id_service ??
        sous?.service_id ??
        sous?.service?.id ??
        null;

    const getSousDirectionDirectionIdValue = (sous) =>
        sous?.id_direction ??
        sous?.direction_id ??
        sous?.direction?.id ??
        null;

    const normalizeLabel = (value) => {
        if (!value) return '';
        return value
            .toString()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-zA-Z0-9]+/g, ' ')
            .trim()
            .toLowerCase();
    };

    const getDirectionLabelFromAgent = (agent) => {
        const dir =
            agent.direction_libelle?.trim() ||
            agent.direction_libele?.trim() ||
            agent.direction_generale_libelle?.trim();
        return dir || DEFAULT_LABELS.direction;
    };

    const getServiceLabelFromAgent = (agent) =>
        agent.service_libele ||
        agent.service_libelle ||
        DEFAULT_LABELS.service;

    const getSousDirectionLabelFromAgent = (agent) =>
        agent.sous_direction_libele ||
        agent.sous_direction_libelle ||
        DEFAULT_LABELS.sousDirection;

    const formatRetirementDate = (agent) => {
        const date = getRetirementDateValue(agent);
        return date ? date.toLocaleDateString('fr-FR') : '-';
    };

    const escapeHtml = (value) => {
        if (value === undefined || value === null) return '';
        return value
            .toString()
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    };

    const directionOptions = useMemo(() => {
        if (!Array.isArray(directionsList)) {
            return [];
        }

        const seen = new Set();
        const options = directionsList
            .map((direction) => {
                const label = getDirectionLabelFromEntity(direction)?.trim();
                const id = getDirectionIdFromEntity(direction);
                if (!label || id === null || id === undefined) {
                    return null;
                }
                const idStr = String(id);
                if (seen.has(idStr)) {
                    return null;
                }
                seen.add(idStr);
                return { id: idStr, label };
            })
            .filter(Boolean)
            .sort((a, b) => a.label.localeCompare(b.label, 'fr'));

        return options;
    }, [directionsList]);

    const directionOptionById = useMemo(() => {
        const map = new Map();
        directionOptions.forEach((option) => {
            map.set(option.id, option);
        });
        return map;
    }, [directionOptions]);

    const directionOptionByLabel = useMemo(() => {
        const map = new Map();
        directionOptions.forEach((option) => {
            map.set(normalizeLabel(option.label), option);
        });
        return map;
    }, [directionOptions]);

    const updateDirectionSuggestions = useCallback(
        (inputLabel) => {
            const normalizedInput = normalizeLabel(inputLabel);
            if (!normalizedInput) {
                setDirectionSuggestions(directionOptions.slice(0, 10));
                return;
            }
            const matches = directionOptions.filter((option) =>
                normalizeLabel(option.label).includes(normalizedInput)
            );
            setDirectionSuggestions(matches.slice(0, 10));
        },
        [directionOptions]
    );

    const serviceOptions = useMemo(() => {
        if (!Array.isArray(servicesList)) {
            return [];
        }

        const selectedDirectionIdStr = selectedDirectionId ? String(selectedDirectionId) : '';
        const seen = new Set();

        const options = servicesList
            .map((service) => {
                const id = getServiceIdFromEntity(service);
                const label = getServiceLabelFromEntity(service)?.trim();
                if (!label || id === null || id === undefined) {
                    return null;
                }

                const directionId = getServiceDirectionId(service);
                if (selectedDirectionIdStr && String(directionId ?? '') !== selectedDirectionIdStr) {
                    return null;
                }

                const idStr = String(id);
                if (seen.has(idStr)) {
                    return null;
                }
                seen.add(idStr);
                return {
                    id: idStr,
                    label,
                    directionId: directionId ? String(directionId) : ''
                };
            })
            .filter(Boolean)
            .sort((a, b) => a.label.localeCompare(b.label, 'fr'));

        return options;
    }, [servicesList, selectedDirectionId]);

    const serviceOptionById = useMemo(() => {
        const map = new Map();
        serviceOptions.forEach((option) => {
            map.set(option.id, option);
        });
        return map;
    }, [serviceOptions]);

    const serviceOptionByLabel = useMemo(() => {
        const map = new Map();
        serviceOptions.forEach((option) => {
            map.set(normalizeLabel(option.label), option);
        });
        return map;
    }, [serviceOptions]);

    const updateServiceSuggestions = useCallback(
        (inputLabel) => {
            const normalizedInput = normalizeLabel(inputLabel);
            if (!normalizedInput) {
                setServiceSuggestions(serviceOptions.slice(0, 10));
                return;
            }
            const matches = serviceOptions.filter((option) =>
                normalizeLabel(option.label).includes(normalizedInput)
            );
            setServiceSuggestions(matches.slice(0, 10));
        },
        [serviceOptions]
    );

    const sousDirectionOptions = useMemo(() => {
        if (!Array.isArray(sousDirectionsList)) {
            return [];
        }

        const selectedDirectionIdStr = selectedDirectionId ? String(selectedDirectionId) : '';
        const selectedServiceIdStr = selectedServiceId ? String(selectedServiceId) : '';
        const seen = new Set();

        const options = sousDirectionsList
            .map((sous) => {
                const id = getSousDirectionIdFromEntity(sous);
                const label = getSousDirectionLabelFromEntity(sous)?.trim();
                if (!label || id === null || id === undefined) {
                    return null;
                }

                const directionId = getSousDirectionDirectionIdValue(sous);
                const serviceId = getSousDirectionServiceId(sous);

                if (selectedDirectionIdStr && String(directionId ?? '') !== selectedDirectionIdStr) {
                    return null;
                }

                if (selectedServiceIdStr && String(serviceId ?? '') !== selectedServiceIdStr) {
                    return null;
                }

                const idStr = String(id);
                if (seen.has(idStr)) {
                    return null;
                }
                seen.add(idStr);
                return {
                    id: idStr,
                    label,
                    directionId: directionId ? String(directionId) : '',
                    serviceId: serviceId ? String(serviceId) : ''
                };
            })
            .filter(Boolean)
            .sort((a, b) => a.label.localeCompare(b.label, 'fr'));

        return options;
    }, [sousDirectionsList, selectedDirectionId, selectedServiceId]);

    const sousDirectionOptionById = useMemo(() => {
        const map = new Map();
        sousDirectionOptions.forEach((option) => {
            map.set(option.id, option);
        });
        return map;
    }, [sousDirectionOptions]);

    const sousDirectionOptionByLabel = useMemo(() => {
        const map = new Map();
        sousDirectionOptions.forEach((option) => {
            map.set(normalizeLabel(option.label), option);
        });
        return map;
    }, [sousDirectionOptions]);

    const updateSousDirectionSuggestions = useCallback(
        (inputLabel) => {
            const normalizedInput = normalizeLabel(inputLabel);
            if (!normalizedInput) {
                setSousDirectionSuggestions(sousDirectionOptions.slice(0, 10));
                return;
            }
            const matches = sousDirectionOptions.filter((option) =>
                normalizeLabel(option.label).includes(normalizedInput)
            );
            setSousDirectionSuggestions(matches.slice(0, 10));
        },
        [sousDirectionOptions]
    );

    useEffect(() => {
        if (!isDirectionInputFocused && !selectedDirectionLabel) {
            return;
        }
        if (isDirectionInputFocused) {
            updateDirectionSuggestions(selectedDirectionLabel);
        }
    }, [
        directionOptions,
        selectedDirectionLabel,
        isDirectionInputFocused,
        updateDirectionSuggestions
    ]);

    useEffect(() => {
        if (!isServiceInputFocused && !selectedServiceLabel) {
            return;
        }
        if (isServiceInputFocused) {
            updateServiceSuggestions(selectedServiceLabel);
        }
    }, [
        serviceOptions,
        selectedServiceLabel,
        isServiceInputFocused,
        updateServiceSuggestions
    ]);

    useEffect(() => {
        if (!isSousDirectionInputFocused && !selectedSousDirectionLabel) {
            return;
        }
        if (isSousDirectionInputFocused) {
            updateSousDirectionSuggestions(selectedSousDirectionLabel);
        }
    }, [
        sousDirectionOptions,
        selectedSousDirectionLabel,
        isSousDirectionInputFocused,
        updateSousDirectionSuggestions
    ]);

    const agentsFilteredByPeriod = useMemo(() => {
        if (!filtersApplied) return [];

        const {
            periodYears: appliedYears,
            directionId: appliedDirectionId,
            direction: appliedDirectionLabel,
            serviceId: appliedServiceId,
            service: appliedServiceLabel,
            sousDirectionId: appliedSousDirectionId,
            sousDirection: appliedSousDirectionLabel,
            search
        } = currentFilters;

        const normalizedDirectionFilter = normalizeLabel(appliedDirectionLabel);
        const normalizedServiceFilter = normalizeLabel(appliedServiceLabel);
        const normalizedSousDirectionFilter = normalizeLabel(appliedSousDirectionLabel);

        const filteredByStructure = agents.filter((agent) => {
            const agentDirectionLabel = agent.direction_libelle || DEFAULT_LABELS.direction;
            const agentServiceLabel =
                agent.service_libele?.trim() ||
                agent.service_libelle?.trim() ||
                DEFAULT_LABELS.service;
            const agentSousDirectionLabel =
                agent.sous_direction_libelle?.trim() ||
                agent.sous_direction_libele?.trim() ||
                DEFAULT_LABELS.sousDirection;

            const normalizedAgentDirection = normalizeLabel(agentDirectionLabel);
            const normalizedAgentService = normalizeLabel(agentServiceLabel);
            const normalizedAgentSousDirection = normalizeLabel(agentSousDirectionLabel);

            const directionOption = directionOptionByLabel.get(normalizedAgentDirection);
            const serviceOption = serviceOptionByLabel.get(normalizedAgentService);
            const sousDirectionOption = sousDirectionOptionByLabel.get(normalizedAgentSousDirection);

            if (appliedDirectionId) {
                if (directionOption) {
                    if (directionOption.id !== appliedDirectionId) {
                        return false;
                    }
                } else if (normalizedDirectionFilter) {
                    if (normalizedAgentDirection !== normalizedDirectionFilter) {
                        return false;
                    }
                } else {
                    return false;
                }
            }

            if (appliedServiceId) {
                if (serviceOption) {
                    if (serviceOption.id !== appliedServiceId) {
                        return false;
                    }
                } else if (normalizedServiceFilter) {
                    if (normalizedAgentService !== normalizedServiceFilter) {
                        return false;
                    }
                } else {
                    return false;
                }
            }

            if (appliedSousDirectionId) {
                if (sousDirectionOption) {
                    if (sousDirectionOption.id !== appliedSousDirectionId) {
                        return false;
                    }
                } else if (normalizedSousDirectionFilter) {
                    if (normalizedAgentSousDirection !== normalizedSousDirectionFilter) {
                        return false;
                    }
                } else {
                    return false;
                }
            }

            if (search) {
                const term = search.trim().toLowerCase();
                const fieldsToSearch = [
                    agent.nom,
                    agent.prenom,
                    agent.matricule,
                    agent.direction_libelle,
                    agent.service_libelle,
                    agent.service_libele,
                    agent.sous_direction_libelle,
                    agent.sous_direction_libele
                ];
                const matchesSearch = fieldsToSearch.some(
                    (value) => value && value.toLowerCase().includes(term)
                );
                if (!matchesSearch) {
                    return false;
                }
            }

            return true;
        });

        if (!appliedYears) {
            return filteredByStructure;
        }

        const yearsNumber = Number(appliedYears);
        if (Number.isNaN(yearsNumber) || yearsNumber <= 0) {
            return filteredByStructure;
        }

        const now = new Date();
        const horizon = new Date(now);
        horizon.setFullYear(now.getFullYear() + yearsNumber);

        return filteredByStructure.filter((agent) => {
            const retirementDate = getRetirementDateValue(agent);
            if (!retirementDate) return false;
            // Exclure les agents déjà retraités : le total "dans X ans" ne compte que les actifs qui partent à la retraite sur la période
            const isAlreadyRetired =
                /retrait/i.test(String(agent.statut_emploi_libelle || '')) ||
                /retrait/i.test(String(agent.statut_emploi || ''));
            if (isAlreadyRetired) return false;
            return retirementDate >= now && retirementDate <= horizon;
        });
    }, [
        agents,
        filtersApplied,
        currentFilters,
        directionOptionByLabel,
        serviceOptionByLabel,
        sousDirectionOptionByLabel
    ]);

    const handleApplyFilters = () => {
        setCurrentFilters({
            periodYears,
            directionId: selectedDirectionId,
            direction: selectedDirectionLabel,
            serviceId: selectedServiceId,
            service: selectedServiceLabel,
            sousDirectionId: selectedSousDirectionId,
            sousDirection: selectedSousDirectionLabel,
            search: searchTerm
        });
        setFiltersApplied(true);
    };

    const handleResetFilters = () => {
        setPeriodYears('');
        setSelectedDirectionId('');
        setSelectedDirectionLabel('');
        setSelectedServiceId('');
        setSelectedServiceLabel('');
        setSelectedSousDirectionId('');
        setSelectedSousDirectionLabel('');
        setSearchTerm('');
        setCurrentFilters({
            periodYears: '',
            directionId: '',
            direction: '',
            serviceId: '',
            service: '',
            sousDirectionId: '',
            sousDirection: '',
            search: ''
        });
        setFiltersApplied(true);
        initialFiltersAppliedRef.current = true;
    };

    useEffect(() => {
        if (!filtersApplied) return;

        setCurrentFilters((prev) => ({
            ...prev,
            periodYears,
            directionId: selectedDirectionId,
            direction: selectedDirectionLabel,
            serviceId: selectedServiceId,
            service: selectedServiceLabel,
            sousDirectionId: selectedSousDirectionId,
            sousDirection: selectedSousDirectionLabel,
            search: searchTerm
        }));
    }, [
        periodYears,
        selectedDirectionId,
        selectedDirectionLabel,
        selectedServiceId,
        selectedServiceLabel,
        selectedSousDirectionId,
        selectedSousDirectionLabel,
        searchTerm,
        filtersApplied
    ]);

    const handleSearchTermChange = (event) => {
        setSearchTerm(event.target.value);
    };

    const handleSearchKeyDown = (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            handleApplyFilters();
        }
    };

    const handleDirectionInputChange = (event) => {
        const value = event.target.value;
        setSelectedDirectionLabel(value);
        const exactMatch = directionOptionByLabel.get(normalizeLabel(value));
        setSelectedDirectionId(exactMatch?.id || '');
        updateDirectionSuggestions(value);
    };

    const handleDirectionPick = (option) => {
        setSelectedDirectionId(option.id);
        setSelectedDirectionLabel(option.label);
        setDirectionSuggestions([]);
    };

    const handleServiceInputChange = (event) => {
        const value = event.target.value;
        setSelectedServiceLabel(value);
        const exactMatch = serviceOptionByLabel.get(normalizeLabel(value));
        setSelectedServiceId(exactMatch?.id || '');
        updateServiceSuggestions(value);
    };

    const handleServicePick = (option) => {
        setSelectedServiceId(option.id);
        setSelectedServiceLabel(option.label);
        setServiceSuggestions([]);
    };

    const handleSousDirectionInputChange = (event) => {
        const value = event.target.value;
        setSelectedSousDirectionLabel(value);
        const exactMatch = sousDirectionOptionByLabel.get(normalizeLabel(value));
        setSelectedSousDirectionId(exactMatch?.id || '');
        updateSousDirectionSuggestions(value);
    };

    const handleSousDirectionPick = (option) => {
        setSelectedSousDirectionId(option.id);
        setSelectedSousDirectionLabel(option.label);
        setSousDirectionSuggestions([]);
    };

    const displayedAgents = useMemo(() => {
        if (!filtersApplied) return [];

        const { search } = currentFilters;
        const term = search.trim().toLowerCase();

        if (!term) {
            return agentsFilteredByPeriod;
        }

        return agentsFilteredByPeriod.filter((agent) => {
            const values = [
                agent.nom,
                agent.prenom,
                agent.matricule,
                agent.direction_libelle,
                agent.service_libelle,
                agent.service_libele,
                agent.sous_direction_libelle,
                agent.sous_direction_libele
            ];
            return values.some(
                (value) => value && value.toLowerCase().includes(term)
            );
        });
    }, [agentsFilteredByPeriod, filtersApplied, currentFilters]);

    const shouldShowResultsTable = filtersApplied;

    const totalAgentsFound = displayedAgents.length;
    const totalFonctionnaires = agents.length;
    const pageSize = 15;
    const totalPages = Math.max(1, Math.ceil(totalAgentsFound / pageSize));
    const [currentPage, setCurrentPage] = useState(1);
    useEffect(() => {
        setCurrentPage(1);
    }, [totalAgentsFound]);
    const paginatedAgents = displayedAgents.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    const resultsMessage = shouldShowResultsTable
        ? `${totalAgentsFound} agent(s) trouvés selon les filtres appliqués.`
        : 'Choisissez vos filtres puis cliquez sur Rechercher pour afficher les agents.';

    const agentsForExport = displayedAgents;

    const exportHeaders = useMemo(
        () => [
            'Nom et Prénoms',
            'Matricule',
            'Direction',
            'Service',
            'Sous-direction',
            'Date de Retraite'
        ],
        []
    );

    const jobReportHeaders = useMemo(
        () => [
            'N°',
            'Nom et Prénoms',
            'Matricule',
            'Direction',
            'Service',
            'Sous-direction',
            'Date de retraite'
        ],
        []
    );

    const buildExportRows = () =>
        agentsForExport.map((agent) => [
            `${agent.nom || ''} ${agent.prenom || ''}`.trim() || '-',
            agent.matricule || '-',
            getDirectionLabelFromAgent(agent),
            getServiceLabelFromAgent(agent),
            getSousDirectionLabelFromAgent(agent),
            formatRetirementDate(agent)
        ]);

    const handleExportExcel = () => {
        if (agentsForExport.length === 0) {
            alert('Aucun agent à exporter.');
            return;
        }

        const rows = buildExportRows();
        const worksheet = XLSX.utils.aoa_to_sheet([exportHeaders, ...rows]);
        worksheet['!cols'] = [
            { wch: 40 }, // Nom et Prénoms
            { wch: 18 }, // Matricule
            { wch: 45 }, // Direction
            { wch: 40 }, // Service
            { wch: 45 }, // Sous-direction
            { wch: 20 }  // Date de retraite
        ];
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Retraites');

        const today = new Date().toISOString().split('T')[0];
        XLSX.writeFile(workbook, `Retraites_${today}.xlsx`);
    };

    const handleExportWord = () => {
        if (agentsForExport.length === 0) {
            alert('Aucun agent à exporter.');
            return;
        }

        const maxRowsPerPage = 101;
        const rows = buildExportRows();
        const tableRows = rows
            .map((row, index) => {
                const rowHtml = `
                    <tr>
                        <td>${escapeHtml(row[0])}</td>
                        <td>${escapeHtml(row[1])}</td>
                        <td>${escapeHtml(row[2])}</td>
                        <td>${escapeHtml(row[3])}</td>
                        <td>${escapeHtml(row[4])}</td>
                        <td>${escapeHtml(row[5])}</td>
                    </tr>
                `;
                const needsBreak =
                    (index + 1) % maxRowsPerPage === 0 && index + 1 !== rows.length;
                return needsBreak
                    ? rowHtml + '<tr class="page-break"></tr>'
                    : rowHtml;
            })
            .join('');

        const generationDate = new Date();
        const wordContent = `
            <html xmlns:o="urn:schemas-microsoft-com:office:office"
                  xmlns:w="urn:schemas-microsoft-com:office:word"
                  xmlns="http://www.w3.org/TR/REC-html40">
                <head>
                    <meta charset="utf-8" />
                    <title>Liste des agents à la retraite</title>
                    <style>
                        body { font-family: 'Segoe UI', Arial, sans-serif; margin: 12px; color: #000; }
                        h1 { text-align: center; color: #000; font-size: 1.3rem; margin-bottom: 0.4rem; }
                        table { width: 100%; border-collapse: collapse; margin: 12px 0 0 0; font-size: 0.7rem; table-layout: fixed; }
                        th, td { border: 1px solid #999; padding: 3px; text-align: left; vertical-align: top; word-wrap: break-word; }
                        th { background-color: #f5f5f5; font-weight: 600; }
                        tr:nth-child(even) { background-color: #fafafa; }
                        tr.page-break { height: 0; border: none; page-break-after: always; }
                        .export-date { page-break-before: always; margin-top: 20px; font-size: 0.8rem; }
                    </style>
                </head>
                <body>
                    <h1>Liste des agents à la retraite</h1>
                    <table>
                        <thead>
                            <tr>
                                ${exportHeaders.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${tableRows}
                        </tbody>
                    </table>
                    <div class="export-date">
                        Date d'export : ${generationDate.toLocaleDateString('fr-FR')}
                    </div>
                </body>
            </html>
        `;

        const blob = new Blob([wordContent], { type: 'application/msword' });
        const today = new Date().toISOString().split('T')[0];
        saveAs(blob, `Retraites_${today}.doc`);
    };

    const handleExportJobProjectionExcel = () => {
        if (!hasJobProjection) {
            alert('Aucune projection par emploi à exporter.');
            return;
        }
        setJobExportDropdownOpen(false);

        const totalAgentsProjected = projectionJobs.reduce((sum, job) => sum + job.count, 0);
        const rows = [
            ['RAPPORT - AGENTS PARTANT À LA RETRAITE PAR EMPLOI'],
            [
                `Période : ${
                    currentFilters.periodYears ? `${currentFilters.periodYears} an(s)` : 'Non définie'
                }`
            ],
            [`Total d'agents concernés : ${totalAgentsProjected}`, '', '', '', '', '', ''],
            []
        ];

        let index = 1;
        projectionJobs.forEach((job) => {
            rows.push([`EMPLOI : ${job.jobName}`, '', '', '', '', '', '']);
            rows.push(jobReportHeaders);

            job.agents.forEach((agent) => {
                rows.push([
                    index++,
                    `${agent.nom || ''} ${agent.prenom || ''}`.trim() || '-',
                    agent.matricule || '-',
                    getDirectionLabelFromAgent(agent),
                    getServiceLabelFromAgent(agent),
                    getSousDirectionLabelFromAgent(agent),
                    formatRetirementDate(agent)
                ]);
            });

            rows.push([`Total ${job.jobName} : ${job.count} agent(s)`, '', '', '', '', '', '']);
            rows.push([]);
        });

        const worksheet = XLSX.utils.aoa_to_sheet(rows);
        
        // Configuration des largeurs de colonnes - augmenter la première colonne pour les titres
        worksheet['!cols'] = [
            { wch: 8 },  // N°
            { wch: 40 }, // Nom et Prénoms
            { wch: 18 }, // Matricule
            { wch: 32 }, // Direction
            { wch: 32 }, // Service
            { wch: 32 }, // Sous-direction
            { wch: 18 }  // Date de retraite
        ];

        // Fusion des cellules pour un meilleur affichage
        const merges = [];
        const numCols = 7; // Nombre de colonnes

        // Fusion du titre principal (ligne 0)
        merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: numCols - 1 } });
        
        // Fusion de la ligne période (ligne 1)
        merges.push({ s: { r: 1, c: 0 }, e: { r: 1, c: numCols - 1 } });
        
        // Fusion de la ligne total (ligne 2)
        merges.push({ s: { r: 2, c: 0 }, e: { r: 2, c: numCols - 1 } });

        // Formatage des cellules fusionnées pour permettre le retour à la ligne
        const cellRefs = {
            title: XLSX.utils.encode_cell({ r: 0, c: 0 }),
            period: XLSX.utils.encode_cell({ r: 1, c: 0 }),
            totalGeneral: XLSX.utils.encode_cell({ r: 2, c: 0 })
        };

        // Appliquer le formatage au titre principal
        if (worksheet[cellRefs.title]) {
            worksheet[cellRefs.title].s = {
                alignment: { wrapText: true, vertical: 'center', horizontal: 'center' },
                font: { bold: true, sz: 14 }
            };
        }

        // Appliquer le formatage à la ligne période
        if (worksheet[cellRefs.period]) {
            worksheet[cellRefs.period].s = {
                alignment: { wrapText: true, vertical: 'center', horizontal: 'center' },
                font: { bold: true }
            };
        }

        // Appliquer le formatage à la ligne total général
        if (worksheet[cellRefs.totalGeneral]) {
            worksheet[cellRefs.totalGeneral].s = {
                alignment: { wrapText: true, vertical: 'center', horizontal: 'left' },
                font: { bold: true }
            };
        }

        // Calculer les lignes pour chaque emploi
        let currentRow = 4; // Après la ligne vide (ligne 3)
        const jobTitleRows = [];
        const jobTotalRows = [];
        
        projectionJobs.forEach((job) => {
            // Fusion de la ligne titre emploi
            const jobTitleRow = currentRow;
            jobTitleRows.push(jobTitleRow);
            merges.push({ s: { r: jobTitleRow, c: 0 }, e: { r: jobTitleRow, c: numCols - 1 } });
            currentRow += 1; // Ligne des en-têtes
            currentRow += job.agents.length; // Lignes des agents
            // Fusion de la ligne total emploi
            const jobTotalRow = currentRow;
            jobTotalRows.push(jobTotalRow);
            merges.push({ s: { r: jobTotalRow, c: 0 }, e: { r: jobTotalRow, c: numCols - 1 } });
            currentRow += 2; // Ligne total + ligne vide
        });

        // Appliquer le formatage aux cellules de titre d'emploi
        jobTitleRows.forEach((row) => {
            const cellRef = XLSX.utils.encode_cell({ r: row, c: 0 });
            if (worksheet[cellRef]) {
                worksheet[cellRef].s = {
                    alignment: { wrapText: true, vertical: 'center', horizontal: 'left' },
                    font: { bold: true, sz: 12 }
                };
            }
        });

        // Appliquer le formatage aux cellules de total d'emploi
        jobTotalRows.forEach((row) => {
            const cellRef = XLSX.utils.encode_cell({ r: row, c: 0 });
            if (worksheet[cellRef]) {
                worksheet[cellRef].s = {
                    alignment: { wrapText: true, vertical: 'center', horizontal: 'left' },
                    font: { bold: true }
                };
            }
        });

        // Ajuster la hauteur des lignes pour les titres
        worksheet['!rows'] = [];
        if (worksheet['!rows']) {
            // Titre principal
            worksheet['!rows'][0] = { hpt: 30 };
            // Période
            worksheet['!rows'][1] = { hpt: 20 };
            // Total général
            worksheet['!rows'][2] = { hpt: 20 };
        }

        // Ajuster la hauteur des lignes de titre et total d'emploi
        jobTitleRows.forEach((row) => {
            if (!worksheet['!rows']) worksheet['!rows'] = [];
            worksheet['!rows'][row] = { hpt: 25 };
        });

        jobTotalRows.forEach((row) => {
            if (!worksheet['!rows']) worksheet['!rows'] = [];
            worksheet['!rows'][row] = { hpt: 20 };
        });

        worksheet['!merges'] = merges;

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Par_Emploi');
        const today = new Date().toISOString().split('T')[0];
        XLSX.writeFile(workbook, `Projection_Retraites_Par_Emploi_${today}.xlsx`);
    };

    const handleExportJobProjectionWord = () => {
        if (!hasJobProjection) {
            alert('Aucune projection par emploi à exporter.');
            return;
        }
        setJobExportDropdownOpen(false);

        const generationDate = new Date();
        let tableSections = '';
        let index = 1;

        projectionJobs.forEach((job) => {
            const headerRow = jobReportHeaders
                .map((header) => `<th>${escapeHtml(header)}</th>`)
                .join('');
            const rows = job.agents
                .map((agent) => {
                    const cells = [
                        index++,
                        `${agent.nom || ''} ${agent.prenom || ''}`.trim() || '-',
                        agent.matricule || '-',
                        getDirectionLabelFromAgent(agent),
                        getServiceLabelFromAgent(agent),
                        getSousDirectionLabelFromAgent(agent),
                        formatRetirementDate(agent)
                    ]
                        .map((value) => `<td>${escapeHtml(value)}</td>`)
                        .join('');
                    return `<tr>${cells}</tr>`;
                })
                .join('');

            tableSections += `
                <h3>Emploi : ${escapeHtml(job.jobName)} (${job.count} agent${
                job.count > 1 ? 's' : ''
            })</h3>
                <table>
                    <thead>
                        <tr>${headerRow}</tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>
                <p class="job-total">Total ${escapeHtml(job.jobName)} : ${job.count} agent${
                job.count > 1 ? 's' : ''
            }</p>
            `;
        });

        const html = `
            <html xmlns:o="urn:schemas-microsoft-com:office:office"
                  xmlns:w="urn:schemas-microsoft-com:office:word"
                  xmlns="http://www.w3.org/TR/REC-html40">
                <head>
                    <meta charset="utf-8" />
                    <title>Rapport par emploi</title>
                    <style>
                        body { font-family: 'Segoe UI', Arial, sans-serif; margin: 12px; color: #000; }
                        h1 { text-align: center; color: #000; font-size: 1.3rem; margin-bottom: 0.4rem; }
                        h3 { margin-top: 20px; color: #0b3a82; }
                        table { width: 100%; border-collapse: collapse; margin: 12px 0 0 0; font-size: 0.75rem; table-layout: fixed; }
                        th, td { border: 1px solid #999; padding: 4px; text-align: left; vertical-align: top; word-wrap: break-word; }
                        th { background-color: #f5f5f5; font-weight: 600; }
                        tr:nth-child(even) { background-color: #fafafa; }
                        .job-total { font-weight: bold; margin: 8px 0 16px 0; }
                    </style>
                </head>
                <body>
                    <h1>Agents partant à la retraite par emploi</h1>
                    <p><strong>Période :</strong> ${
                        currentFilters.periodYears ? `${currentFilters.periodYears} an(s)` : 'Non définie'
                    } – Généré le ${generationDate.toLocaleDateString('fr-FR')} à ${generationDate.toLocaleTimeString(
            'fr-FR'
        )}</p>
                    ${tableSections}
                </body>
            </html>
        `;

        const blob = new Blob([html], { type: 'application/msword' });
        const today = new Date().toISOString().split('T')[0];
        saveAs(blob, `Projection_Retraites_Par_Emploi_${today}.doc`);
    };

    const handlePrintJobProjection = () => {
        if (!hasJobProjection) {
            alert('Aucune projection par emploi à imprimer.');
            return;
        }
        setJobExportDropdownOpen(false);

        const generationDate = new Date();
        let sections = '';
        let index = 1;

        projectionJobs.forEach((job) => {
            const rows = job.agents
                .map((agent) => {
                    const cells = [
                        index++,
                        `${agent.nom || ''} ${agent.prenom || ''}`.trim() || '-',
                        agent.matricule || '-',
                        getDirectionLabelFromAgent(agent),
                        getServiceLabelFromAgent(agent),
                        getSousDirectionLabelFromAgent(agent),
                        formatRetirementDate(agent)
                    ]
                        .map((value) => `<td>${escapeHtml(value)}</td>`)
                        .join('');
                    return `<tr>${cells}</tr>`;
                })
                .join('');

            sections += `
                <h3>Emploi : ${escapeHtml(job.jobName)} (${job.count} agent${
                job.count > 1 ? 's' : ''
            })</h3>
                <table>
                    <thead>
                        <tr>
                            ${jobReportHeaders.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>
            `;
        });

        const printContent = `
            <html>
                <head>
                    <meta charset="utf-8" />
                    <title>Impression - Rapport par emploi</title>
                    <style>
                        body { font-family: Arial, sans-serif; margin: 20px; font-size: 11px; color: #000; }
                        h2 { text-align: center; }
                        h3 { margin-top: 20px; color: #0d6efd; }
                        table { width: 100%; border-collapse:collapse; margin-top: 10px; }
                        th, td { border: 1px solid #ccc; padding: 6px; text-align: left; }
                        th { background-color: #f1f5f9; }
                        tr:nth-child(even) { background-color: #fafafa; }
                    </style>
                </head>
                <body>
                    <h2>Agents partant à la retraite par emploi</h2>
                    <p><strong>Période :</strong> ${
                        currentFilters.periodYears ? `${currentFilters.periodYears} an(s)` : 'Non définie'
                    } – Généré le ${generationDate.toLocaleDateString('fr-FR')} à ${generationDate.toLocaleTimeString(
            'fr-FR'
        )}</p>
                    ${sections}
                </body>
            </html>
        `;

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('Veuillez autoriser les pop-ups pour pouvoir imprimer ce rapport.');
            return;
        }
        printWindow.document.write(printContent);
        printWindow.document.close();
        setTimeout(() => {
            printWindow.focus();
            printWindow.print();
        }, 300);
    };

    const createPDFDocument = (orientation = 'l') => {
        if (agentsForExport.length === 0) {
            alert('Aucun agent à exporter.');
            return null;
        }

        const doc = new jsPDF(orientation, 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        const marginLeft = 10;
        const marginTop = 20;
        const rows = buildExportRows();
        const columnWidths =
            orientation === 'l'
                ? [25, 50, 60, 45, 70, 27] // total 277mm (approx. page width 297mm - margins)
                : [18, 32, 40, 28, 52, 20]; // total 190mm (approx. page width 210mm - margins)
        const columnPositions = columnWidths.reduce(
            (acc, width, index) => {
                if (index === 0) {
                    acc.push(marginLeft);
                } else {
                    acc.push(acc[index - 1] + columnWidths[index - 1]);
                }
                return acc;
            },
            []
        );

        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.text('Liste des agents à la retraite', pageWidth / 2, marginTop - 10, { align: 'center' });

        const contentFontSize = orientation === 'l' ? 10 : 9;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        exportHeaders.forEach((header, index) => {
            doc.text(header, columnPositions[index] + 2, marginTop);
        });

        doc.setDrawColor(200, 200, 200);
        doc.line(marginLeft, marginTop + 2, pageWidth - marginLeft, marginTop + 2);

        let currentY = marginTop + 6;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(contentFontSize);
        const lineHeight = 5;
        const maxY = doc.internal.pageSize.getHeight() - 20;

        rows.forEach((rowValues) => {
            const wrappedValues = rowValues.map((value, index) =>
                doc.splitTextToSize(value, columnWidths[index] - 4)
            );
            const rowHeight =
                Math.max(...wrappedValues.map((arr) => arr.length)) * lineHeight;

            if (currentY + rowHeight > maxY) {
                doc.addPage();
                doc.setFont('helvetica', 'bold');
                exportHeaders.forEach((header, index) => {
                    doc.text(header, columnPositions[index] + 2, marginTop);
                });
                doc.line(marginLeft, marginTop + 2, pageWidth - marginLeft, marginTop + 2);
                doc.setFont('helvetica', 'normal');
                currentY = marginTop + 6;
            }

            wrappedValues.forEach((textLines, index) => {
                textLines.forEach((line, lineIndex) => {
                    doc.text(line, columnPositions[index] + 2, currentY + lineHeight * lineIndex);
                });
            });

            currentY += rowHeight + 1;
            doc.setDrawColor(240, 240, 240);
            doc.line(marginLeft, currentY, pageWidth - marginLeft, currentY);
            currentY += 1;
        });

        return doc;
    };

    const handleExportPDF = () => {
        const doc = createPDFDocument('l');
        if (doc) {
            const today = new Date().toISOString().split('T')[0];
            doc.save(`Retraites_${today}.pdf`);
        }
    };

    const groupedData = useMemo(() => {
        if (!filtersApplied) {
            return {
                groupedDirections: {},
                totalDirections: 0,
                totalServices: 0,
                totalSousDirections: 0
            };
        }

        const directions = {};
        const directionSet = new Set();
        const serviceCombinationSet = new Set();
        const serviceLabelsSet = new Set();
        const sousDirectionCombinationSet = new Set();
        const sousDirectionLabelsSet = new Set();

        displayedAgents.forEach((agent) => {
            const directionName =
                agent.direction_libelle?.trim() ||
                agent.direction_libele?.trim() ||
                agent.direction_generale_libelle?.trim() ||
                DEFAULT_LABELS.direction;
            const serviceName =
                agent.service_libele?.trim() ||
                agent.service_libelle?.trim() ||
                DEFAULT_LABELS.service;
            const sousDirectionName =
                agent.sous_direction_libele?.trim() ||
                agent.sous_direction_libelle?.trim() ||
                DEFAULT_LABELS.sousDirection;

            directionSet.add(directionName);
            const normalizedServiceName = serviceName;
            const normalizedSousDirectionName = sousDirectionName;

            serviceCombinationSet.add(`${directionName}::${normalizedServiceName}`);
            sousDirectionCombinationSet.add(
                `${directionName}::${serviceName}::${sousDirectionName}`
            );
            if (normalizedServiceName) {
                serviceLabelsSet.add(normalizedServiceName);
            }
            if (normalizedSousDirectionName) {
                sousDirectionLabelsSet.add(normalizedSousDirectionName);
            }

            if (!directions[directionName]) {
                directions[directionName] = {
                    total: 0,
                    services: {},
                    agents: []
                };
            }

            const directionData = directions[directionName];
            directionData.total += 1;
            directionData.agents.push(agent);

            if (!directionData.services[serviceName]) {
                directionData.services[serviceName] = {
                    total: 0,
                    sousDirections: {},
                    agents: []
                };
            }

            const serviceData = directionData.services[serviceName];
            serviceData.total += 1;
            serviceData.agents.push(agent);

            if (!serviceData.sousDirections[sousDirectionName]) {
                serviceData.sousDirections[sousDirectionName] = {
                    total: 0,
                    agents: []
                };
            }

            const sousDirectionData = serviceData.sousDirections[sousDirectionName];
            sousDirectionData.total += 1;
            sousDirectionData.agents.push(agent);
        });

        return {
            groupedDirections: directions,
            totalDirections: directionSet.size,
            totalServices: serviceLabelsSet.size,
            totalSousDirections: sousDirectionLabelsSet.size
        };
    }, [displayedAgents, filtersApplied]);

    const {
        groupedDirections,
        totalDirections,
        totalServices,
        totalSousDirections
    } = groupedData;
    const groupedDirectionsEntries = useMemo(
        () => Object.entries(groupedDirections || {}),
        [groupedDirections]
    );
    const groupedPageSize = 15;
    const [groupedCurrentPage, setGroupedCurrentPage] = useState(1);
    useEffect(() => {
        setGroupedCurrentPage(1);
    }, [groupedDirectionsEntries.length]);
    const groupedTotalPages = Math.max(
        1,
        Math.ceil(groupedDirectionsEntries.length / groupedPageSize)
    );
    const paginatedGroupedDirections = useMemo(
        () =>
            groupedDirectionsEntries.slice(
                (groupedCurrentPage - 1) * groupedPageSize,
                groupedCurrentPage * groupedPageSize
            ),
        [groupedDirectionsEntries, groupedCurrentPage]
    );

    const projectionHierarchyRows = useMemo(() => {
        if (!filtersApplied) return [];
        const period = Number(currentFilters.periodYears);
        if (!period || Number.isNaN(period) || period <= 0) return [];

        const rows = [];
        const directionEntries = Object.entries(groupedDirections || {});
        directionEntries.forEach(([directionName, directionData]) => {
            rows.push({
                type: 'direction',
                direction: directionName,
                service: '',
                sousDirection: '',
                effectif: directionData.total
            });

            const serviceEntries = Object.entries(directionData.services || {});
            serviceEntries.forEach(([serviceName, serviceData]) => {
                rows.push({
                    type: 'service',
                    direction: directionName,
                    service: serviceName,
                    sousDirection: '',
                    effectif: serviceData.total
                });

                const sousEntries = Object.entries(serviceData.sousDirections || {});
                sousEntries.forEach(([sousDirectionName, sousDirectionData]) => {
                    rows.push({
                        type: 'sousDirection',
                        direction: directionName,
                        service: serviceName,
                        sousDirection: sousDirectionName,
                        effectif: sousDirectionData.total
                    });

                    sousDirectionData.agents.forEach((agent) => {
                        rows.push({
                            type: 'agent',
                            direction: directionName,
                            service: serviceName,
                            sousDirection: sousDirectionName,
                            agent
                        });
                    });
                });
            });
        });

        return rows;
    }, [groupedDirections, filtersApplied, currentFilters.periodYears]);

    const hasProjectionSummary = projectionHierarchyRows.length > 0;

    const getAgentJobLabel = useCallback(
        (agent) => {
            const label =
                agent.emploi_libele ||
                agent.emploi_libelle ||
                agent.emploi_actuel_libele ||
                agent.emploi_actuel_libelle ||
                agent.fonction_actuelle_libele ||
                agent.fonction_actuelle_libelle ||
                agent.fonction_libele ||
                agent.fonction_libelle ||
                '';
            const normalized = label ? label.toString().trim() : '';
            return normalized || DEFAULT_LABELS.job;
        },
        []
    );

    const projectionJobs = useMemo(() => {
        if (!filtersApplied) return [];
        const years = Number(currentFilters.periodYears);
        if (!years || Number.isNaN(years) || years <= 0) return [];

        const groups = new Map();
        agentsFilteredByPeriod.forEach((agent) => {
            const jobLabel = getAgentJobLabel(agent);
            if (!groups.has(jobLabel)) {
                groups.set(jobLabel, []);
            }
            groups.get(jobLabel).push(agent);
        });

        return Array.from(groups.entries())
            .map(([jobName, jobAgents]) => ({
                jobName,
                agents: jobAgents,
                count: jobAgents.length
            }))
            .sort((a, b) => {
                if (b.count !== a.count) return b.count - a.count;
                return a.jobName.localeCompare(b.jobName, 'fr', { sensitivity: 'base' });
            });
    }, [agentsFilteredByPeriod, filtersApplied, currentFilters.periodYears, getAgentJobLabel]);

    const hasJobProjection = projectionJobs.length > 0;

    const formatAgentSex = (agent) => {
        if (agent.sexe_libelle) return agent.sexe_libelle;
        if (agent.sexe === 'M') return 'M';
        if (agent.sexe === 'F') return 'F';
        if (!agent.sexe) return '-';
        return agent.sexe;
    };

    const formatAgentFunction = (agent) =>
        agent.fonction_actuelle_libele ||
        agent.fonction_actuelle_libelle ||
        agent.fonction_libele ||
        agent.fonction_libelle ||
        '-';

    const handleExportProjectionSummaryExcel = async () => {
        if (!hasProjectionSummary) {
            alert('Aucune projection disponible à exporter. Saisissez une période d\'analyse et cliquez sur Rechercher.');
            return;
        }
        setHierarchicalExportDropdownOpen(false);

        const periodLabel = currentFilters.periodYears
            ? `${currentFilters.periodYears} an${Number(currentFilters.periodYears) > 1 ? 's' : ''}`
            : '';
        const periodLabelLine = periodLabel ? `Période d'analyse : ${periodLabel} à venir` : '';
        const today = new Date().toISOString().split('T')[0];
        const periodSuffix = periodLabel ? `_${currentFilters.periodYears}ans` : '';

        try {
            setLoading(true);

            const params = new URLSearchParams({ include_entites: 'true' });
            if (user?.organization?.type === 'ministere' && user?.organization?.id) {
                params.append('id_ministere', user.organization.id);
            }
            params.append('_ts', String(Date.now()));
            const url = `https://tourisme.2ise-groupe.com/api/agents/hierarchical-report?${params.toString()}`;
            const response = await fetch(url, {
                cache: 'no-store',
                headers: getAuthHeaders()
            });
            if (!response.ok) throw new Error(`Erreur HTTP ${response.status}`);

            const result = await response.json();
            const hierarchyTree = result.success && Array.isArray(result.hierarchyTree) ? result.hierarchyTree : [];
            if (hierarchyTree.length === 0) {
                alert('Impossible de récupérer la structure hiérarchique. Réessayez plus tard.');
                return;
            }

            const fullData = result.success && Array.isArray(result.data) ? result.data : [];
            const effectifActuelParDirection = {};
            const effectifActuelParDG = {};
            fullData.forEach((agent) => {
                const isRetired =
                    /retrait/i.test(String(agent.statut_emploi_libelle || '')) ||
                    /retrait/i.test(String(agent.statut_emploi || ''));
                if (isRetired) return;

                const rawDirName = (agent.direction_libelle || '').trim();
                const dgNameRaw = (agent.direction_generale_libelle || '').trim();

                // Si l'agent est directement rattaché à la DG (pas de direction, mais une DG),
                // on considère que sa "direction" est le nom de la DG pour l'effectif par direction.
                let dirName = rawDirName;
                if (!dirName && dgNameRaw) {
                    dirName = dgNameRaw;
                }
                if (!dirName) {
                    dirName = 'Non rattaché';
                }

                effectifActuelParDirection[dirName] =
                    (effectifActuelParDirection[dirName] || 0) + 1;

                const dgName = dgNameRaw || 'Sans direction générale';
                effectifActuelParDG[dgName] =
                    (effectifActuelParDG[dgName] || 0) + 1;
            });

            const agentMap = new Map(agentsFilteredByPeriod.map((a) => [a.id, a]));
            const groupedData = buildGroupedDataFromHierarchyTree(hierarchyTree, agentMap);

            exportHierarchicalReportExcel({
                groupedData,
                currentMinistereNom: user?.organization?.nom || '',
                title: 'RAPPORT HIÉRARCHIQUE - AGENTS PARTANT À LA RETRAITE',
                periodLabel: periodLabelLine,
                periodYears: currentFilters.periodYears || '',
                effectifActuelParDirection,
                effectifActuelParDG,
                fileName: `Rapport_Hierarchique_Retraites${periodSuffix}_${today}.xlsx`
            });

            alert('Rapport hiérarchique exporté avec succès !');
        } catch (err) {
            console.error('Export Excel hiérarchique retraites:', err);
            alert('Erreur lors de la génération du rapport hiérarchique.');
        } finally {
            setLoading(false);
        }
    };

    const handleExportProjectionSummaryPDF = () => {
        if (!hasProjectionSummary) {
            alert('Aucune projection disponible à exporter.');
            return;
        }
        setHierarchicalExportDropdownOpen(false);

        const doc = new jsPDF('p', 'mm', 'a4');
        const marginLeft = 10;
        const marginTop = 20;
        const columnWidths = [25, 45, 45, 45, 25, 45, 25, 15];
        const columnPositions = columnWidths.reduce((acc, width, index) => {
            if (index === 0) {
                acc.push(marginLeft);
            } else {
                acc.push(acc[index - 1] + columnWidths[index - 1]);
            }
            return acc;
        }, []);

        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(
            `Rapport hiérarchique des projections dans ${currentFilters.periodYears} an(s)`,
            doc.internal.pageSize.getWidth() / 2,
            marginTop - 8,
            { align: 'center' }
        );

        // PDF export for the hierarchical report will be implemented dans une prochaine itération.
        // Pour l'instant, on informe l'utilisateur de télécharger la version Excel.
        alert('Veuillez utiliser l’export Excel hiérarchique pour ce format détaillé.');
    };

    if (loading) {
        return (
            <div
                className="d-flex justify-content-center align-items-center"
                style={{ height: '70vh' }}
            >
                <Spinner color="primary" />
            </div>
        );
    }

    if (error) {
        return (
            <Alert color="danger" className="m-4">
                {error}
            </Alert>
        );
    }

    return (
        <div className="verification-retraites-page">
            <div className="page-header mb-4">
                <Row className="align-items-center">
                    <Col>
                        <h1 className="page-title">
                            <MdVisibility
                                className="me-2"
                                style={{ fontSize: '2.5rem', color: '#0d6efd' }}
                            />
                            Vérification des Retraites
                        </h1>
                        <p className="page-description">
                            Analyse détaillée des agents retraités par structure et par
                            agent.
                        </p>
                    </Col>
                    <Col className="text-end">
                        <Button color="primary" onClick={loadAgents}>
                            <MdRefresh className="me-1" />
                            Actualiser les données
                        </Button>
                    </Col>
                </Row>
            </div>

            <Alert color="info" className="mb-4">
                <strong>Objectif :</strong> Cette vue permet de contrôler la cohérence
                des retraites enregistrées par structure (directions, services,
                sous-directions) et de retrouver rapidement un agent spécifique.
            </Alert>

            <Row className="mb-4">
                <Col md={3}>
                    <Card className="text-center" style={{ borderTop: '3px solid #0d6efd' }}>
                        <CardBody>
                            <MdGroup style={{ fontSize: '2rem', color: '#0d6efd' }} />
                            <h3 className="mt-2 text-primary">{totalFonctionnaires}</h3>
                            <p className="text-muted mb-0">Agents fonctionnaires</p>
                        </CardBody>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="text-center" style={{ borderTop: '3px solid #198754' }}>
                        <CardBody>
                            <MdApartment style={{ fontSize: '2rem', color: '#198754' }} />
                            <h3 className="mt-2 text-success">{totalDirections}</h3>
                            <p className="text-muted mb-0">Directions concernées</p>
                        </CardBody>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="text-center" style={{ borderTop: '3px solid #fd7e14' }}>
                        <CardBody>
                            <MdApartment style={{ fontSize: '2rem', color: '#fd7e14' }} />
                            <h3 className="mt-2 text-warning">{totalServices}</h3>
                            <p className="text-muted mb-0">Services concernés</p>
                        </CardBody>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="text-center" style={{ borderTop: '3px solid #6f42c1' }}>
                        <CardBody>
                            <MdApartment style={{ fontSize: '2rem', color: '#6f42c1' }} />
                            <h3 className="mt-2 text-secondary">{totalSousDirections}</h3>
                            <p className="text-muted mb-0">Sous-directions concernées</p>
                        </CardBody>
                    </Card>
                </Col>
            </Row>

            {filtersApplied && currentFilters.periodYears && Number(currentFilters.periodYears) > 0 && (
                <Row className="mb-4">
                    <Col md={4}>
                        <Card className="text-center border-primary">
                            <CardBody>
                                <MdGroup style={{ fontSize: '2rem', color: '#0d6efd' }} />
                                <h3 className="mt-2 text-primary">{agentsFilteredByPeriod.length}</h3>
                                <p className="text-muted mb-0">Effectif hiérarchique sur la période</p>
                                <small className="text-muted">
                                    (agents partant à la retraite dans les {currentFilters.periodYears} an{Number(currentFilters.periodYears) > 1 ? 's' : ''} à venir)
                                </small>
                            </CardBody>
                        </Card>
                    </Col>
                </Row>
            )}

            <Card className="mb-4">
                <CardHeader>
                    <CardTitle className="mb-0">Filtres de vérification</CardTitle>
                </CardHeader>
                <CardBody>
                    <Row className="gy-3">
                        <Col md={3}>
                            <FormGroup>
                                <Label>Période d'analyse (en années)</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    placeholder="Ex : 5"
                                    value={periodYears}
                                    onChange={(e) => setPeriodYears(e.target.value)}
                                />
                                <small className="text-muted d-block mt-1">
                                    Laisser vide pour toutes les périodes. Sinon, saisir le nombre d&apos;années à projeter.
                                </small>
                                {periodYears && periodYears.trim() !== '' && (
                                    <small className="text-info d-block mt-1">
                                        Cliquez sur <strong>Rechercher</strong> pour afficher le rapport hiérarchique des agents partant à la retraite sur cette période et l&apos;effectif par structure.
                                    </small>
                                )}
                            </FormGroup>
                        </Col>
                        <Col md={3}>
                            <FormGroup className="position-relative">
                                <Label>Direction</Label>
                                <div className="autocomplete-container">
                                    <Input
                                        type="text"
                                        value={selectedDirectionLabel}
                                        onChange={handleDirectionInputChange}
                                        onFocus={() => {
                                            setIsDirectionInputFocused(true);
                                            updateDirectionSuggestions(selectedDirectionLabel);
                                        }}
                                        onBlur={() => {
                                            setIsDirectionInputFocused(false);
                                            setTimeout(() => setDirectionSuggestions([]), 150);
                                        }}
                                        placeholder="Saisir ou choisir une direction"
                                        autoComplete="off"
                                    />
                                    {isDirectionInputFocused && directionSuggestions.length > 0 && (
                                        <div className="autocomplete-list">
                                            {directionSuggestions.map((option) => (
                                                <div
                                                    key={option.id}
                                                    className="autocomplete-item"
                                                    role="button"
                                                    tabIndex={0}
                                                    onMouseDown={(e) => e.preventDefault()}
                                                    onClick={() => handleDirectionPick(option)}
                                                >
                                                    {option.label}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </FormGroup>
                        </Col>
                        <Col md={3}>
                            <FormGroup className="position-relative">
                                <Label>Sous-direction</Label>
                                <div className="autocomplete-container">
                                    <Input
                                        type="text"
                                        value={selectedSousDirectionLabel}
                                        onChange={handleSousDirectionInputChange}
                                        onFocus={() => {
                                            setIsSousDirectionInputFocused(true);
                                            updateSousDirectionSuggestions(selectedSousDirectionLabel);
                                        }}
                                        onBlur={() => {
                                            setIsSousDirectionInputFocused(false);
                                            setTimeout(() => setSousDirectionSuggestions([]), 150);
                                        }}
                                        placeholder="Saisir ou choisir une sous-direction"
                                        autoComplete="off"
                                        disabled={sousDirectionOptions.length === 0}
                                    />
                                    {isSousDirectionInputFocused && sousDirectionSuggestions.length > 0 && (
                                        <div className="autocomplete-list">
                                            {sousDirectionSuggestions.map((sous) => (
                                                <div
                                                    key={sous.id}
                                                    className="autocomplete-item"
                                                    role="button"
                                                    tabIndex={0}
                                                    onMouseDown={(e) => e.preventDefault()}
                                                    onClick={() => handleSousDirectionPick(sous)}
                                                >
                                                    {sous.label}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </FormGroup>
                        </Col>
                        <Col md={3}>
                            <FormGroup className="position-relative">
                                <Label>Service</Label>
                                <div className="autocomplete-container">
                                    <Input
                                        type="text"
                                        value={selectedServiceLabel}
                                        onChange={handleServiceInputChange}
                                        onFocus={() => {
                                            setIsServiceInputFocused(true);
                                            updateServiceSuggestions(selectedServiceLabel);
                                        }}
                                        onBlur={() => {
                                            setIsServiceInputFocused(false);
                                            setTimeout(() => setServiceSuggestions([]), 150);
                                        }}
                                        placeholder="Saisir ou choisir un service"
                                        autoComplete="off"
                                        disabled={serviceOptions.length === 0}
                                    />
                                    {isServiceInputFocused && serviceSuggestions.length > 0 && (
                                        <div className="autocomplete-list">
                                            {serviceSuggestions.map((service) => (
                                                <div
                                                    key={service.id}
                                                    className="autocomplete-item"
                                                    role="button"
                                                    tabIndex={0}
                                                    onMouseDown={(e) => e.preventDefault()}
                                                    onClick={() => handleServicePick(service)}
                                                >
                                                    {service.label}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </FormGroup>
                        </Col>
                    </Row>
                    <Row className="mt-2">
                        <Col className="d-flex justify-content-between">
                            <Button
                                color="primary"
                                        onClick={handleApplyFilters}
                            >
                                Rechercher
                            </Button>
                            <Button
                                color="secondary"
                                outline
                                        onClick={handleResetFilters}
                            >
                                Réinitialiser les filtres
                            </Button>
                        </Col>
                    </Row>
                </CardBody>
            </Card>

            <Card className="mb-4">
                <CardHeader className="d-flex justify-content-between align-items-center">
                    <CardTitle className="mb-0">
                        <MdSearch className="me-2" />
                        Recherche d&apos;un agent pour la verification de son année de retraite
                    </CardTitle>
                    <Button
                        color="link"
                        className="p-0 d-flex align-items-center"
                        onClick={() => setSearchSectionOpen((prev) => !prev)}
                    >
                        {searchSectionOpen ? (
                            <>
                                Masquer
                                <MdExpandLess className="ms-1" />
                            </>
                        ) : (
                            <>
                                Afficher
                                <MdExpandMore className="ms-1" />
                            </>
                        )}
                    </Button>
                </CardHeader>
                <Collapse isOpen={searchSectionOpen}>
                    <CardBody>
                        <Row className="align-items-center gy-3">
                            <Col md={6}>
                                <Input
                                    type="search"
                                    placeholder="Rechercher par nom, prénoms, matricule, direction ou service..."
                                    value={searchTerm}
                                    onChange={handleSearchTermChange}
                                    onKeyDown={handleSearchKeyDown}
                                />
                            </Col>
                            <Col md={4} className="text-muted">
                                <span className="text-muted">{resultsMessage}</span>
                            </Col>
                            <Col md={4} className="text-md-end d-flex justify-content-md-end flex-wrap gap-2">
                                <ButtonDropdown
                                    isOpen={exportDropdownOpen}
                                    toggle={() => setExportDropdownOpen((prev) => !prev)}
                                >
                                    <Button
                                        color="success"
                                        onClick={handleExportPDF}
                                    >
                                        <MdFileDownload className="me-1" />
                                        Imprimer
                                    </Button>
                                    <DropdownToggle split color="success" caret>
                                        Menu
                                    </DropdownToggle>
                                    <DropdownMenu end>
                                        <DropdownItem onClick={handleExportWord}>
                                            Word (.doc)
                                        </DropdownItem>
                                        <DropdownItem onClick={handleExportExcel}>
                                            Excel (.xlsx)
                                        </DropdownItem>
                                        <DropdownItem onClick={handleExportPDF}>
                                            PDF (.pdf)
                                        </DropdownItem>
                                    </DropdownMenu>
                                </ButtonDropdown>
                                <ButtonDropdown
                                    isOpen={hierarchicalExportDropdownOpen}
                                    toggle={() => setHierarchicalExportDropdownOpen((prev) => !prev)}
                                    disabled={!hasProjectionSummary}
                                >
                                    <Button
                                        color="info"
                                        outline
                                        onClick={() => setHierarchicalExportDropdownOpen((prev) => !prev)}
                                    >
                                        Excel hiérarchique
                                    </Button>
                                    <DropdownToggle split color="info" outline caret />
                                    <DropdownMenu end>
                                        <DropdownItem onClick={handleExportProjectionSummaryExcel}>
                                            Excel (.xlsx)
                                        </DropdownItem>
                                        <DropdownItem onClick={handleExportProjectionSummaryPDF}>
                                            PDF (.pdf)
                                        </DropdownItem>
                                    </DropdownMenu>
                                </ButtonDropdown>
                            </Col>
                        </Row>

                        {shouldShowResultsTable && (
                            <div className="table-responsive mt-4">
                                <Table striped hover>
                                    <thead style={{ backgroundColor: '#f8f9fa' }}>
                                        <tr>
                                            <th>Nom et Prénoms</th>
                                            <th>Matricule</th>
                                            <th>Fonction</th>
                                            <th>Direction</th>
                                            <th>Sous-direction</th>
                                            <th>Service</th>
                                            <th>Date de Retraite</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {paginatedAgents.map((agent) => {
                                            const retirementDate = getRetirementDateValue(agent);
                                            const formattedRetirementDate = retirementDate
                                                ? retirementDate.toLocaleDateString('fr-FR')
                                                : '-';
                                            return (
                                                <tr key={agent.id}>
                                                    <td>{`${agent.nom || ''} ${
                                                        agent.prenom || ''
                                                    }`.trim() || '-'}</td>
                                                    <td>
                                                        <strong>{agent.matricule || '-'}</strong>
                                                    </td>
                                                    <td>
                                                        {formatAgentFunction(agent)}
                                                    </td>
                                                    <td>
                                                        {agent.direction_libelle ||
                                                            DEFAULT_LABELS.direction}
                                                    </td>
                                                    <td>
                                                        {agent.sous_direction_libelle ||
                                                            agent.sous_direction_libele ||
                                                            DEFAULT_LABELS.sousDirection}
                                                    </td>
                                                    <td>
                                                        {agent.service_libelle ||
                                                            agent.service_libele ||
                                                            DEFAULT_LABELS.service}
                                                    </td>
                                                    <td>
                                                        <Badge color="light" className="text-primary">
                                                            {formattedRetirementDate}
                                                        </Badge>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </Table>
                            </div>
                        )}
                        {shouldShowResultsTable && totalPages > 1 && (
                            <div className="d-flex justify-content-between align-items-center mt-3">
                                <span className="text-muted">
                                    Page {currentPage} sur {totalPages}
                                </span>
                                <div>
                                    <Button
                                        color="secondary"
                                        size="sm"
                                        className="me-2"
                                        disabled={currentPage === 1}
                                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                                    >
                                        Précédent
                                    </Button>
                                    <Button
                                        color="secondary"
                                        size="sm"
                                        disabled={currentPage === totalPages}
                                        onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                                    >
                                        Suivant
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardBody>
                </Collapse>
            </Card>

            {hasProjectionSummary && (
                <Card className="mb-4">
                    <CardHeader>
                        <div className="d-flex justify-content-between align-items-center">
                            <CardTitle className="mb-0 d-flex align-items-center flex-wrap gap-2">
                                Rapport hiérarchique des projections (horizon {currentFilters.periodYears} an
                                {Number(currentFilters.periodYears) > 1 ? 's' : ''})
                                <Badge color="primary" className="ms-2">
                                    Effectif total : {agentsFilteredByPeriod.length} agent{agentsFilteredByPeriod.length > 1 ? 's' : ''}
                                </Badge>
                            </CardTitle>
                            <ButtonDropdown
                                isOpen={projectionExportDropdownOpen}
                                toggle={() => setProjectionExportDropdownOpen((prev) => !prev)}
                            >
                                <Button color="success" onClick={handleExportProjectionSummaryPDF}>
                                    <MdFileDownload className="me-1" />
                                    Imprimer
                                </Button>
                                <DropdownToggle split color="success" caret>
                                    Menu
                                </DropdownToggle>
                                <DropdownMenu end>
                                    <DropdownItem onClick={handleExportProjectionSummaryExcel}>
                                        Excel (.xlsx)
                                    </DropdownItem>
                                    <DropdownItem onClick={handleExportProjectionSummaryPDF}>
                                        PDF (.pdf)
                                    </DropdownItem>
                                </DropdownMenu>
                            </ButtonDropdown>
                        </div>
                    </CardHeader>
                    <CardBody>
                        <div className="table-responsive">
                            <Table bordered hover size="sm">
                                <thead style={{ backgroundColor: '#f8f9fa' }}>
                                    <tr>
                                        <th>Nom de la structure</th>
                                        <th className="text-center">Effectif partant à la retraite</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {projectionHierarchyRows
                                        .filter((row) => {
                                            if (row.type === 'agent') return false;
                                            if (row.type === 'service' && row.service === DEFAULT_LABELS.service) return false;
                                            if (row.type === 'sousDirection' && row.sousDirection === DEFAULT_LABELS.sousDirection) return false;
                                            return true;
                                        })
                                        .map((row, index) => {
                                            const key = `${row.direction}-${row.service}-${row.sousDirection}-${row.type}-${index}`;
                                            const structureName =
                                                row.type === 'direction'
                                                    ? row.direction
                                                    : row.type === 'service'
                                                      ? row.service
                                                      : row.type === 'sousDirection'
                                                        ? row.sousDirection
                                                        : '-';
                                            const effectif = row.effectif ?? '-';
                                            return (
                                                <tr key={key} className="table-light">
                                                    <td>{structureName}</td>
                                                    <td className="text-center">
                                                        {effectif !== '-' ? (
                                                            <Badge
                                                                pill
                                                                style={{
                                                                    backgroundColor: '#0d6efd',
                                                                    color: '#fff',
                                                                    fontWeight: 600
                                                                }}
                                                            >
                                                                {effectif}
                                                            </Badge>
                                                        ) : (
                                                            '-'
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                </tbody>
                            </Table>
                        </div>
                    </CardBody>
                </Card>
            )}

            <Card>
                <CardHeader style={{ backgroundColor: '#e7f5ff' }}>
                    <CardTitle className="mb-0">
                        <MdApartment className="me-2" style={{ color: '#0d6efd' }} />
                        Vue hiérarchique des retraites par structure
                    </CardTitle>
                </CardHeader>
                <CardBody>
                    {groupedDirectionsEntries.length === 0 ? (
                        <Alert color="secondary" className="text-center">
                            Aucun agent retraité enregistré pour l&apos;instant.
                        </Alert>
                    ) : (
                        <>
                            {paginatedGroupedDirections.map(
                                ([directionName, directionData]) => {
                                const isDirectionExpanded = !!expandedDirections[directionName];
                                return (
                                    <div
                                        key={directionName}
                                        className="mb-3 border rounded"
                                        style={{ borderColor: '#d0e3ff' }}
                                    >
                                        <div
                                            className="d-flex justify-content-between align-items-center p-3"
                                            style={{ cursor: 'pointer', backgroundColor: '#f5f9ff' }}
                                            onClick={() => toggleDirection(directionName)}
                                        >
                                            <div>
                                                <h5 className="mb-0">
                                                    {directionName}{' '}
                                                    <Badge
                                                        pill
                                                        style={{
                                                            backgroundColor: '#dbeafe',
                                                            color: '#0b3a82',
                                                            fontWeight: 600
                                                        }}
                                                    >
                                                        {directionData.total} agent
                                                        {directionData.total > 1 ? 's' : ''}
                                                    </Badge>
                                                </h5>
                                                <small className="text-muted">
                                                    {Object.keys(directionData.services).length}{' '}
                                                    service(s) identifié(s)
                                                </small>
                                            </div>
                                            {isDirectionExpanded ? (
                                                <MdExpandLess size={24} />
                                            ) : (
                                                <MdExpandMore size={24} />
                                            )}
                                        </div>

                                        {isDirectionExpanded && (
                                            <div className="p-3 pt-0">
                                            {Object.entries(directionData.services).map(
                                                    ([serviceName, serviceData]) => {
                                                        const serviceKey = `${directionName}__${serviceName}`;
                                                        const isServiceExpanded =
                                                            !!expandedServices[serviceKey];
                                                        return (
                                                            <div
                                                                key={serviceKey}
                                                                className="mb-2 ms-3 border rounded"
                                                                style={{
                                                                    borderColor: '#e9ecef',
                                                                    backgroundColor: '#ffffff'
                                                                }}
                                                            >
                                                                <div
                                                                    className="d-flex justify-content-between align-items-center p-3"
                                                                    style={{ cursor: 'pointer' }}
                                                                    onClick={() =>
                                                                        toggleService(
                                                                            directionName,
                                                                            serviceName
                                                                        )
                                                                    }
                                                                >
                                                                    <div>
                                                                        <strong>{serviceName}</strong>{' '}
                                                                        <Badge
                                                                            pill
                                                                            style={{
                                                                                backgroundColor: '#dcfce7',
                                                                                color: '#076040',
                                                                                fontWeight: 600
                                                                            }}
                                                                        >
                                                                            {serviceData.total}
                                                                        </Badge>
                                                                    </div>
                                                                    {isServiceExpanded ? (
                                                                        <MdExpandLess size={20} />
                                                                    ) : (
                                                                        <MdExpandMore size={20} />
                                                                    )}
                                                                </div>

                                                                {isServiceExpanded && (
                                                                    <div className="p-3 pt-0">
                                                                        {Object.entries(
                                                                            serviceData.sousDirections
                                                                        ).map(
                                                                            ([
                                                                                sousDirectionName,
                                                                                sousDirectionData
                                                                            ]) => (
                                                                                <div
                                                                                    key={`${serviceKey}__${sousDirectionName}`}
                                                                                    className="mb-3 ms-3"
                                                                                >
                                                                                    <div className="d-flex justify-content-between align-items-center">
                                                                                        <span className="fw-semibold">
                                                                                            {
                                                                                                sousDirectionName
                                                                                            }
                                                                                        </span>
                                                                                        <Badge
                                                                                            pill
                                                                                            style={{
                                                                                                backgroundColor: '#f1f5f9',
                                                                                                color: '#334155',
                                                                                                fontWeight: 600
                                                                                            }}
                                                                                        >
                                                                                            {
                                                                                                sousDirectionData.total
                                                                                            }{' '}
                                                                                            agent
                                                                                            {sousDirectionData.total >
                                                                                            1
                                                                                                ? 's'
                                                                                                : ''}
                                                                                        </Badge>
                                                                                    </div>
                                                                                    <Table
                                                                                        size="sm"
                                                                                        bordered
                                                                                        className="mt-2"
                                                                                    >
                                                                                        <thead>
                                                                                            <tr>
                                                                                                <th>
                                                                                                    Nom et Prénoms
                                                                                                </th>
                                                                                                <th>
                                                                                                    Matricule
                                                                                                </th>
                                                                                                <th>
                                                                                                    Grade
                                                                                                </th>
                                                                                                <th>
                                                                                                    Date de Retraite
                                                                                                </th>
                                                                                            </tr>
                                                                                        </thead>
                                                                                        <tbody>
                                                                                            {sousDirectionData.agents.map(
                                                                                                (agent) => {
                                                                                                    const retirementDate =
                                                                                                        formatRetirementDate(
                                                                                                            agent
                                                                                                        );
                                                                                                    return (
                                                                                                        <tr
                                                                                                            key={
                                                                                                                agent.id
                                                                                                            }
                                                                                                        >
                                                                                                            <td>
                                                                                                                {`${
                                                                                                                    agent.nom ||
                                                                                                                    ''
                                                                                                                } ${
                                                                                                                    agent.prenom ||
                                                                                                                    ''
                                                                                                                }`.trim() ||
                                                                                                                    '-'}
                                                                                                            </td>
                                                                                                            <td>
                                                                                                                <strong>
                                                                                                                    {agent.matricule ||
                                                                                                                        '-'}
                                                                                                                </strong>
                                                                                                            </td>
                                                                                                            <td>
                                                                                                                {agent.grade_libele ||
                                                                                                                    '-'}
                                                                                                            </td>
                                                                                                            <td>
                                                                                                                {
                                                                                                                    retirementDate
                                                                                                                }
                                                                                                            </td>
                                                                                                        </tr>
                                                                                                    );
                                                                                                }
                                                                                            )}
                                                                                        </tbody>
                                                                                    </Table>
                                                                                </div>
                                                                            )
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    }
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            {groupedTotalPages > 1 && (
                                <div className="d-flex justify-content-between align-items-center mt-3">
                                    <span className="text-muted">
                                        Page {groupedCurrentPage} sur {groupedTotalPages}
                                    </span>
                                    <div>
                                        <Button
                                            color="secondary"
                                            size="sm"
                                            className="me-2"
                                            disabled={groupedCurrentPage === 1}
                                            onClick={() =>
                                                setGroupedCurrentPage((prev) => Math.max(1, prev - 1))
                                            }
                                        >
                                            Précédent
                                        </Button>
                                        <Button
                                            color="secondary"
                                            size="sm"
                                            disabled={groupedCurrentPage === groupedTotalPages}
                                            onClick={() =>
                                                setGroupedCurrentPage((prev) =>
                                                    Math.min(groupedTotalPages, prev + 1)
                                                )
                                            }
                                        >
                                            Suivant
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </CardBody>
            </Card>

            <style jsx>{`
                .verification-retraites-page {
                    padding: 20px;
                }

                .page-title {
                    font-size: 2rem;
                    font-weight: 600;
                    color: #333;
                    margin-bottom: 0.5rem;
                    display: flex;
                    align-items: center;
                }

                .page-description {
                    color: #666;
                    margin-bottom: 0;
                }

                .autocomplete-container {
                    position: relative;
                }

                .autocomplete-list {
                    position: absolute;
                    width: 100%;
                    max-height: 220px;
                    overflow-y: auto;
                    background-color: #fff;
                    border: 1px solid #ced4da;
                    border-radius: 0.25rem;
                    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.08);
                    z-index: 20;
                    margin-top: 4px;
                }

                .autocomplete-item {
                    padding: 8px 12px;
                    cursor: pointer;
                }

                .autocomplete-item:hover,
                .autocomplete-item:focus {
                    background-color: #e8f1ff;
                    outline: none;
                }
            `}</style>
        </div>
    );
};

export default VerificationRetraitesPage;