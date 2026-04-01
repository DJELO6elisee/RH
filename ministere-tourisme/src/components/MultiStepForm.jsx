import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Modal,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
    Form,
    FormGroup,
    Label,
    Input,
    Row,
    Col,
    Progress,
    Alert,
    Card,
    CardBody,
    CardHeader
} from 'reactstrap';
import SearchableSelect from './SearchableSelect';
import DynamicDocumentsFields from './DynamicDocumentsFields';
import { useAuth } from '../contexts/AuthContext';
import './MultiStepForm.css';

// Composant pour gérer les langues de l'agent
const AgentLanguesFields = ({ value = [], onChange, invalid }) => {
    const [langues, setLangues] = useState(value);
    const [languesOptions, setLanguesOptions] = useState([]);
    const [niveauLanguesOptions, setNiveauLanguesOptions] = useState([]);

    useEffect(() => {
        console.log('🔍 AgentLanguesFields - Mise à jour des langues:', value);
        setLangues(value);
    }, [value]);

    // Charger les options de langues et niveaux
    useEffect(() => {
        const loadOptions = async () => {
            try {
                const [languesRes, niveauRes] = await Promise.all([
                    fetch('https://tourisme.2ise-groupe.com/api/langues'),
                    fetch('https://tourisme.2ise-groupe.com/api/niveau_langues')
                ]);
                
                if (languesRes.ok) {
                    const languesData = await languesRes.json();
                    console.log('🌍 Langues chargées:', languesData.data);
                    setLanguesOptions(languesData.data || []);
                } else {
                    console.error('❌ Erreur chargement langues:', languesRes.status);
                }
                
                if (niveauRes.ok) {
                    const niveauData = await niveauRes.json();
                    console.log('🌍 Niveaux langues chargés:', niveauData.data);
                    setNiveauLanguesOptions(niveauData.data || []);
                } else {
                    console.error('❌ Erreur chargement niveaux langues:', niveauRes.status);
                }
            } catch (error) {
                console.error('Erreur lors du chargement des options:', error);
            }
        };
        
        loadOptions();
    }, []);

    const addLangue = () => {
        const newLangues = [...langues, { id_langue: '', id_niveau_langue: '', langue_personnalisee: '' }];
        setLangues(newLangues);
        onChange(newLangues);
    };

    const removeLangue = (index) => {
        const newLangues = langues.filter((_, i) => i !== index);
        setLangues(newLangues);
        onChange(newLangues);
    };

    const updateLangue = (index, field, value) => {
        const newLangues = [...langues];
        newLangues[index] = { ...newLangues[index], [field]: value };
        setLangues(newLangues);
        onChange(newLangues);
    };

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-3">
                <Label>Langues</Label>
                <Button color="primary" size="sm" onClick={addLangue}>
                    <i className="fas fa-plus"></i> Ajouter une langue
                </Button>
            </div>
            
            {langues.map((langue, index) => (
                <Card key={index} className="mb-3">
                    <CardBody>
                        <Row>
                            <Col md={5}>
                                <FormGroup>
                                    <Label>Langue</Label>
                                    <Input
                                        type="select"
                                        value={langue.id_langue || ''}
                                        onChange={(e) => updateLangue(index, 'id_langue', e.target.value)}
                                        invalid={invalid}
                                    >
                                        <option value="">Sélectionner une langue</option>
                                        {languesOptions.map(option => (
                                            <option key={option.id} value={option.id}>
                                                {option.libele}
                                            </option>
                                        ))}
                                        <option value="autre">Autre</option>
                                    </Input>
                                    {langue.id_langue === 'autre' && (
                                        <Input
                                            type="text"
                                            placeholder="Saisir le nom de la langue"
                                            value={langue.langue_personnalisee || ''}
                                            onChange={(e) => updateLangue(index, 'langue_personnalisee', e.target.value.toUpperCase())}
                                            className="mt-2"
                                            style={{ textTransform: 'uppercase' }}
                                        />
                                    )}
                                </FormGroup>
                            </Col>
                            <Col md={5}>
                                <FormGroup>
                                    <Label>Niveau</Label>
                                    <Input
                                        type="select"
                                        value={langue.id_niveau_langue || ''}
                                        onChange={(e) => updateLangue(index, 'id_niveau_langue', e.target.value)}
                                        invalid={invalid}
                                    >
                                        <option value="">Sélectionner un niveau</option>
                                        {niveauLanguesOptions.map(option => (
                                            <option key={option.id} value={option.id}>
                                                {option.libele}
                                            </option>
                                        ))}
                                    </Input>
                                </FormGroup>
                            </Col>
                            <Col md={2} className="d-flex align-items-end">
                                <Button color="danger" size="sm" onClick={() => removeLangue(index)}>
                                    <i className="fas fa-trash"></i>
                                </Button>
                            </Col>
                        </Row>
                    </CardBody>
                </Card>
            ))}
        </div>
    );
};

// Composant pour gérer les logiciels de l'agent
const AgentLogicielsFields = ({ value = [], onChange, invalid }) => {
    const [logiciels, setLogiciels] = useState(value);
    const [logicielsOptions, setLogicielsOptions] = useState([]);
    const [niveauInformatiqueOptions, setNiveauInformatiqueOptions] = useState([]);

    useEffect(() => {
        console.log('🔍 AgentLogicielsFields - Mise à jour des logiciels:', value);
        setLogiciels(value);
    }, [value]);

    // Charger les options de logiciels et niveaux
    useEffect(() => {
        const loadOptions = async () => {
            try {
                const [logicielsRes, niveauRes] = await Promise.all([
                    fetch('https://tourisme.2ise-groupe.com/api/logiciels'),
                    fetch('https://tourisme.2ise-groupe.com/api/niveau_informatiques')
                ]);
                
                if (logicielsRes.ok) {
                    const logicielsData = await logicielsRes.json();
                    console.log('💻 Logiciels chargés:', logicielsData.data);
                    setLogicielsOptions(logicielsData.data || []);
                } else {
                    console.error('❌ Erreur chargement logiciels:', logicielsRes.status);
                }
                
                if (niveauRes.ok) {
                    const niveauData = await niveauRes.json();
                    console.log('💻 Niveaux informatiques chargés:', niveauData.data);
                    setNiveauInformatiqueOptions(niveauData.data || []);
                } else {
                    console.error('❌ Erreur chargement niveaux informatiques:', niveauRes.status);
                }
            } catch (error) {
                console.error('Erreur lors du chargement des options:', error);
            }
        };
        
        loadOptions();
    }, []);

    const addLogiciel = () => {
        const newLogiciels = [...logiciels, { id_logiciel: '', id_niveau_informatique: '', logiciel_personnalise: '' }];
        setLogiciels(newLogiciels);
        onChange(newLogiciels);
    };

    const removeLogiciel = (index) => {
        const newLogiciels = logiciels.filter((_, i) => i !== index);
        setLogiciels(newLogiciels);
        onChange(newLogiciels);
    };

    const updateLogiciel = (index, field, value) => {
        const newLogiciels = [...logiciels];
        newLogiciels[index] = { ...newLogiciels[index], [field]: value };
        setLogiciels(newLogiciels);
        onChange(newLogiciels);
    };

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-3">
                <Label>Logiciels</Label>
                <Button color="primary" size="sm" onClick={addLogiciel}>
                    <i className="fas fa-plus"></i> Ajouter un logiciel
                </Button>
            </div>
            
            {logiciels.map((logiciel, index) => (
                <Card key={index} className="mb-3">
                    <CardBody>
                        <Row>
                            <Col md={5}>
                                <FormGroup>
                                    <Label>Logiciel</Label>
                                    <Input
                                        type="select"
                                        value={logiciel.id_logiciel || ''}
                                        onChange={(e) => updateLogiciel(index, 'id_logiciel', e.target.value)}
                                        invalid={invalid}
                                    >
                                        <option value="">Sélectionner un logiciel</option>
                                        {logicielsOptions.map(option => (
                                            <option key={option.id} value={option.id}>
                                                {option.libele}
                                            </option>
                                        ))}
                                        <option value="autre">Autre</option>
                                    </Input>
                                    {logiciel.id_logiciel === 'autre' && (
                                        <Input
                                            type="text"
                                            placeholder="Saisir le nom du logiciel"
                                            value={logiciel.logiciel_personnalise || ''}
                                            onChange={(e) => updateLogiciel(index, 'logiciel_personnalise', e.target.value.toUpperCase())}
                                            className="mt-2"
                                            style={{ textTransform: 'uppercase' }}
                                        />
                                    )}
                                </FormGroup>
                            </Col>
                            <Col md={5}>
                                <FormGroup>
                                    <Label>Niveau</Label>
                                    <Input
                                        type="select"
                                        value={logiciel.id_niveau_informatique || ''}
                                        onChange={(e) => updateLogiciel(index, 'id_niveau_informatique', e.target.value)}
                                        invalid={invalid}
                                    >
                                        <option value="">Sélectionner un niveau</option>
                                        {niveauInformatiqueOptions.map(option => (
                                            <option key={option.id} value={option.id}>
                                                {option.libele}
                                            </option>
                                        ))}
                                    </Input>
                                </FormGroup>
                            </Col>
                            <Col md={2} className="d-flex align-items-end">
                                <Button color="danger" size="sm" onClick={() => removeLogiciel(index)}>
                                    <i className="fas fa-trash"></i>
                                </Button>
                            </Col>
                        </Row>
                    </CardBody>
                </Card>
            ))}
        </div>
    );
};

// Composant pour afficher une image avec authentification
const ImageWithAuth = ({ documentUrl, fileName, index }) => {
    const [imageSrc, setImageSrc] = useState(null);
    const [imageError, setImageError] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadImage = async () => {
            if (!documentUrl) {
                setImageError(true);
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setImageError(false);
                
                // Utiliser l'endpoint API pour servir le fichier avec les bons headers CORS
                const apiUrl = process.env.REACT_APP_API_URL || 'https://tourisme.2ise-groupe.com';
                
                // Extraire le chemin relatif du document depuis l'URL complète
                let documentPath = documentUrl;
                if (documentUrl.startsWith(apiUrl)) {
                    documentPath = documentUrl.replace(apiUrl, '');
                } else if (documentUrl.startsWith('http')) {
                    // Si c'est une URL complète d'un autre domaine, utiliser l'endpoint API
                    try {
                        const urlParts = new URL(documentUrl);
                        documentPath = urlParts.pathname;
                    } catch (e) {
                        // Si l'URL est invalide, utiliser le chemin tel quel
                    }
                }
                
                // Encoder le chemin en base64 pour l'endpoint API
                const encodeBase64 = (str) => {
                    try {
                        const uriEncoded = encodeURIComponent(str);
                        return btoa(uriEncoded);
                    } catch (e) {
                        console.error('Erreur lors de l\'encodage base64:', e);
                        return encodeURIComponent(str);
                    }
                };
                
                const encodedPath = encodeBase64(documentPath);
                const apiImageUrl = `${apiUrl}/api/agents/diplome-document/${encodedPath}`;
                
                console.log('🖼️ Chargement de l\'image via API:', apiImageUrl);
                
                // Charger l'image via fetch pour contourner les restrictions CORS
                const token = localStorage.getItem('token');
                const response = await fetch(apiImageUrl, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'image/*,application/pdf,*/*'
                    },
                    mode: 'cors',
                    credentials: 'omit'
                });

                if (!response.ok) {
                    throw new Error(`Erreur HTTP: ${response.status}`);
                }

                const blob = await response.blob();
                const blobUrl = URL.createObjectURL(blob);
                setImageSrc(blobUrl);
                setLoading(false);
                console.log('✅ Image chargée avec succès');
            } catch (err) {
                console.error('❌ Erreur de chargement de l\'image:', err);
                setImageError(true);
                setLoading(false);
            }
        };

        loadImage();

        // Nettoyer l'URL blob quand le composant est démonté
        return () => {
            if (imageSrc) {
                URL.revokeObjectURL(imageSrc);
            }
        };
    }, [documentUrl]);

    if (loading) {
        return (
            <div style={{ 
                textAlign: 'center',
                padding: '40px',
                backgroundColor: '#fff',
                borderRadius: '4px',
                minHeight: '400px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column'
            }}>
                <div className="spinner-border text-primary" role="status">
                    <span className="sr-only">Chargement...</span>
                </div>
                <p className="mt-3 text-muted">Chargement de l'image...</p>
            </div>
        );
    }

    if (imageError || !imageSrc) {
        return (
            <div style={{ 
                textAlign: 'center',
                padding: '40px',
                backgroundColor: '#fff',
                borderRadius: '4px',
                minHeight: '400px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column'
            }}>
                <p className="text-danger">Impossible de charger l'image.</p>
                <p className="text-muted small">URL: {documentUrl}</p>
                <a 
                    href={documentUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="btn btn-primary mt-3"
                >
                    📥 Télécharger/Ouvrir le fichier
                </a>
            </div>
        );
    }

    return (
        <div style={{ 
            textAlign: 'center',
            padding: '20px',
            backgroundColor: '#fff',
            borderRadius: '4px',
            minHeight: '400px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column'
        }}>
            <img
                src={imageSrc}
                alt={fileName}
                style={{
                    maxWidth: '100%',
                    width: 'auto',
                    height: 'auto',
                    maxHeight: '600px',
                    objectFit: 'contain',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    display: 'block',
                    margin: '0 auto'
                }}
                onLoad={() => {
                    console.log('✅ Image affichée avec succès');
                }}
                onError={(e) => {
                    console.error('❌ Erreur lors de l\'affichage de l\'image blob');
                    setImageError(true);
                }}
            />
        </div>
    );
};

// Composant pour gérer les diplômes dynamiques
const DiplomesFields = React.memo(({ value = [], onChange, nombreDiplomes, invalid, existingDiplomes = [], errors = {} }) => {
    const uppercaseFields = ['ecole', 'ville', 'pays'];
    const onChangeRef = useRef(onChange);
    const isInitializedRef = useRef(false);
    const nombreDiplomesRef = useRef(nombreDiplomes);
    const [diplomesOptions, setDiplomesOptions] = useState([]);
    const [viewingDiplomeIndex, setViewingDiplomeIndex] = useState(null);
    const [imageUrls, setImageUrls] = useState({});

    // Mettre à jour la ref onChange (sans déclencher de re-render)
    useEffect(() => {
        onChangeRef.current = onChange;
    }, [onChange]);

    // Ne JAMAIS synchroniser avec value du parent pour éviter les boucles infinies
    // Le composant gère son propre état localement

    // Fonction pour extraire l'année d'une date ou d'un entier (pour les diplômes)
    const extractYearFromDate = (dateOrYear) => {
        if (!dateOrYear && dateOrYear !== 0) return '';
        try {
            // Si c'est déjà un nombre (année), le convertir en string
            if (typeof dateOrYear === 'number') {
                return dateOrYear.toString();
            }
            const dateStr = dateOrYear.toString().trim();
            // Si c'est une année (4 chiffres), la retourner
            if (/^\d{4}$/.test(dateStr)) {
                return dateStr;
            }
            // Sinon, essayer de parser comme date
            const date = new Date(dateOrYear);
            if (!isNaN(date.getTime())) {
                return date.getFullYear().toString();
            }
            return '';
        } catch (error) {
            return '';
        }
    };

    // Fonction pour formater les dates pour l'input HTML (utilisée pour d'autres champs de date)
    const formatDateForInput = (dateString) => {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        } catch (error) {
            return '';
        }
    };

    // Charger les options de diplômes depuis l'API
    useEffect(() => {
        const loadDiplomesOptions = async () => {
            try {
                const apiUrl = process.env.REACT_APP_API_URL || 'https://tourisme.2ise-groupe.com';
                const response = await fetch(`${apiUrl}/api/diplomes`, {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                
                if (response.ok) {
                    const data = await response.json();
                    // Formater les données pour avoir {id, label}
                    const formattedOptions = (data.data || data || []).map(diplome => ({
                        id: diplome.id,
                        label: diplome.libele || diplome.nom || diplome.diplome || ''
                    }));
                    setDiplomesOptions(formattedOptions);
                    console.log('✅ Options de diplômes chargées:', formattedOptions);
                } else {
                    console.error('❌ Erreur lors du chargement des diplômes:', response.status);
                }
            } catch (error) {
                console.error('❌ Erreur lors du chargement des diplômes:', error);
            }
        };
        
        loadDiplomesOptions();
    }, []);

    // Fonction pour créer un diplôme vide
    const createEmptyDiplome = () => ({
        options: '',
        diplome: '',
        diplome_autre: '', // Champ pour stocker le diplôme personnalisé si "Autre" est sélectionné
        date_diplome: '',
        ecole: '',
        ville: '',
        pays: '',
        document: null,
        existingDocument: null
    });

    // Initialiser les diplômes une seule fois
    const [diplomes, setDiplomes] = useState(() => {
        if (nombreDiplomes > 0) {
            const initialDiplomes = [];
            for (let i = 0; i < nombreDiplomes; i++) {
                if (existingDiplomes[i]) {
                    // Vérifier si le diplôme est un diplôme personnalisé (n'est pas dans la liste des options)
                    const diplomeValue = existingDiplomes[i].diplome || '';
                    const isCustomDiplome = diplomeValue !== 'Autre' && diplomeValue !== '' && !diplomesOptions.find(opt => opt.label === diplomeValue);
                    initialDiplomes[i] = {
                        options: existingDiplomes[i].options || '',
                        diplome: isCustomDiplome ? 'Autre' : diplomeValue,
                        diplome_autre: isCustomDiplome ? diplomeValue : (existingDiplomes[i].diplome_autre || ''),
                        date_diplome: extractYearFromDate(existingDiplomes[i].date_diplome) || '',
                        ecole: existingDiplomes[i].ecole || '',
                        ville: existingDiplomes[i].ville || '',
                        pays: existingDiplomes[i].pays || '',
                        document: null,
                        existingDocument: existingDiplomes[i].document_name ? {
                            name: existingDiplomes[i].document_name,
                            size: existingDiplomes[i].document_size,
                            url: existingDiplomes[i].document_url
                        } : null
                    };
                } else if (value[i]) {
                    const diplomeValue = value[i].diplome || '';
                    const isCustomDiplome = diplomeValue !== 'Autre' && diplomeValue !== '' && !diplomesOptions.find(opt => opt.label === diplomeValue);
                    initialDiplomes[i] = {
                        options: value[i].options || '',
                        diplome: isCustomDiplome ? 'Autre' : diplomeValue,
                        diplome_autre: value[i].diplome_autre || (isCustomDiplome ? diplomeValue : ''),
                        date_diplome: value[i].date_diplome || '',
                        ecole: value[i].ecole || '',
                        ville: value[i].ville || '',
                        pays: value[i].pays || '',
                        document: value[i].document || null,
                        existingDocument: value[i].existingDocument || null
                    };
                } else {
                    initialDiplomes[i] = createEmptyDiplome();
                }
            }
            // Notifier le parent une seule fois à l'initialisation
            setTimeout(() => {
                onChangeRef.current(initialDiplomes);
            }, 0);
            return initialDiplomes;
        }
        return [];
    });

    // Mettre à jour quand nombreDiplomes change (seulement si nécessaire)
    useEffect(() => {
        // Ignorer le premier render (déjà géré par useState)
        if (!isInitializedRef.current) {
            isInitializedRef.current = true;
            nombreDiplomesRef.current = nombreDiplomes;
            return;
        }

        // Seulement mettre à jour si nombreDiplomes a vraiment changé
        if (nombreDiplomes !== nombreDiplomesRef.current) {
            nombreDiplomesRef.current = nombreDiplomes;
            
            if (nombreDiplomes > 0) {
                setDiplomes(prevDiplomes => {
                    // Vérifier si on a déjà le bon nombre de diplômes
                    if (prevDiplomes.length === nombreDiplomes) {
                        return prevDiplomes;
                    }
                    
                    const newDiplomes = [];
                    for (let i = 0; i < nombreDiplomes; i++) {
                        if (prevDiplomes[i]) {
                            newDiplomes[i] = { ...prevDiplomes[i] };
                        } else if (existingDiplomes[i]) {
                            const diplomeValue = existingDiplomes[i].diplome || '';
                            const isCustomDiplome = diplomeValue !== 'Autre' && diplomeValue !== '' && !diplomesOptions.find(opt => opt.label === diplomeValue);
                            newDiplomes[i] = {
                                options: existingDiplomes[i].options || '',
                                diplome: isCustomDiplome ? 'Autre' : diplomeValue,
                                diplome_autre: isCustomDiplome ? diplomeValue : (existingDiplomes[i].diplome_autre || ''),
                                date_diplome: extractYearFromDate(existingDiplomes[i].date_diplome) || '',
                                ecole: existingDiplomes[i].ecole || '',
                                ville: existingDiplomes[i].ville || '',
                                pays: existingDiplomes[i].pays || '',
                                document: null,
                                existingDocument: existingDiplomes[i].document_name ? {
                                    name: existingDiplomes[i].document_name,
                                    size: existingDiplomes[i].document_size,
                                    url: existingDiplomes[i].document_url
                                } : null
                            };
                        } else {
                            newDiplomes[i] = createEmptyDiplome();
                        }
                        // S'assurer que diplome_autre existe
                        if (!newDiplomes[i].diplome_autre) {
                            newDiplomes[i].diplome_autre = '';
                        }
                    }
                    setTimeout(() => {
                        onChangeRef.current(newDiplomes);
                    }, 0);
                    return newDiplomes;
                });
            } else {
                setDiplomes([]);
                setTimeout(() => {
                    onChangeRef.current([]);
                }, 0);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [nombreDiplomes]);

    // Fonction pour mettre à jour un champ de diplôme
    const updateDiplome = useCallback((index, field, newValue) => {
        setDiplomes(prevDiplomes => {
            const updatedDiplomes = [...prevDiplomes];
            
            if (!updatedDiplomes[index]) {
                updatedDiplomes[index] = createEmptyDiplome();
            }
            
            const formattedValue = (uppercaseFields.includes(field) && typeof newValue === 'string')
                ? newValue.toUpperCase()
                : newValue;
            
            // Si on change le diplôme et qu'on sélectionne autre chose que "Autre", vider diplome_autre
            if (field === 'diplome' && newValue !== 'Autre') {
                updatedDiplomes[index] = {
                    ...updatedDiplomes[index],
                    [field]: formattedValue,
                    diplome_autre: ''
                };
            } else {
                updatedDiplomes[index] = {
                    ...updatedDiplomes[index],
                    [field]: formattedValue
                };
            }
            
            // Notifier le parent de manière asynchrone pour éviter les re-renders
            setTimeout(() => {
                onChangeRef.current(updatedDiplomes);
            }, 0);
            
            return updatedDiplomes;
        });
    }, []);

    if (nombreDiplomes < 1) {
        return null;
    }

    // S'assurer que le tableau diplomes a le bon nombre d'éléments
    const diplomesToRender = [];
    for (let i = 0; i < nombreDiplomes; i++) {
        if (diplomes[i]) {
            diplomesToRender[i] = diplomes[i];
        } else {
            diplomesToRender[i] = createEmptyDiplome();
        }
    }

    return (
        <div>
            {diplomesToRender.map((diplome, index) => {
                const safeDiplome = {
                    options: diplome.options || '',
                    diplome: diplome.diplome || '',
                    date_diplome: diplome.date_diplome || '',
                    ecole: diplome.ecole || '',
                    ville: diplome.ville || '',
                    pays: diplome.pays || '',
                    document: diplome.document || null,
                    existingDocument: diplome.existingDocument || null
                };
                return (
                <Card key={`diplome-${index}`} className="mb-3">
                    <CardHeader>
                        <h6 className="mb-0">Diplôme {index + 1}</h6>
                    </CardHeader>
                    <CardBody>
                        <Row>
                            <Col md={6}>
                                <FormGroup>
                                    <Label for={`diplome_${index}_nom`}>
                                        Nom du diplôme <span className="text-danger">*</span>
                                    </Label>
                                    <Input
                                        type="select"
                                        id={`diplome_${index}_nom`}
                                        value={safeDiplome.diplome}
                                        onChange={(e) => updateDiplome(index, 'diplome', e.target.value)}
                                        invalid={!!errors[`diplome_${index}_diplome`]}
                                        className="diplome-select"
                                        style={{
                                            overflowY: 'auto',
                                            maxHeight: '200px'
                                        }}
                                    >
                                        <option value="">Sélectionner un diplôme</option>
                                        {diplomesOptions.map((option) => (
                                            <option key={option.id} value={option.label}>
                                                {option.label}
                                            </option>
                                        ))}
                                        <option value="Autre">Autre</option>
                                    </Input>
                                    {safeDiplome.diplome === 'Autre' && (
                                        <Input
                                            type="text"
                                            id={`diplome_${index}_autre`}
                                            value={safeDiplome.diplome_autre || ''}
                                            onChange={(e) => updateDiplome(index, 'diplome_autre', e.target.value)}
                                            placeholder="Saisir le nom du diplôme"
                                            className="mt-2"
                                            invalid={!!errors[`diplome_${index}_diplome_autre`]}
                                        />
                                    )}
                                    {errors[`diplome_${index}_diplome`] && (
                                        <Alert color="danger" className="mt-1 py-1">
                                            {errors[`diplome_${index}_diplome`]}
                                        </Alert>
                                    )}
                                </FormGroup>
                            </Col>
                            <Col md={6}>
                                <FormGroup>
                                    <Label for={`diplome_${index}_options`}>
                                        {safeDiplome.diplome && safeDiplome.diplome.toUpperCase().includes('BAC') ? 'Série' : 'Options'}
                                    </Label>
                                    <Input
                                        type="text"
                                        id={`diplome_${index}_options`}
                                        value={safeDiplome.options}
                                        onChange={(e) => updateDiplome(index, 'options', e.target.value)}
                                        placeholder={safeDiplome.diplome && safeDiplome.diplome.toUpperCase().includes('BAC') ? 'Série du bac' : 'Options du diplôme'}
                                        invalid={!!errors[`diplome_${index}_options`]}
                                    />
                                    {errors[`diplome_${index}_options`] && (
                                        <Alert color="danger" className="mt-1 py-1">
                                            {errors[`diplome_${index}_options`]}
                                        </Alert>
                                    )}
                                </FormGroup>
                            </Col>
                            <Col md={6}>
                                <FormGroup>
                                    <Label for={`diplome_${index}_date`}>Année d'obtention</Label>
                                    <Input
                                        type="number"
                                        id={`diplome_${index}_date`}
                                        value={safeDiplome.date_diplome}
                                        onChange={(e) => updateDiplome(index, 'date_diplome', e.target.value)}
                                        min="1900"
                                        max={new Date().getFullYear()}
                                        placeholder="Ex: 2020"
                                        invalid={!!errors[`diplome_${index}_date_diplome`]}
                                    />
                                    {errors[`diplome_${index}_date_diplome`] && (
                                        <Alert color="danger" className="mt-1 py-1">
                                            {errors[`diplome_${index}_date_diplome`]}
                                        </Alert>
                                    )}
                                </FormGroup>
                            </Col>
                        </Row>
                        <Row>
                            <Col md={4}>
                                <FormGroup>
                                    <Label for={`diplome_${index}_ecole`}>École/Université <span className="text-danger">*</span></Label>
                                    <Input
                                        type="text"
                                        id={`diplome_${index}_ecole`}
                                        value={safeDiplome.ecole}
                                        onChange={(e) => updateDiplome(index, 'ecole', e.target.value)}
                                        placeholder="Nom de l'établissement"
                                        invalid={!!errors[`diplome_${index}_ecole`]}
                                    />
                                    {errors[`diplome_${index}_ecole`] && (
                                        <Alert color="danger" className="mt-1 py-1">
                                            {errors[`diplome_${index}_ecole`]}
                                        </Alert>
                                    )}
                                </FormGroup>
                            </Col>
                            <Col md={4}>
                                <FormGroup>
                                    <Label for={`diplome_${index}_ville`}>Ville <span className="text-danger">*</span></Label>
                                    <Input
                                        type="text"
                                        id={`diplome_${index}_ville`}
                                        value={safeDiplome.ville}
                                        onChange={(e) => updateDiplome(index, 'ville', e.target.value)}
                                        placeholder="Ville de l'établissement"
                                        invalid={!!errors[`diplome_${index}_ville`]}
                                    />
                                    {errors[`diplome_${index}_ville`] && (
                                        <Alert color="danger" className="mt-1 py-1">
                                            {errors[`diplome_${index}_ville`]}
                                        </Alert>
                                    )}
                                </FormGroup>
                            </Col>
                            <Col md={4}>
                                <FormGroup>
                                    <Label for={`diplome_${index}_pays`}>Pays <span className="text-danger">*</span></Label>
                                    <Input
                                        type="text"
                                        id={`diplome_${index}_pays`}
                                        value={safeDiplome.pays}
                                        onChange={(e) => updateDiplome(index, 'pays', e.target.value)}
                                        placeholder="Pays de l'établissement"
                                        invalid={!!errors[`diplome_${index}_pays`]}
                                    />
                                    {errors[`diplome_${index}_pays`] && (
                                        <Alert color="danger" className="mt-1 py-1">
                                            {errors[`diplome_${index}_pays`]}
                                        </Alert>
                                    )}
                                </FormGroup>
                            </Col>
                        </Row>
                        <Row>
                            <Col md={12}>
                                <FormGroup>
                                    <Label for={`diplome_${index}_document`}>Document du diplôme</Label>
                                    <Input
                                        type="file"
                                        id={`diplome_${index}_document`}
                                        onChange={(e) => updateDiplome(index, 'document', e.target.files[0])}
                                        accept=".pdf,.jpg,.jpeg,.png"
                                        invalid={invalid}
                                    />
                                    {safeDiplome.existingDocument && (
                                        <div className="mt-2">
                                            <div className="d-flex align-items-center gap-2 flex-wrap mb-2">
                                                <small className="text-info">
                                                    📄 Document existant: {safeDiplome.existingDocument.name} 
                                                    {safeDiplome.existingDocument.size && ` (${(safeDiplome.existingDocument.size / 1024).toFixed(1)} KB)`}
                                                </small>
                                                <Button
                                                    color={viewingDiplomeIndex === index ? "secondary" : "info"}
                                                    size="sm"
                                                    onClick={() => {
                                                        if (viewingDiplomeIndex === index) {
                                                            setViewingDiplomeIndex(null);
                                                        } else {
                                                            setViewingDiplomeIndex(index);
                                                        }
                                                    }}
                                                >
                                                    {viewingDiplomeIndex === index ? "Masquer le diplôme" : "Voir le diplôme"}
                                                </Button>
                                            </div>
                                            {viewingDiplomeIndex === index && (
                                                <div className="mt-3 p-3 border rounded" style={{ backgroundColor: '#f8f9fa', minHeight: '200px' }}>
                                                    {(() => {
                                                        const apiUrl = process.env.REACT_APP_API_URL || 'https://tourisme.2ise-groupe.com';
                                                        let documentUrl = safeDiplome.existingDocument.url || '';
                                                        
                                                        // Construire l'URL complète
                                                        if (documentUrl && !documentUrl.startsWith('http')) {
                                                            // S'assurer que l'URL commence par /
                                                            if (!documentUrl.startsWith('/')) {
                                                                documentUrl = '/' + documentUrl;
                                                            }
                                                            documentUrl = `${apiUrl}${documentUrl}`;
                                                        }
                                                        
                                                        const fileName = safeDiplome.existingDocument.name || '';
                                                        const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
                                                        const isPdf = fileExtension === 'pdf';
                                                        const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(fileExtension);
                                                        
                                                        console.log('🔍 Affichage du diplôme:', {
                                                            fileName,
                                                            fileExtension,
                                                            documentUrl,
                                                            isPdf,
                                                            isImage,
                                                            existingDocument: safeDiplome.existingDocument
                                                        });
                                                        
                                                        return (
                                                            <div>
                                                                <div className="d-flex justify-content-between align-items-center mb-3">
                                                                    <strong className="text-primary">{fileName}</strong>
                                                                    <Button
                                                                        color="link"
                                                                        size="sm"
                                                                        onClick={() => window.open(documentUrl, '_blank')}
                                                                        className="text-primary"
                                                                    >
                                                                        🔗 Ouvrir dans un nouvel onglet
                                                                    </Button>
                                                                </div>
                                                                {isPdf ? (
                                                                    <iframe
                                                                        src={documentUrl}
                                                                        style={{
                                                                            width: '100%',
                                                                            height: '500px',
                                                                            border: '1px solid #ddd',
                                                                            borderRadius: '4px'
                                                                        }}
                                                                        title={fileName}
                                                                    />
                                                                ) : (
                                                                    <ImageWithAuth 
                                                                        documentUrl={documentUrl}
                                                                        fileName={fileName}
                                                                        index={index}
                                                                    />
                                                                )}
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                    {safeDiplome.document && (
                                        <div className="mt-2">
                                            <small className="text-muted">
                                                Fichier sélectionné: {safeDiplome.document.name} ({(safeDiplome.document.size / 1024).toFixed(1)} KB)
                                            </small>
                                        </div>
                                    )}
                                </FormGroup>
                            </Col>
                        </Row>
                    </CardBody>
                </Card>
                );
            })}
        </div>
    );
}, (prevProps, nextProps) => {
    // Comparaison personnalisée pour éviter les re-renders inutiles
    return (
        prevProps.nombreDiplomes === nextProps.nombreDiplomes &&
        prevProps.invalid === nextProps.invalid &&
        JSON.stringify(prevProps.existingDiplomes) === JSON.stringify(nextProps.existingDiplomes) &&
        JSON.stringify(prevProps.errors) === JSON.stringify(nextProps.errors)
    );
});

// Composant pour gérer les champs des enfants
const ChildrenFields = ({ value = [], onChange, nombreEnfants, errors = {} }) => {
    const onChangeRef = useRef(onChange);
    const isInitializedRef = useRef(false);
    const nombreEnfantsRef = useRef(nombreEnfants);
    
    const [children, setChildren] = useState(() => {
        // Initialiser avec la valeur passée si disponible
        // MAIS s'assurer qu'on crée exactement nombreEnfants éléments
        if (value && Array.isArray(value) && nombreEnfants > 0) {
            isInitializedRef.current = true;
            const initialChildren = [];
            for (let i = 0; i < nombreEnfants; i++) {
                // Utiliser value[i] seulement s'il existe ET a des données valides
                // Sinon créer un enfant vide
                const existingChild = value[i];
                const hasValidData = existingChild && (
                    (existingChild.nom && existingChild.nom.trim() !== '') ||
                    (existingChild.prenom && existingChild.prenom.trim() !== '') ||
                    (existingChild.date_de_naissance && existingChild.date_de_naissance.trim() !== '')
                );
                
                if (hasValidData) {
                    // Utiliser les données existantes pour cet index
                    initialChildren[i] = {
                        id: existingChild.id,
                        nom: existingChild.nom || '',
                        prenom: existingChild.prenom || '',
                        sexe: existingChild.sexe || '',
                        date_de_naissance: existingChild.date_de_naissance || '',
                        lieu_de_naissance: existingChild.lieu_de_naissance || '',
                        scolarise: existingChild.scolarise !== null && existingChild.scolarise !== undefined ? Boolean(existingChild.scolarise) : false,
                        ayant_droit: existingChild.ayant_droit !== null && existingChild.ayant_droit !== undefined ? Boolean(existingChild.ayant_droit) : false
                    };
                } else {
                    // Créer un enfant vide pour cet index
                    initialChildren[i] = {
                        nom: '',
                        prenom: '',
                        sexe: '',
                        date_de_naissance: '',
                        lieu_de_naissance: '',
                        scolarise: false,
                        ayant_droit: false
                    };
                }
            }
            // Notifier le parent après le premier render
            setTimeout(() => {
                onChangeRef.current(initialChildren);
            }, 0);
            return initialChildren;
        }
        // Sinon initialiser selon nombreEnfants avec des enfants vides
        if (nombreEnfants > 0) {
            const initialChildren = [];
            for (let i = 0; i < nombreEnfants; i++) {
                initialChildren[i] = {
                    nom: '',
                    prenom: '',
                    sexe: '',
                    date_de_naissance: '',
                    lieu_de_naissance: '',
                    scolarise: false,
                    ayant_droit: false
                };
            }
            // Notifier le parent après le premier render
            setTimeout(() => {
                onChangeRef.current(initialChildren);
            }, 0);
            return initialChildren;
        }
        return [];
    });

    // Mettre à jour la ref onChange (sans déclencher de re-render)
    useEffect(() => {
        onChangeRef.current = onChange;
    }, [onChange]);

    // Initialiser depuis initialData (value) une seule fois
    // IMPORTANT: Ne réinitialiser que si value change vraiment (nouvelle référence)
    // et seulement si on n'a pas déjà initialisé avec ces données
    useEffect(() => {
        if (!isInitializedRef.current && value && Array.isArray(value) && nombreEnfants > 0) {
            isInitializedRef.current = true;
            const newChildren = [];
            for (let i = 0; i < nombreEnfants; i++) {
                // Utiliser value[i] seulement s'il existe ET a des données valides (au moins nom ou prenom)
                // Sinon créer un enfant vide
                const existingChild = value[i];
                const hasValidData = existingChild && (
                    (existingChild.nom && existingChild.nom.trim() !== '') ||
                    (existingChild.prenom && existingChild.prenom.trim() !== '') ||
                    (existingChild.date_de_naissance && existingChild.date_de_naissance.trim() !== '')
                );
                
                if (hasValidData) {
                    // Utiliser les données existantes pour cet index
                    newChildren[i] = {
                        id: existingChild.id,
                        nom: existingChild.nom || '',
                        prenom: existingChild.prenom || '',
                        sexe: existingChild.sexe || '',
                        date_de_naissance: existingChild.date_de_naissance || '',
                        lieu_de_naissance: existingChild.lieu_de_naissance || '',
                        scolarise: existingChild.scolarise !== null && existingChild.scolarise !== undefined ? Boolean(existingChild.scolarise) : false,
                        ayant_droit: existingChild.ayant_droit !== null && existingChild.ayant_droit !== undefined ? Boolean(existingChild.ayant_droit) : false
                    };
                } else {
                    // Créer un enfant vide pour cet index
                    newChildren[i] = {
                        nom: '',
                        prenom: '',
                        sexe: '',
                        date_de_naissance: '',
                        lieu_de_naissance: '',
                        scolarise: false,
                        ayant_droit: false
                    };
                }
            }
            setChildren(newChildren);
            setTimeout(() => {
                onChangeRef.current(newChildren);
            }, 0);
        }
    }, [value, nombreEnfants]);

    // Gérer le changement de nombreEnfants (sans dépendre de children pour éviter les boucles)
    useEffect(() => {
        if (nombreEnfantsRef.current !== nombreEnfants) {
            nombreEnfantsRef.current = nombreEnfants;
            
            setChildren(prevChildren => {
                if (nombreEnfants > 0) {
                    const newChildren = [];
                    for (let i = 0; i < nombreEnfants; i++) {
                        // Préserver les enfants existants si disponibles, sinon créer un nouveau
                        newChildren[i] = prevChildren[i] || {
                            nom: '',
                            prenom: '',
                            sexe: '',
                            date_de_naissance: '',
                            lieu_de_naissance: '',
                            scolarise: false,
                            ayant_droit: false
                        };
                    }
                    // Notifier le parent après la mise à jour
                    setTimeout(() => {
                        onChangeRef.current(newChildren);
                    }, 0);
                    return newChildren;
                } else {
                    // Si nombreEnfants est 0, vider le tableau
                    setTimeout(() => {
                        onChangeRef.current([]);
                    }, 0);
                    return [];
                }
            });
        }
    }, [nombreEnfants]);

    const updateChild = (index, field, newValue) => {
        setChildren(prevChildren => {
            const updatedChildren = [...prevChildren];
            updatedChildren[index] = {
                ...updatedChildren[index],
                [field]: newValue
            };
            // Notifier le parent de manière asynchrone pour éviter les conflits
            setTimeout(() => {
                onChangeRef.current(updatedChildren);
            }, 0);
            return updatedChildren;
        });
    };

    if (nombreEnfants < 1) {
        return null;
    }

    // S'assurer qu'on a exactement nombreEnfants éléments dans children
    const childrenToRender = [];
    for (let i = 0; i < nombreEnfants; i++) {
        childrenToRender[i] = children[i] || {
            nom: '',
            prenom: '',
            sexe: '',
            date_de_naissance: '',
            lieu_de_naissance: '',
            scolarise: false,
            ayant_droit: false
        };
    }

    return (
        <div>
            {childrenToRender.map((child, index) => (
                <Card key={index} className="mb-3">
                    <CardHeader>
                        <h6 className="mb-0">Enfant {index + 1}</h6>
                    </CardHeader>
                    <CardBody>
                        <Row>
                            <Col md={6}>
                                <FormGroup>
                                    <Label for={`enfant_${index}_nom`}>Nom</Label>
                                    <Input
                                        type="text"
                                        id={`enfant_${index}_nom`}
                                        value={child.nom}
                                        onChange={(e) => updateChild(index, 'nom', e.target.value)}
                                        placeholder="Nom de l'enfant"
                                        invalid={!!errors[`enfant_${index}_nom`]}
                                    />
                                    {errors[`enfant_${index}_nom`] && (
                                        <Alert color="danger" className="mt-1 py-1">
                                            {errors[`enfant_${index}_nom`]}
                                        </Alert>
                                    )}
                                </FormGroup>
                            </Col>
                            <Col md={6}>
                                <FormGroup>
                                    <Label for={`enfant_${index}_prenom`}>Prénoms</Label>
                                    <Input
                                        type="text"
                                        id={`enfant_${index}_prenom`}
                                        value={child.prenom}
                                        onChange={(e) => updateChild(index, 'prenom', e.target.value)}
                                        placeholder="Prénoms de l'enfant"
                                        invalid={!!errors[`enfant_${index}_prenom`]}
                                    />
                                    {errors[`enfant_${index}_prenom`] && (
                                        <Alert color="danger" className="mt-1 py-1">
                                            {errors[`enfant_${index}_prenom`]}
                                        </Alert>
                                    )}
                                </FormGroup>
                            </Col>
                        </Row>
                        <Row>
                            <Col md={4}>
                                <FormGroup>
                                    <Label for={`enfant_${index}_sexe`}>Sexe</Label>
                                    <Input
                                        type="select"
                                        id={`enfant_${index}_sexe`}
                                        value={child.sexe}
                                        onChange={(e) => updateChild(index, 'sexe', e.target.value)}
                                        invalid={!!errors[`enfant_${index}_sexe`]}
                                    >
                                        <option value="">Sélectionner</option>
                                        <option value="M">Masculin</option>
                                        <option value="F">Féminin</option>
                                    </Input>
                                    {errors[`enfant_${index}_sexe`] && (
                                        <Alert color="danger" className="mt-1 py-1">
                                            {errors[`enfant_${index}_sexe`]}
                                        </Alert>
                                    )}
                                </FormGroup>
                            </Col>
                            <Col md={4}>
                                <FormGroup>
                                    <Label for={`enfant_${index}_date_naissance`}>Date de naissance</Label>
                                    <Input
                                        type="date"
                                        id={`enfant_${index}_date_naissance`}
                                        value={child.date_de_naissance}
                                        onChange={(e) => updateChild(index, 'date_de_naissance', e.target.value)}
                                        invalid={!!errors[`enfant_${index}_date_naissance`]}
                                    />
                                    {errors[`enfant_${index}_date_naissance`] && (
                                        <Alert color="danger" className="mt-1 py-1">
                                            {errors[`enfant_${index}_date_naissance`]}
                                        </Alert>
                                    )}
                                </FormGroup>
                            </Col>
                            <Col md={4}>
                                <FormGroup>
                                    <Label for={`enfant_${index}_scolarise`}>Scolarisé</Label>
                                    <Input
                                        type="select"
                                        id={`enfant_${index}_scolarise`}
                                        value={child.scolarise === true || child.scolarise === 'true' ? 'true' : (child.scolarise === false || child.scolarise === 'false' ? 'false' : '')}
                                        onChange={(e) => updateChild(index, 'scolarise', e.target.value === 'true')}
                                        invalid={!!errors[`enfant_${index}_scolarise`]}
                                    >
                                        <option value="">Sélectionner</option>
                                        <option value="true">Oui</option>
                                        <option value="false">Non</option>
                                    </Input>
                                    {errors[`enfant_${index}_scolarise`] && (
                                        <Alert color="danger" className="mt-1 py-1">
                                            {errors[`enfant_${index}_scolarise`]}
                                        </Alert>
                                    )}
                                </FormGroup>
                            </Col>
                        </Row>
                        <Row>
                            <Col md={6}>
                                <FormGroup>
                                    <Label for={`enfant_${index}_ayant_droit`}>Ayant droit</Label>
                                    <Input
                                        type="select"
                                        id={`enfant_${index}_ayant_droit`}
                                        value={child.ayant_droit === true || child.ayant_droit === 'true' ? 'true' : (child.ayant_droit === false || child.ayant_droit === 'false' ? 'false' : '')}
                                        onChange={(e) => updateChild(index, 'ayant_droit', e.target.value === 'true')}
                                        invalid={!!errors[`enfant_${index}_ayant_droit`]}
                                    >
                                        <option value="">Sélectionner</option>
                                        <option value="true">Oui</option>
                                        <option value="false">Non</option>
                                    </Input>
                                    {errors[`enfant_${index}_ayant_droit`] && (
                                        <Alert color="danger" className="mt-1 py-1">
                                            {errors[`enfant_${index}_ayant_droit`]}
                                        </Alert>
                                    )}
                                </FormGroup>
                            </Col>
                        </Row>
                    </CardBody>
                </Card>
            ))}
        </div>
    );
};

const MultiStepForm = ({
    isOpen,
    toggle,
    title,
    steps = [],
    onSubmit,
    initialData = {},
    submitText = "Enregistrer"
}) => {
    const { user } = useAuth();
    const [currentStep, setCurrentStep] = useState(0);
    
    // Logs désactivés pour éviter les re-renders
    
    // Fonction pour obtenir l'ID du ministère de l'utilisateur connecté
    const getUserMinistereId = async () => {
        console.log('🔍 MultiStepForm - getUserMinistereId appelé, user:', user);
        
        if (user?.organization?.id && user?.organization?.type === 'ministere') {
            console.log('🔍 MultiStepForm - Ministère trouvé dans user.organization:', user.organization.id);
            return user.organization.id;
        }
        
        if (user?.id_agent) {
            console.log('🔍 MultiStepForm - Recherche du ministère via l\'agent:', user.id_agent);
            try {
                const response = await fetch(`https://tourisme.2ise-groupe.com/api/agents/${user.id_agent}`, {
                    headers: getAuthHeaders()
                });
                if (response.ok) {
                    const result = await response.json();
                    console.log('🔍 MultiStepForm - Réponse API agent:', result);
                    return result.data?.id_ministere;
                }
            } catch (error) {
                console.error('❌ Erreur lors de la récupération du ministère:', error);
            }
        }
        
        console.warn('⚠️ MultiStepForm - Aucun ministère trouvé pour l\'utilisateur');
        return null;
    };
    const [formData, setFormData] = useState(initialData || {});
    const [errors, setErrors] = useState({});
    const [dynamicOptions, setDynamicOptions] = useState({});
    const [submitError, setSubmitError] = useState(null);

    // S'assurer que formData est toujours un objet valide
    useEffect(() => {
        if (!formData || typeof formData !== 'object') {
            setFormData({});
        }
    }, [formData]);

    // Mettre à jour formData quand initialData change (pour l'édition)
    useEffect(() => {
        if (initialData && Object.keys(initialData).length > 0) {
            // Données initiales reçues pour l'édition
            
            // Convertir les valeurs textuelles en majuscules lors du chargement pour modification, sauf pour certains champs spéciaux
            const processedData = { ...initialData };
            const fieldsToPreserveCase = ['email', 'situation_militaire', 'statut_emploi', 'grade_prefectoral', 'corps_prefectoral', 'numero_acte_mariage', 'numero_et_date_acte_mariage'];
            
            // Liste des champs numériques qui ne doivent pas être convertis en chaînes vides
            const numericFields = ['id_direction', 'id_sous_direction', 'id_service', 'service_id', 'sous_direction_id', 
                                   'id_pays', 'id_civilite', 'id_nationalite', 'id_type_d_agent', 'id_situation_matrimoniale',
                                   'id_ministere', 'id_entite_principale', 'id_grade', 'id_categorie', 'id_echelon',
                                   'id_position', 'id_handicap', 'id_mode_entree', 'nombre_enfant', 'age', 
                                   'grade_prefectoral', 'echelon_prefectoral'];
            
            // S'assurer que les champs texte null/undefined sont convertis en chaînes vides
            // MAIS préserver les valeurs null pour les champs numériques
            Object.keys(processedData).forEach(key => {
                // Exception spéciale pour numero_et_date_acte_mariage qui est un objet composite
                if (key === 'numero_et_date_acte_mariage') {
                    // Préserver l'objet tel quel, mais s'assurer qu'il a la bonne structure
                    if (processedData[key] && typeof processedData[key] === 'object') {
                        processedData[key] = {
                            numero: processedData[key].numero !== null && processedData[key].numero !== undefined ? String(processedData[key].numero) : '',
                            date: processedData[key].date || ''
                        };
                    } else if (!processedData[key] || typeof processedData[key] !== 'object') {
                        processedData[key] = { numero: '', date: '' };
                    }
                    return; // Ne pas traiter ce champ comme les autres
                }
                
                // Pour les champs numériques, préserver null ou la valeur numérique
                if (numericFields.includes(key)) {
                    // Ne pas convertir null en chaîne vide pour les champs numériques
                    if (processedData[key] === null || processedData[key] === undefined) {
                        // Garder null pour les champs numériques
                        processedData[key] = null;
                    } else if (typeof processedData[key] === 'string' && !isNaN(processedData[key]) && processedData[key].trim() !== '') {
                        // Convertir les chaînes numériques en nombres
                        processedData[key] = Number(processedData[key]);
                    }
                } else {
                    // Pour les autres champs, convertir null/undefined en chaîne vide
                    if (processedData[key] === null || processedData[key] === undefined) {
                        processedData[key] = '';
                    } else if (typeof processedData[key] === 'string' && !fieldsToPreserveCase.includes(key)) {
                        processedData[key] = processedData[key].toUpperCase();
                    }
                }
            });
            
            // Pour Direction Générale, Direction, Sous-direction : stocker '' au lieu de null
            // pour que "Aucune" s'affiche correctement à la réouverture du formulaire après sauvegarde
            ['id_direction_generale', 'id_direction', 'id_sous_direction'].forEach(fieldName => {
                if (processedData[fieldName] === null || processedData[fieldName] === undefined) {
                    processedData[fieldName] = '';
                }
            });
            
            // Logs pour déboguer les champs familiaux et la direction
            console.log('🔍 MultiStepForm - Données initiales reçues:', {
                nom_de_la_mere: processedData.nom_de_la_mere,
                nom_du_pere: processedData.nom_du_pere,
                id_pays: processedData.id_pays,
                id_direction: processedData.id_direction,
                id_direction_type: typeof processedData.id_direction,
                numero_et_date_acte_mariage: processedData.numero_et_date_acte_mariage
            });
            
            // Définir formData d'abord pour que les valeurs soient disponibles
            setFormData(processedData);
            
            // Charger les options dynamiques de manière asynchrone
            // Les options seront chargées et le SearchableSelect se mettra à jour automatiquement
            loadDynamicOptionsForEdit(processedData).then(() => {
                console.log('✅ MultiStepForm - Options chargées, le formulaire devrait maintenant afficher les valeurs');
                
                // Convertir le grade préfectoral (abréviation) en ID si nécessaire
                if (processedData.grade_prefectoral && dynamicOptions.grade_prefectoral) {
                    const gradeValue = processedData.grade_prefectoral;
                    // Si c'est une abréviation (HG, GI, GII, GIII), trouver l'ID correspondant
                    if (['HG', 'GI', 'GII', 'GIII'].includes(String(gradeValue))) {
                        const gradeMapping = {
                            'HG': ['HG', 'Hors grade', 'Hors grade (HG)'],
                            'GI': ['GI', 'Grade I', 'Grade I (GI)'],
                            'GII': ['GII', 'Grade II', 'Grade II (GII)'],
                            'GIII': ['GIII', 'Grade III', 'Grade III (GIII)']
                        };
                        
                        const searchTerms = gradeMapping[gradeValue] || [];
                        const matchingGrade = dynamicOptions.grade_prefectoral.find(grade => {
                            const gradeLabel = grade.label || grade.libele || '';
                            return searchTerms.some(term => 
                                gradeLabel.toLowerCase().includes(term.toLowerCase()) ||
                                gradeLabel === term
                            );
                        });
                        
                        if (matchingGrade) {
                            processedData.grade_prefectoral = matchingGrade.id;
                            console.log('✅ Grade préfectoral converti de', gradeValue, 'vers ID:', matchingGrade.id);
                        }
                    }
                }
                
                // Forcer une mise à jour du formData pour déclencher un re-render des champs select
                // Cela garantit que SearchableSelect reçoit les options mises à jour
                setFormData(prevData => ({ ...processedData, ...prevData }));
            }).catch(error => {
                console.error('❌ MultiStepForm - Erreur lors du chargement des options:', error);
            });
        } else {
            // Initialiser les valeurs par défaut pour la création
            // Récupérer les defaultValue des champs définis dans les steps
            const defaultValues = {
                statut_emploi: 'actif',
                nombre_diplomes: 0
            };
            
            // Parcourir tous les champs pour appliquer leurs defaultValue
            steps.forEach(step => {
                step.fields.forEach(field => {
                    if (field.defaultValue !== undefined && !formData[field.name]) {
                        defaultValues[field.name] = field.defaultValue;
                    }
                });
            });
            
            setFormData(prev => ({ ...defaultValues, ...prev }));
        }
    }, [initialData]);

    // Initialiser la position "présent" par défaut après le chargement des options
    useEffect(() => {
        if (!initialData || Object.keys(initialData).length === 0) {
            // Seulement pour la création, pas pour l'édition
            if (dynamicOptions.id_position && dynamicOptions.id_position.length > 0) {
                const positionPresent = dynamicOptions.id_position.find(
                    pos => pos.label && (pos.label.toLowerCase().includes('présent') || pos.label.toLowerCase().includes('present'))
                );
                if (positionPresent && !formData.id_position) {
                    setFormData(prev => ({
                        ...prev,
                        id_position: positionPresent.id || positionPresent.value
                    }));
                }
            }
        }
    }, [dynamicOptions.id_position]);

    // Déclencher automatiquement la cascade quand id_direction change
    useEffect(() => {
        if (formData.id_direction && formData.id_direction !== '') {
            // Déclencher la cascade pour les champs dépendants
            handleCascadeChange('id_direction', formData.id_direction, formData);
        }
    }, [formData.id_direction]);

    // Calculer automatiquement la date de retraite quand date_de_naissance ou id_grade change
    // Ce useEffect sert de mécanisme de secours si le calcul dans handleInputChange n'a pas pu se faire
    // (par exemple si les options de grade n'étaient pas encore chargées)
    useEffect(() => {
        // Vérifier que nous sommes en mode création (pas d'initialData) pour éviter de recalculer en mode édition
        const isCreateMode = !initialData || Object.keys(initialData).length === 0;
        
        if (isCreateMode && formData.date_de_naissance && formData.id_grade && dynamicOptions.id_grade && dynamicOptions.id_grade.length > 0) {
            // Récupérer le libellé du grade sélectionné
            // Normaliser les IDs pour la comparaison (peut être string ou number)
            const gradeId = typeof formData.id_grade === 'string' && !isNaN(formData.id_grade) 
                ? Number(formData.id_grade) 
                : formData.id_grade;
            
            const selectedGrade = dynamicOptions.id_grade.find(opt => {
                const optId = typeof opt === 'object' ? opt.id : opt;
                return optId === gradeId || Number(optId) === Number(gradeId);
            });
            
            if (selectedGrade && selectedGrade.label) {
                const calculatedDate = calculateRetirementDate(formData.date_de_naissance, selectedGrade.label);
                if (calculatedDate) {
                    // Toujours mettre à jour pour s'assurer que la valeur est présente
                    setFormData(prev => {
                        // Ne pas mettre à jour si la date est déjà correcte pour éviter les boucles infinies
                        if (prev.date_retraite === calculatedDate) {
                            return prev;
                        }
                        console.log('✅ Date de retraite calculée automatiquement dans useEffect:', calculatedDate, '(Grade:', selectedGrade.label, ')');
                        return {
                            ...prev,
                            date_retraite: calculatedDate
                        };
                    });
                }
            } else {
                console.log('⚠️ Grade non trouvé dans les options pour le calcul de la date de retraite:', {
                    gradeId: formData.id_grade,
                    availableGrades: dynamicOptions.id_grade.map(g => ({ id: g.id, label: g.label }))
                });
            }
        }
    }, [formData.date_de_naissance, formData.id_grade, dynamicOptions.id_grade, initialData]);

    // Fonction pour obtenir les headers d'authentification
    const getAuthHeaders = () => {
        const token = localStorage.getItem('token');
        return {
            'Content-Type': 'application/json',
            ...(token && token !== 'null' && token !== 'undefined' && token.trim() !== '' && { 'Authorization': `Bearer ${token}` })
        };
    };

    // Cache pour éviter les requêtes multiples
    const [optionsCache, setOptionsCache] = useState({});
    
    // Fonction pour gérer les changements en cascade
    const handleCascadeChange = async (fieldName, value, currentFormData, isInitialLoad = false) => {
        
        // Trouver le champ qui a changé
        const changedField = steps.flatMap(step => step.fields).find(f => f.name === fieldName);
        if (!changedField) return;
        
        // Mettre à jour les options des champs dépendants
        const updatedOptions = { ...dynamicOptions };
        const updatedFormData = { ...currentFormData };
        
        // Parcourir tous les champs pour trouver ceux qui dépendent du champ modifié
        const cascadePromises = [];
        steps.forEach(step => {
            step.fields.forEach(field => {
                // Gérer les dépendances simples (string)
                if (field.dependsOn === fieldName && field.dynamicTable) {
                    console.log(`🔗 MultiStepForm - Mise à jour des options pour ${field.name} (dépend de ${fieldName})`);
                    
                    // Vider les options du champ dépendant
                    updatedOptions[field.name] = [];
                    
                    // Ne vider la valeur du champ dépendant que si on change activement le champ parent
                    // Lors de l'édition, préserver la valeur existante uniquement au chargement initial
                    if (!isInitialLoad) {
                        updatedFormData[field.name] = '';
                    }
                    
                    // Pour les sous-directions, s'assurer qu'elles sont bien vidées quand on change de direction
                    if (fieldName === 'id_direction' && (field.name === 'id_sous_direction' || field.name === 'sous_direction_id')) {
                        console.log(`🔗 MultiStepForm - Direction changée, vidage et rechargement des sous-directions pour direction ${value}`);
                        updatedOptions[field.name] = [];
                        if (!isInitialLoad) {
                            updatedFormData[field.name] = '';
                        }
                    }
                    
                    // Recharger les options avec le filtre approprié
                    cascadePromises.push(loadCascadeOptions(field, value, updatedOptions, updatedFormData));
                }
                // Gérer les dépendances multiples (array)
                else if (Array.isArray(field.dependsOn) && field.dependsOn.includes(fieldName) && field.dynamicTable) {
                    console.log(`🔗 MultiStepForm - Mise à jour des options pour ${field.name} (dépend de ${field.dependsOn.join(', ')} - champ modifié: ${fieldName})`);
                    
                    // Vider les options du champ dépendant
                    updatedOptions[field.name] = [];
                    
                    // Ne vider la valeur du champ dépendant que si on change activement le champ parent
                    if (!isInitialLoad) {
                        updatedFormData[field.name] = '';
                    }
                    
                    // Pour les champs avec dépendances multiples, déterminer quelle valeur utiliser
                    let parentValue = value;
                    let shouldLoad = true;
                    
                    if (field.name === 'service_id') {
                        // Logique spéciale pour les services : priorité à la sous-direction si elle existe
                        if ((fieldName === 'sous_direction_id' || fieldName === 'id_sous_direction') && value) {
                            // Si on sélectionne une sous-direction, charger ses services
                            parentValue = value;
                            console.log(`🔍 MultiStepForm - Service: Sous-direction sélectionnée (${value}), chargement des services de la sous-direction`);
                        } else if (fieldName === 'id_direction') {
                            // Si on change la direction
                            console.log(`🔍 MultiStepForm - Service: Changement de direction détecté`);
                            console.log(`   - Nouvelle direction: ${value}`);
                            console.log(`   - Sous-direction actuelle: ${updatedFormData.id_sous_direction || updatedFormData.sous_direction_id || 'aucune'}`);
                            
                            if (value && !updatedFormData.id_sous_direction && !updatedFormData.sous_direction_id) {
                                // Pas de sous-direction : charger uniquement les services directs de la direction
                                console.log(`🔍 MultiStepForm - Service: Direction ${value} sélectionnée sans sous-direction, chargement des services directs`);
                                // Vider d'abord les services pour éviter d'afficher les anciens
                                updatedOptions['service_id'] = [];
                                updatedFormData.service_id = ''; // Vider aussi la valeur sélectionnée
                                console.log(`🔍 MultiStepForm - Services vidés avant rechargement pour direction ${value}`);
                                
                                // Charger les services directs de la nouvelle direction
                                const servicesPromise = loadDirectServicesOfDirection(value, updatedOptions).then(() => {
                                    console.log(`✅ MultiStepForm - Services directs chargés pour direction ${value}:`, updatedOptions.service_id?.length || 0, 'services');
                                    if (updatedOptions.service_id && updatedOptions.service_id.length > 0) {
                                        console.log(`   Services disponibles:`, updatedOptions.service_id.map(s => `${s.label} (ID: ${s.id})`));
                                    }
                                }).catch(error => {
                                    console.error(`❌ Erreur lors du chargement des services pour direction ${value}:`, error);
                                });
                                cascadePromises.push(servicesPromise);
                                shouldLoad = false; // Ne pas utiliser loadCascadeOptions, on utilise loadDirectServicesOfDirection
                            } else if (updatedFormData.id_sous_direction || updatedFormData.sous_direction_id) {
                                // On a une sous-direction : ne pas recharger (garder les services de la sous-direction)
                                console.log(`🔍 MultiStepForm - Service: Direction changée mais sous-direction existe, ne pas recharger`);
                                shouldLoad = false;
                            } else {
                                // Direction vidée : vider les services
                                console.log(`🔍 MultiStepForm - Service: Direction vidée, vidage des services`);
                                updatedOptions['service_id'] = [];
                                updatedFormData.service_id = '';
                                shouldLoad = false;
                            }
                        } else {
                            // Ne pas recharger dans les autres cas
                            shouldLoad = false;
                        }
                    }
                    
                    // Recharger les options avec le filtre approprié seulement si nécessaire
                    if (shouldLoad) {
                        cascadePromises.push(loadCascadeOptions(field, parentValue, updatedOptions, updatedFormData));
                    }
                }
            });
        });
        
        // Attendre que toutes les options soient chargées
        await Promise.all(cascadePromises);
        
        // Mettre à jour l'état avec les nouvelles options
        // IMPORTANT: Pour les services, remplacer complètement (pas fusionner) pour éviter les services d'anciennes directions
        console.log(`🔄 MultiStepForm - Mise à jour de l'état avec les nouvelles options:`, updatedOptions);
        setDynamicOptions(prevOptions => {
            const newOptions = { ...prevOptions };
            // Pour les champs qui ont été mis à jour, remplacer complètement (pas fusionner)
            Object.keys(updatedOptions).forEach(key => {
                newOptions[key] = updatedOptions[key];
            });
            // Si on a changé la direction, s'assurer que les services et sous-directions sont bien remplacés
            if (fieldName === 'id_direction') {
                if (updatedOptions.service_id) {
                    console.log(`🔄 MultiStepForm - Remplacement complet des services pour la nouvelle direction`);
                    newOptions.service_id = updatedOptions.service_id;
                }
                if (updatedOptions.id_sous_direction || updatedOptions.sous_direction_id) {
                    console.log(`🔄 MultiStepForm - Remplacement complet des sous-directions pour la nouvelle direction`);
                    newOptions.id_sous_direction = updatedOptions.id_sous_direction || updatedOptions.sous_direction_id || [];
                    newOptions.sous_direction_id = updatedOptions.sous_direction_id || updatedOptions.id_sous_direction || [];
                }
            }
            return newOptions;
        });
        setFormData(updatedFormData);
        
        // La logique de cascade est maintenant gérée dans la boucle principale ci-dessus
    };
    
    // Fonction pour charger les services directs d'une direction (sans sous-direction)
    const loadDirectServicesOfDirection = async (directionId, optionsObj) => {
        // Vider d'abord les services pour éviter d'afficher les anciens services
        optionsObj['service_id'] = [];
        
        if (!directionId) {
            console.log(`⚠️ MultiStepForm - Aucune direction fournie, services vidés`);
            return optionsObj;
        }
        
        try {
            // Obtenir l'ID du ministère
            const userMinistereId = await getUserMinistereId();
            
            // Charger tous les services de la direction avec le filtre par direction
            // IMPORTANT: L'API utilise 'direction_id' et non 'id_direction'
            let apiUrl = `https://tourisme.2ise-groupe.com/api/services?direction_id=${directionId}`;
            
            // Ajouter le filtre par ministère
            if (userMinistereId) {
                apiUrl += `&id_ministere=${userMinistereId}`;
                console.log(`🔍 MultiStepForm - Filtrage par ministère ${userMinistereId} pour les services directs`);
            }
            
            console.log(`🔍 MultiStepForm - Chargement des services de la direction ${directionId}:`, apiUrl);
            
            let response = await fetch(apiUrl, {
                headers: getAuthHeaders()
            });
            
            if (!response.ok) {
                console.error(`❌ Erreur HTTP lors du chargement des services:`, response.status, response.statusText);
                optionsObj['service_id'] = [];
                return optionsObj;
            }
            
            let result = await response.json();
            let allServices = result.data || result;
            
            if (!Array.isArray(allServices)) {
                console.error(`❌ Les services ne sont pas un tableau:`, allServices);
                optionsObj['service_id'] = [];
                return optionsObj;
            }
            
            console.log(`🔍 MultiStepForm - Services récupérés de l'API pour direction ${directionId}:`, allServices.length, 'services');
            
            // Filtrer pour ne garder que les services directs de la direction (pas ceux des sous-directions)
            // Un service est "direct" s'il n'a pas de id_sous_direction ou si id_sous_direction est null/undefined
            let data = allServices.filter(service => {
                const isDirectService = !service.id_sous_direction || 
                                       service.id_sous_direction === null || 
                                       service.id_sous_direction === undefined;
                if (!isDirectService) {
                    console.log(`🔍 Service "${service.libelle}" (ID: ${service.id}) exclu - a une sous-direction: ${service.id_sous_direction}`);
                } else {
                    console.log(`✅ Service "${service.libelle}" (ID: ${service.id}) inclus - service direct`);
                }
                return isDirectService;
            });
            
            console.log(`🔍 MultiStepForm - Services directs filtrés pour direction ${directionId}: ${data.length} sur ${allServices.length}`);
            
            // Mapper les données
            const mappedOptions = data.map(item => ({
                id: item.id,
                label: item.libelle || item.nom
            }));
            
            optionsObj['service_id'] = mappedOptions;
            console.log(`✅ MultiStepForm - Services directs de la direction ${directionId} chargés:`, mappedOptions.length, 'éléments');
            console.log(`✅ MultiStepForm - Services mappés:`, mappedOptions.map(s => `${s.label} (ID: ${s.id})`));
            
        } catch (error) {
            console.error(`❌ Erreur lors du chargement des services pour direction ${directionId}:`, error);
            optionsObj['service_id'] = [];
        }
        
        return optionsObj;
    };

    // Fonction pour charger les options en cascade
    const loadCascadeOptions = async (field, parentValue, optionsObj, currentFormData = {}) => {
        // Exception pour id_direction qui dépend de id_direction_generale:
        // Si aucune direction générale n'est sélectionnée, on charge toutes les directions
        const fetchAllDirections = !parentValue && field.name === 'id_direction' && field.dependsOn === 'id_direction_generale';
        
        if (!parentValue && !fetchAllDirections) {
            optionsObj[field.name] = [];
            return;
        }
        
        try {
            let apiUrl = `https://tourisme.2ise-groupe.com/api/${field.dynamicTable}`;
            let filterParam = '';
            
            // Construire le paramètre de filtre selon le champ parent
            // IMPORTANT: 
            // - Pour les services, l'API utilise 'direction_id' et 'sous_direction_id'
            // - Pour les sous-directions, l'API utilise 'direction_id'
            // - Pour les autres tables, utiliser les noms de champs standards
            if (field.dependsOn === 'id_direction_generale') {
                // Si parentValue est fourni on filtre, sinon on ne filtre pas (charge tout)
                if (parentValue) {
                    apiUrl = `https://tourisme.2ise-groupe.com/api/${field.dynamicTable}/select/all`;
                    filterParam = `?id_direction_generale=${parentValue}`;
                } else {
                    apiUrl = `https://tourisme.2ise-groupe.com/api/${field.dynamicTable}/select/all`;
                    filterParam = ``;
                }
            } else if (field.dependsOn === 'id_direction') {
                // Pour les services et sous-directions, utiliser 'direction_id'
                if (field.dynamicTable === 'services' || field.dynamicTable === 'sous-directions' || field.dynamicTable === 'sous_directions') {
                    filterParam = `?direction_id=${parentValue}`;
                } else {
                    filterParam = `?id_direction=${parentValue}`;
                }
            } else if (field.dependsOn === 'id_sous_direction') {
                // Pour les services, utiliser 'sous_direction_id'
                if (field.dynamicTable === 'services') {
                    filterParam = `?sous_direction_id=${parentValue}`;
                } else {
                    filterParam = `?id_sous_direction=${parentValue}`;
                }
            } else if (field.dependsOn === 'sous_direction_id') {
                // Pour les services, utiliser 'sous_direction_id'
                if (field.dynamicTable === 'services') {
                    filterParam = `?sous_direction_id=${parentValue}`;
                } else {
                    filterParam = `?id_sous_direction=${parentValue}`;
                }
            } else if (Array.isArray(field.dependsOn)) {
                // Pour les dépendances multiples, déterminer le bon filtre
                if (field.name === 'service_id') {
                    // Logique spéciale pour les services : priorité à la sous-direction
                    if ((field.dependsOn.includes('id_sous_direction') || field.dependsOn.includes('sous_direction_id')) && 
                        (currentFormData.id_sous_direction || currentFormData.sous_direction_id)) {
                        // Si on a une sous-direction, charger ses services
                        const sousDirectionId = currentFormData.id_sous_direction || currentFormData.sous_direction_id;
                        filterParam = `?sous_direction_id=${sousDirectionId}`;
                        console.log(`🔍 MultiStepForm - Service dépend de sous-direction: ${sousDirectionId}`);
                    } else if (field.dependsOn.includes('id_direction') && currentFormData.id_direction) {
                        // Si on a seulement une direction (pas de sous-direction), charger les services directs
                        // Note: Cette fonction ne devrait normalement pas être appelée dans ce cas car on utilise loadDirectServicesOfDirection
                        // Mais on garde cette logique comme fallback
                        filterParam = `?direction_id=${currentFormData.id_direction}`;
                        console.log(`🔍 MultiStepForm - Service dépend de direction (fallback): ${currentFormData.id_direction}`);
                    }
                }
            }
            
            // Ajouter le filtre par ministère
            const userMinistereId = await getUserMinistereId();
            if (userMinistereId) {
                filterParam += (filterParam ? '&' : '?') + `id_ministere=${userMinistereId}`;
                console.log(`🔍 MultiStepForm - Filtrage par ministère ${userMinistereId} pour ${field.name}`);
            } else {
                console.warn(`⚠️ MultiStepForm - Aucun ministère trouvé pour l'utilisateur, ${field.name} non filtré par ministère`);
            }
            
            if (filterParam) {
                apiUrl += filterParam;
                console.log(`🔍 MultiStepForm - Chargement des options en cascade pour ${field.name}:`, apiUrl);
                
                const response = await fetch(apiUrl, {
                    headers: getAuthHeaders()
                });
                
                console.log(`📡 MultiStepForm - Réponse pour ${field.name}: ${response.status} ${response.statusText}`);
                
                if (response.ok) {
                    const result = await response.json();
                    console.log(`📊 MultiStepForm - Données reçues pour ${field.name}:`, result);
                    let data = result.data || result;
                    
                    // Filtrer les services pour ne garder que ceux qui correspondent au contexte
                    if (field.name === 'service_id') {
                        // Vérifier si on charge depuis une direction (sans sous-direction)
                        const isFromDirection = field.dependsOn === 'id_direction' || 
                            (Array.isArray(field.dependsOn) && 
                             field.dependsOn.includes('id_direction') && 
                             !currentFormData.id_sous_direction && 
                             !currentFormData.sous_direction_id);
                        
                        if (isFromDirection) {
                            // Quand on charge les services d'une direction (sans sous-direction), ne garder QUE les services directs
                            // Un service est "direct" s'il n'a pas de id_sous_direction ou si id_sous_direction est null
                            const beforeFilter = data.length;
                            data = data.filter(service => {
                                const isDirectService = !service.id_sous_direction || service.id_sous_direction === null || service.id_sous_direction === undefined;
                                if (!isDirectService) {
                                    console.log(`🔍 Service "${service.libelle}" exclu (a une sous-direction: ${service.id_sous_direction})`);
                                }
                                return isDirectService;
                            });
                            console.log(`🔍 MultiStepForm - Services directs de direction filtrés: ${data.length} sur ${beforeFilter} éléments`);
                        } else {
                            // Si on charge depuis une sous-direction, on garde tous les services (pas de filtrage)
                            console.log(`🔍 MultiStepForm - Services chargés depuis sous-direction, pas de filtrage: ${data.length} éléments`);
                        }
                    }
                    
                    // Mapper les données selon le champ dynamique
                    const mappedOptions = data.map(item => ({
                        id: item.id,
                        label: item[field.dynamicField] || item.libelle || item.nom
                    }));
                    
                    optionsObj[field.name] = mappedOptions;
                    console.log(`✅ MultiStepForm - Options en cascade chargées pour ${field.name}:`, mappedOptions.length, 'éléments');
                    console.log(`📋 MultiStepForm - Options détaillées pour ${field.name}:`, mappedOptions);
                } else {
                    console.error(`❌ Erreur lors du chargement des options en cascade pour ${field.name}:`, response.status);
                    optionsObj[field.name] = [];
                }
            }
        } catch (error) {
            console.error(`❌ Erreur lors du chargement des options en cascade pour ${field.name}:`, error);
            optionsObj[field.name] = [];
        }
    };

    // Fonction pour charger les options dynamiques avec cache
    const loadDynamicOptions = async () => {
        console.log('🔄 MultiStepForm - Début du chargement des options dynamiques');
        const options = {};
        
        // Collecter tous les champs dynamiques de toutes les étapes (sauf ceux qui ont des dépendances)
        const dynamicFields = [];
        steps.forEach(step => {
            step.fields.forEach(field => {
                if (field.type === 'select' && field.dynamicTable && !field.dependsOn) {
                    dynamicFields.push(field);
                }
            });
        });
        
        console.log('📋 MultiStepForm - Champs dynamiques trouvés:', dynamicFields.map(f => ({ name: f.name, table: f.dynamicTable })));
        console.log('📋 MultiStepForm - Tous les champs avec dynamicTable:', steps.flatMap(step => step.fields).filter(f => f.dynamicTable).map(f => ({ name: f.name, table: f.dynamicTable, dependsOn: f.dependsOn })));
        
        // Initialiser les options vides pour les champs avec dépendances
        steps.forEach(step => {
            step.fields.forEach(field => {
                if (field.type === 'select' && field.dynamicTable && field.dependsOn) {
                    options[field.name] = [];
                    console.log(`🔗 MultiStepForm - Initialisation des options vides pour ${field.name} (dépend de ${field.dependsOn})`);
                }
            });
        });
        
        // Mettre à jour l'état avec les options vides pour les champs de cascade
        setDynamicOptions(prevOptions => ({
            ...prevOptions,
            ...options
        }));

        // Séparer les champs en deux groupes : avec et sans filtre dynamique
        // Car les champs avec filtre (grade_prefectoral) doivent charger des données différentes
        // des champs sans filtre (id_grade)
        const fieldsByTable = {};
        const fieldsByTableWithFilter = {};
        
        dynamicFields.forEach(field => {
            if (field.dynamicFilter) {
                // Champ avec filtre dynamique - doit être chargé séparément
                const key = `${field.dynamicTable}_${JSON.stringify(field.dynamicFilter)}`;
                if (!fieldsByTableWithFilter[key]) {
                    fieldsByTableWithFilter[key] = {
                        tableName: field.dynamicTable,
                        filter: field.dynamicFilter,
                        fields: []
                    };
                }
                fieldsByTableWithFilter[key].fields.push(field);
            } else {
                // Champ sans filtre - peut être groupé avec d'autres champs de la même table
                if (!fieldsByTable[field.dynamicTable]) {
                    fieldsByTable[field.dynamicTable] = [];
                }
                fieldsByTable[field.dynamicTable].push(field);
            }
        });

        // Charger d'abord les champs SANS filtre dynamique (groupés par table)
        for (const [tableName, fields] of Object.entries(fieldsByTable)) {
            // Ne PAS utiliser le cache pour les services et sous-directions car ils dépendent de la direction
            // Le cache pourrait contenir des données d'une autre direction
            if (tableName === 'services' || tableName === 'sous-directions' || tableName === 'sous_directions') {
                console.log(`🔍 MultiStepForm - ${tableName}: Ignorer le cache, recharger avec le filtre de direction`);
                // Ne pas utiliser le cache, continuer pour recharger
            } else if (optionsCache[tableName]) {
                // Pour les autres tables, utiliser le cache
                fields.forEach(field => {
                    options[field.name] = optionsCache[tableName];
                });
                continue;
            }

            try {
                let apiUrl = `https://tourisme.2ise-groupe.com/api/${tableName}`;
                let filterParams = [];
                
                // Déterminer l'ID du ministère pour le filtrage
                let ministereId = null;
                if (['directions', 'services', 'sous-directions'].includes(tableName)) {
                    // Pour le ministère du tourisme, forcer l'ID 1
                    ministereId = 1;
                    console.log(`🔍 MultiStepForm - Filtrage FORCÉ par ministère ${ministereId} pour ${tableName}`);
                } else if (tableName === 'agents') {
                    // Pour les agents, récupérer le ministère de l'utilisateur
                    const userMinistereId = await getUserMinistereId();
                    if (userMinistereId) {
                        ministereId = userMinistereId;
                        console.log(`🔍 MultiStepForm - Filtrage des agents par ministère ${userMinistereId} - URL: ${apiUrl}`);
                    }
                } else if (['emplois', 'fonctions'].includes(tableName)) {
                    // Emplois et fonctions : filtrer par ministère de l'utilisateur
                    const userMinistereId = await getUserMinistereId();
                    if (userMinistereId) {
                        ministereId = userMinistereId;
                        console.log(`🔍 MultiStepForm - Filtrage des ${tableName} par ministère ${userMinistereId}`);
                    }
                }
                
                // Ajouter les paramètres de filtrage
                if (ministereId) {
                    filterParams.push(`id_ministere=${ministereId}`);
                }
                
                // IMPORTANT: Exclure les grades/échelons préfectoraux pour les champs sans filtre dynamique
                // Car id_grade et id_echelon ne doivent pas afficher les options préfectorales
                if (tableName === 'grades' || tableName === 'echelons') {
                    filterParams.push(`is_prefectoral=false`);
                    console.log(`🔍 MultiStepForm - Filtre is_prefectoral=false appliqué pour ${tableName} (champs sans filtre)`);
                }
                
                console.log(`🔍 MultiStepForm - Chargement des champs SANS filtre dynamique pour ${tableName}`);
                
                // Pour les tables avec endpoint /select/all
                if (['directions', 'services', 'sous-directions', 'services-entites'].includes(tableName)) {
                    apiUrl = `https://tourisme.2ise-groupe.com/api/${tableName}/select/all`;
                }
                // Pour les autres tables avec endpoint /select/all (inclut emplois et fonctions)
                else if (['categories', 'grades', 'echelons', 'civilites', 'nationalites', 'pays', 'situation_matrimonials', 'type_d_agents', 'mode_d_entrees', 'positions', 'niveau_informatiques', 'pathologies', 'handicaps', 'langues', 'niveau_langues', 'logiciels', 'emplois', 'fonctions'].includes(tableName)) {
                    apiUrl = `https://tourisme.2ise-groupe.com/api/${tableName}/select/all`;
                }
                
                // Ajouter les paramètres de filtrage à l'URL finale
                if (filterParams.length > 0) {
                    const separator = apiUrl.includes('?') ? '&' : '?';
                    apiUrl += separator + filterParams.join('&');
                }
                
                console.log(`🌐 MultiStepForm - Requête API pour ${tableName}: ${apiUrl}`);
                console.log(`🌐 MultiStepForm - URL finale avant fetch:`, apiUrl);
                
                const response = await fetch(apiUrl, {
                    headers: getAuthHeaders()
                });
                
                console.log(`📡 MultiStepForm - Réponse pour ${tableName}: ${response.status} ${response.statusText}`);
                
                if (response.status === 429) {
                    console.warn(`Rate limit atteint pour ${tableName}, utilisation du cache ou valeurs par défaut`);
                    fields.forEach(field => {
                        options[field.name] = [];
                    });
                    continue;
                }
                
                const result = await response.json();
                console.log(`📊 MultiStepForm - Données reçues pour ${tableName}:`, result);
                
                console.log(`🔧 MultiStepForm - Vérification condition pour ${tableName}: result.success=${result.success}, result.data=${!!result.data}, result est array=${Array.isArray(result)}`);
                
                if (result.success || result.data || Array.isArray(result)) {
                    const data = result.data || result;
                    console.log(`🔧 MultiStepForm - Données à traiter pour ${tableName}:`, data);
                    console.log(`🔧 MultiStepForm - Champs qui utilisent ${tableName}:`, fields.map(f => f.name));
                    const processedData = data.map(item => {
                        // Fonction pour extraire une chaîne valide d'un champ
                        const extractStringValue = (value) => {
                            if (typeof value === 'string') {
                                return value;
                            }
                            if (typeof value === 'number') {
                                return String(value);
                            }
                            if (typeof value === 'object' && value !== null) {
                                // Si c'est un objet, essayer d'extraire une propriété string
                                if (value.libelle && typeof value.libelle === 'string') {
                                    return value.libelle;
                                }
                                if (value.libele && typeof value.libele === 'string') {
                                    return value.libele;
                                }
                                if (value.nom && typeof value.nom === 'string') {
                                    return value.nom;
                                }
                                if (value.name && typeof value.name === 'string') {
                                    return value.name;
                                }
                                if (value.code && typeof value.code === 'string') {
                                    return value.code;
                                }
                                if (value.label && typeof value.label === 'string') {
                                    return value.label;
                                }
                                // Si aucune propriété string trouvée, utiliser l'ID ou stringifier
                                if (value.id !== undefined) {
                                    return String(value.id);
                                }
                                return JSON.stringify(value);
                            }
                            return String(value);
                        };

                        const labelValue = item.libelle || item.libele || item.code || item.nom || item.name || item.label;
                        
                        const processed = {
                            id: typeof item.id === 'object' ? (item.id.id || item.id.value || JSON.stringify(item.id)) : item.id,
                            label: extractStringValue(labelValue)
                        };
                        return processed;
                    });
                    
                    console.log(`✅ MultiStepForm - Données traitées pour ${tableName}:`, processedData);
                    
                    // Mettre en cache SAUF pour les services et sous-directions (ils dépendent de la direction)
                    // Le cache pourrait causer des problèmes car les données changent selon la direction
                    if (tableName !== 'services' && tableName !== 'sous-directions' && tableName !== 'sous_directions') {
                        setOptionsCache(prev => ({
                            ...prev,
                            [tableName]: processedData
                        }));
                        console.log(`✅ MultiStepForm - Options mises en cache pour ${tableName}`);
                    } else {
                        console.log(`⚠️ MultiStepForm - ${tableName} NON mis en cache (dépendent de la direction)`);
                    }
                    
                    // Assigner aux champs
                    fields.forEach(field => {
                        console.log(`📝 MultiStepForm - Avant assignation - options[${field.name}]:`, options[field.name]);
                        options[field.name] = processedData;
                        console.log(`📝 MultiStepForm - Après assignation - options[${field.name}]:`, options[field.name]);
                    });
                } else {
                    console.log(`❌ MultiStepForm - Condition non remplie pour ${tableName}, données non traitées`);
                    fields.forEach(field => {
                        options[field.name] = [];
                    });
                }
            } catch (err) {
                console.error(`Erreur lors du chargement des options pour ${tableName}:`, err);
                fields.forEach(field => {
                    options[field.name] = [];
                });
            }
        }

        // Charger maintenant les champs AVEC filtre dynamique (séparément pour chaque combinaison table+filtre)
        for (const [filterKey, { tableName, filter, fields }] of Object.entries(fieldsByTableWithFilter)) {
            try {
                let apiUrl = `https://tourisme.2ise-groupe.com/api/${tableName}`;
                let filterParams = [];
                
                // Pour les tables avec endpoint /select/all
                if (['categories', 'grades', 'echelons', 'civilites', 'nationalites', 'pays', 'situation_matrimonials', 'type_d_agents', 'mode_d_entrees', 'positions', 'niveau_informatiques', 'pathologies', 'handicaps', 'langues', 'niveau_langues', 'logiciels'].includes(tableName)) {
                    apiUrl = `https://tourisme.2ise-groupe.com/api/${tableName}/select/all`;
                }
                
                // Appliquer le filtre dynamique spécifique
                Object.keys(filter).forEach(filterKey => {
                    filterParams.push(`${filterKey}=${filter[filterKey]}`);
                });
                console.log(`🔍 MultiStepForm - Chargement des champs AVEC filtre dynamique pour ${tableName}:`, filter);
                
                // Ajouter les paramètres de filtrage à l'URL finale
                if (filterParams.length > 0) {
                    const separator = apiUrl.includes('?') ? '&' : '?';
                    apiUrl += separator + filterParams.join('&');
                }
                
                console.log(`🌐 MultiStepForm - Requête API pour ${tableName} avec filtre: ${apiUrl}`);
                
                const response = await fetch(apiUrl, {
                    headers: getAuthHeaders()
                });
                
                if (response.status === 429) {
                    console.warn(`Rate limit atteint pour ${tableName} (avec filtre), utilisation de valeurs par défaut`);
                    fields.forEach(field => {
                        options[field.name] = [];
                    });
                    continue;
                }
                
                const result = await response.json();
                console.log(`📊 MultiStepForm - Données reçues pour ${tableName} (avec filtre):`, result);
                
                if (result.success || result.data || Array.isArray(result)) {
                    const data = result.data || result;
                    
                    const processedData = data.map(item => {
                        const extractStringValue = (value) => {
                            if (typeof value === 'string') {
                                return value;
                            }
                            if (typeof value === 'number') {
                                return String(value);
                            }
                            if (typeof value === 'object' && value !== null) {
                                if (value.libelle && typeof value.libelle === 'string') {
                                    return value.libelle;
                                }
                                if (value.libele && typeof value.libele === 'string') {
                                    return value.libele;
                                }
                                if (value.nom && typeof value.nom === 'string') {
                                    return value.nom;
                                }
                                if (value.name && typeof value.name === 'string') {
                                    return value.name;
                                }
                                if (value.code && typeof value.code === 'string') {
                                    return value.code;
                                }
                                if (value.label && typeof value.label === 'string') {
                                    return value.label;
                                }
                                if (value.id !== undefined) {
                                    return String(value.id);
                                }
                                return JSON.stringify(value);
                            }
                            return String(value);
                        };

                        const labelValue = item.libelle || item.libele || item.code || item.nom || item.name || item.label;
                        
                        return {
                            id: typeof item.id === 'object' ? (item.id.id || item.id.value || JSON.stringify(item.id)) : item.id,
                            label: extractStringValue(labelValue)
                        };
                    });
                    
                    console.log(`✅ MultiStepForm - Données traitées pour ${tableName} (avec filtre):`, processedData);
                    
                    // NE PAS mettre en cache les options avec filtre car elles sont spécifiques
                    // Assigner aux champs
                    fields.forEach(field => {
                        options[field.name] = processedData;
                        console.log(`✅ MultiStepForm - Options assignées pour ${field.name} (avec filtre):`, processedData.length, 'éléments');
                    });
                } else {
                    fields.forEach(field => {
                        options[field.name] = [];
                    });
                }
            } catch (err) {
                console.error(`Erreur lors du chargement des options pour ${tableName} (avec filtre):`, err);
                fields.forEach(field => {
                    options[field.name] = [];
                });
            }
        }
        
        setDynamicOptions(options);
    };

    // Fonction pour charger les options dynamiques spécifiquement pour l'édition
    const loadDynamicOptionsForEdit = async (editData) => {
        const options = {};
        
        // Collecter tous les champs dynamiques
        const dynamicFields = [];
        steps.forEach(step => {
            step.fields.forEach(field => {
                if (field.type === 'select' && field.dynamicTable) {
                    dynamicFields.push(field);
                }
            });
        });
        
        // Séparer les champs en deux groupes : avec et sans filtre dynamique
        const fieldsByTable = {};
        const fieldsByTableWithFilter = {};
        
        dynamicFields.forEach(field => {
            // Exclure les champs qui dépendent d'autres champs (sous-directions, services)
            // Ils seront chargés via la cascade après le chargement de la direction
            if (field.dependsOn || (Array.isArray(field.dependsOn) && field.dependsOn.length > 0)) {
                // Ne pas les charger ici, ils seront chargés via handleCascadeChange
                return;
            }
            
            if (field.dynamicFilter) {
                // Champ avec filtre dynamique - doit être chargé séparément
                const key = `${field.dynamicTable}_${JSON.stringify(field.dynamicFilter)}`;
                if (!fieldsByTableWithFilter[key]) {
                    fieldsByTableWithFilter[key] = {
                        tableName: field.dynamicTable,
                        filter: field.dynamicFilter,
                        fields: []
                    };
                }
                fieldsByTableWithFilter[key].fields.push(field);
            } else {
                // Champ sans filtre - peut être groupé avec d'autres champs de la même table
                if (!fieldsByTable[field.dynamicTable]) {
                    fieldsByTable[field.dynamicTable] = [];
                }
                fieldsByTable[field.dynamicTable].push(field);
            }
        });
        
        // Charger d'abord les données par table SANS filtre (sous-directions et services exclus)
        for (const [tableName, fields] of Object.entries(fieldsByTable)) {
            // Exclure explicitement les sous-directions et services de cette boucle
            // car ils doivent être chargés uniquement via la cascade selon la direction sélectionnée
            if (tableName === 'sous-directions' || tableName === 'sous_directions' || tableName === 'services') {
                console.log(`⏭️ MultiStepForm - ${tableName} ignoré dans loadDynamicOptionsForEdit, sera chargé via cascade`);
                // Initialiser avec un tableau vide, sera rempli via cascade
                fields.forEach(field => {
                    options[field.name] = [];
                });
                continue;
            }
            
            try {
                let apiUrl = `https://tourisme.2ise-groupe.com/api/${tableName}`;
                let filterParams = [];
                
                // Pour les directions, utiliser l'endpoint /select/all comme en mode création
                if (tableName === 'directions') {
                    apiUrl = `https://tourisme.2ise-groupe.com/api/${tableName}/select/all`;
                    // Ajouter le filtre par ministère pour les directions
                    // Utiliser le ministère de l'utilisateur connecté ou forcer à 1 pour le ministère du tourisme
                    const userMinistereId = await getUserMinistereId();
                    const ministereId = userMinistereId || 1; // Utiliser le ministère de l'utilisateur ou forcer à 1
                    if (ministereId) {
                        filterParams.push(`id_ministere=${ministereId}`);
                        console.log(`🔍 MultiStepForm - Chargement des directions avec endpoint /select/all et filtre par ministère (id_ministere=${ministereId})`);
                    } else {
                        console.log(`🔍 MultiStepForm - Chargement de toutes les directions avec endpoint /select/all (sans filtre ministère)`);
                    }
                }
                // Pour les tables avec endpoint /select/all (inclut emplois et fonctions)
                else if (['categories', 'grades', 'echelons', 'civilites', 'nationalites', 'pays', 'situation_matrimonials', 'type_d_agents', 'mode_d_entrees', 'positions', 'niveau_informatiques', 'pathologies', 'handicaps', 'langues', 'niveau_langues', 'logiciels', 'emplois', 'fonctions'].includes(tableName)) {
                    apiUrl = `https://tourisme.2ise-groupe.com/api/${tableName}/select/all`;
                }
                
                // Emplois et fonctions : filtrer par ministère en mode édition
                if (['emplois', 'fonctions'].includes(tableName)) {
                    const userMinistereId = await getUserMinistereId();
                    if (userMinistereId) {
                        filterParams.push(`id_ministere=${userMinistereId}`);
                        console.log(`🔍 MultiStepForm - Filtrage des ${tableName} par ministère ${userMinistereId} (édition)`);
                    }
                }
                
                // IMPORTANT: Exclure les grades/échelons préfectoraux pour les champs sans filtre dynamique
                // Car id_grade et id_echelon ne doivent pas afficher les options préfectorales
                if (tableName === 'grades' || tableName === 'echelons') {
                    filterParams.push(`is_prefectoral=false`);
                    console.log(`🔍 MultiStepForm - Filtre is_prefectoral=false appliqué pour ${tableName} (édition, champs sans filtre)`);
                }
                
                // Ajouter les paramètres de filtrage à l'URL finale
                if (filterParams.length > 0) {
                    const separator = apiUrl.includes('?') ? '&' : '?';
                    apiUrl += separator + filterParams.join('&');
                }
                
                console.log(`🌐 MultiStepForm - Requête API pour ${tableName}: ${apiUrl}`);
                
                const response = await fetch(apiUrl, {
                    headers: getAuthHeaders()
                });
                
                if (response.ok) {
                    const result = await response.json();
                    // Gérer différentes structures de réponse
                    let data = result.data || result;
                    // Si c'est un objet avec success et data, utiliser data
                    if (result.success && Array.isArray(result.data)) {
                        data = result.data;
                    }
                    // Si c'est un objet avec rows, utiliser rows
                    else if (result.rows && Array.isArray(result.rows)) {
                        data = result.rows;
                    }
                    // Si c'est directement un tableau
                    else if (Array.isArray(result)) {
                        data = result;
                    }
                    
                    if (Array.isArray(data) && data.length > 0) {
                        const processedData = data.map(item => {
                            const firstField = fields[0]; // Prendre le premier field pour accéder à dynamicField
                            const labelValue = item[firstField.dynamicField] || item.libelle || item.nom || item.name || item.id;
                            // Normaliser l'ID pour garantir la correspondance (convertir en nombre si c'est un nombre)
                            let normalizedId = item.id;
                            if (item.id !== null && item.id !== undefined) {
                                // Si c'est une chaîne numérique, convertir en nombre
                                if (typeof item.id === 'string' && !isNaN(item.id) && item.id.trim() !== '') {
                                    normalizedId = Number(item.id);
                                }
                                // Si c'est déjà un nombre, le garder tel quel
                                // Sinon, garder la valeur originale
                            }
                            
                            // Log pour la direction pour déboguer
                            if (tableName === 'directions' && fields.some(f => f.name === 'id_direction')) {
                                console.log(`🔍 MultiStepForm - Normalisation ID direction:`, {
                                    originalId: item.id,
                                    originalIdType: typeof item.id,
                                    normalizedId: normalizedId,
                                    normalizedIdType: typeof normalizedId,
                                    label: labelValue
                                });
                            }
                            
                            return {
                                id: normalizedId,
                                label: typeof labelValue === 'string' ? labelValue : String(labelValue || '')
                            };
                        });
                        
                        // Pour les directions, vérifier si la direction de l'agent est dans les options
                        // Si elle n'y est pas, l'ajouter avec le libellé depuis les données de l'agent
                        if (tableName === 'directions' && fields.some(f => f.name === 'id_direction') && editData.id_direction) {
                            const agentDirectionId = editData.id_direction;
                            const agentDirectionLabel = editData.direction_libelle || editData.direction_libelle || `Direction ${agentDirectionId}`;
                            
                            // Vérifier si la direction de l'agent est déjà dans les options
                            const directionExists = processedData.some(opt => {
                                const optId = typeof opt === 'object' ? opt.id : opt;
                                return String(optId) === String(agentDirectionId) || Number(optId) === Number(agentDirectionId);
                            });
                            
                            if (!directionExists) {
                                console.log(`⚠️ MultiStepForm - La direction ${agentDirectionId} n'est pas dans les options chargées, ajout avec le libellé: ${agentDirectionLabel}`);
                                // Normaliser l'ID de la direction de l'agent
                                const normalizedAgentDirectionId = typeof agentDirectionId === 'string' && !isNaN(agentDirectionId) ? Number(agentDirectionId) : agentDirectionId;
                                // Ajouter la direction de l'agent en premier dans les options
                                processedData.unshift({
                                    id: normalizedAgentDirectionId,
                                    label: agentDirectionLabel
                                });
                                console.log(`✅ MultiStepForm - Direction de l'agent ajoutée aux options:`, {
                                    id: normalizedAgentDirectionId,
                                    label: agentDirectionLabel
                                });
                            }
                        }
                        
                        // Assigner aux champs
                        fields.forEach(field => {
                            options[field.name] = processedData;
                        });
                        
                        console.log(`✅ MultiStepForm - Options chargées pour ${tableName}:`, processedData.length, 'éléments');
                        
                        // Log détaillé pour les directions
                        if (tableName === 'directions' && fields.some(f => f.name === 'id_direction')) {
                            console.log(`🔍 MultiStepForm - IDs des directions chargées:`, processedData.map(opt => ({
                                id: opt.id,
                                idType: typeof opt.id,
                                label: opt.label
                            })));
                        }
                    } else {
                        fields.forEach(field => {
                            options[field.name] = [];
                        });
                    }
                } else {
                    fields.forEach(field => {
                        options[field.name] = [];
                    });
                }
            } catch (err) {
                console.error(`Erreur lors du chargement des options pour ${tableName}:`, err);
                fields.forEach(field => {
                    options[field.name] = [];
                });
            }
        }

        // Charger maintenant les champs AVEC filtre dynamique (séparément pour chaque combinaison table+filtre)
        for (const [filterKey, { tableName, filter, fields }] of Object.entries(fieldsByTableWithFilter)) {
            // Exclure les sous-directions et services qui doivent être chargés via cascade
            if (tableName === 'sous-directions' || tableName === 'sous_directions' || tableName === 'services') {
                console.log(`⏭️ MultiStepForm - ${tableName} (avec filtre) ignoré dans loadDynamicOptionsForEdit, sera chargé via cascade`);
                fields.forEach(field => {
                    options[field.name] = [];
                });
                continue;
            }

            try {
                let apiUrl = `https://tourisme.2ise-groupe.com/api/${tableName}`;
                let filterParams = [];
                
                // Pour les tables avec endpoint /select/all
                if (['categories', 'grades', 'echelons', 'civilites', 'nationalites', 'pays', 'situation_matrimonials', 'type_d_agents', 'mode_d_entrees', 'positions', 'niveau_informatiques', 'pathologies', 'handicaps', 'langues', 'niveau_langues', 'logiciels'].includes(tableName)) {
                    apiUrl = `https://tourisme.2ise-groupe.com/api/${tableName}/select/all`;
                }
                
                // Appliquer le filtre dynamique spécifique
                Object.keys(filter).forEach(filterKey => {
                    filterParams.push(`${filterKey}=${filter[filterKey]}`);
                });
                console.log(`🔍 MultiStepForm - Chargement des champs AVEC filtre dynamique pour ${tableName} (édition):`, filter);
                
                // Ajouter les paramètres de filtrage à l'URL finale
                if (filterParams.length > 0) {
                    const separator = apiUrl.includes('?') ? '&' : '?';
                    apiUrl += separator + filterParams.join('&');
                }
                
                console.log(`🌐 MultiStepForm - Requête API pour ${tableName} avec filtre (édition): ${apiUrl}`);
                
                const response = await fetch(apiUrl, {
                    headers: getAuthHeaders()
                });
                
                if (response.ok) {
                    const result = await response.json();
                    let data = result.data || result;
                    
                    if (result.success && Array.isArray(result.data)) {
                        data = result.data;
                    } else if (result.rows && Array.isArray(result.rows)) {
                        data = result.rows;
                    } else if (Array.isArray(result)) {
                        data = result;
                    }
                    
                    if (Array.isArray(data) && data.length > 0) {
                        const processedData = data.map(item => {
                            const firstField = fields[0];
                            const labelValue = item[firstField.dynamicField] || item.libelle || item.nom || item.name || item.id;
                            
                            let normalizedId = item.id;
                            if (item.id !== null && item.id !== undefined) {
                                if (typeof item.id === 'string' && !isNaN(item.id) && item.id.trim() !== '') {
                                    normalizedId = Number(item.id);
                                }
                            }
                            
                            return {
                                id: normalizedId,
                                label: typeof labelValue === 'string' ? labelValue : String(labelValue || '')
                            };
                        });
                        
                        // Assigner aux champs
                        fields.forEach(field => {
                            options[field.name] = processedData;
                        });
                        
                        console.log(`✅ MultiStepForm - Options chargées pour ${tableName} (avec filtre, édition):`, processedData.length, 'éléments');
                    } else {
                        fields.forEach(field => {
                            options[field.name] = [];
                        });
                    }
                } else {
                    fields.forEach(field => {
                        options[field.name] = [];
                    });
                }
            } catch (err) {
                console.error(`Erreur lors du chargement des options pour ${tableName} (avec filtre, édition):`, err);
                fields.forEach(field => {
                    options[field.name] = [];
                });
            }
        }
        
        // Initialiser les options vides pour les champs dépendants (sous-directions, services)
        // Ils seront remplis via la cascade après le chargement de la direction
        steps.forEach(step => {
            step.fields.forEach(field => {
                if (field.type === 'select' && field.dynamicTable && field.dependsOn) {
                    if (!options[field.name]) {
                        options[field.name] = [];
                        console.log(`🔗 MultiStepForm - Initialisation option vide pour ${field.name} (dépend de ${field.dependsOn})`);
                    }
                }
            });
        });
        
        console.log(`🎯 MultiStepForm - Options chargées pour l'édition:`, options);
        
        // Vérifier spécifiquement que les options de direction sont bien chargées
        if (options.id_direction) {
            console.log(`✅ MultiStepForm - Options de direction chargées:`, {
                count: options.id_direction.length,
                hasValue: !!editData.id_direction,
                value: editData.id_direction,
                valueInOptions: options.id_direction.some(opt => {
                    const optId = typeof opt === 'object' ? opt.id : opt;
                    return String(optId) === String(editData.id_direction) || Number(optId) === Number(editData.id_direction);
                }),
                matchingOption: options.id_direction.find(opt => {
                    const optId = typeof opt === 'object' ? opt.id : opt;
                    return String(optId) === String(editData.id_direction) || Number(optId) === Number(editData.id_direction);
                })
            });
        }
        
        setDynamicOptions(options);
        
        // Déclencher la cascade pour charger les options dépendantes si nécessaire
        // D'abord la direction générale pour charger les directions filtrées
        if (editData.id_direction_generale || editData.id_direction_generale === null || editData.id_direction_generale === '') {
            console.log('🚀 MultiStepForm - Déclenchement de la cascade pour id_direction_generale:', editData.id_direction_generale);
            await handleCascadeChange('id_direction_generale', editData.id_direction_generale || '', editData, true);
        }
        
        if (editData.id_direction) {
            console.log('🚀 MultiStepForm - Déclenchement de la cascade pour id_direction:', editData.id_direction);
            console.log('🔍 MultiStepForm - Données de l\'agent avant cascade:', {
                id_direction: editData.id_direction,
                id_sous_direction: editData.id_sous_direction || editData.sous_direction_id,
                service_id: editData.service_id
            });
            
            // Charger les sous-directions de la direction sélectionnée
            const cascadeOptions = { ...options };
            await handleCascadeChange('id_direction', editData.id_direction, editData, true);
            
            // Après la cascade, si l'agent a une sous-direction, charger les services de cette sous-direction
            if (editData.id_sous_direction || editData.sous_direction_id) {
                const sousDirectionId = editData.id_sous_direction || editData.sous_direction_id;
                console.log('🚀 MultiStepForm - Agent avec sous-direction, chargement des services de la sous-direction:', sousDirectionId);
                
                // Trouver le champ service pour charger les services de la sous-direction
                const serviceField = steps.flatMap(step => step.fields).find(f => 
                    f.name === 'service_id' && 
                    (Array.isArray(f.dependsOn) ? f.dependsOn.includes('id_sous_direction') || f.dependsOn.includes('sous_direction_id') : false)
                );
                
                if (serviceField) {
                    await loadCascadeOptions(serviceField, sousDirectionId, cascadeOptions, editData);
                    setDynamicOptions(prevOptions => ({
                        ...prevOptions,
                        service_id: cascadeOptions.service_id || []
                    }));
                    console.log('✅ MultiStepForm - Services de la sous-direction chargés:', cascadeOptions.service_id?.length || 0, 'éléments');
                }
            }
            // Si l'agent a une direction mais pas de sous-direction, charger les services directs de la direction
            else if (!editData.id_sous_direction && !editData.sous_direction_id) {
                console.log('🚀 MultiStepForm - Agent sans sous-direction, chargement des services directs de la direction');
                const servicesOptions = {};
                await loadDirectServicesOfDirection(editData.id_direction, servicesOptions);
                
                // Mettre à jour l'état avec les nouvelles options
                setDynamicOptions(prevOptions => ({
                    ...prevOptions,
                    service_id: servicesOptions.service_id || []
                }));
                console.log('✅ MultiStepForm - Services directs chargés pour l\'édition:', servicesOptions.service_id?.length || 0, 'éléments');
            }
        } else {
            // Si pas de direction, initialiser les options vides pour sous-directions et services
            console.log('⚠️ MultiStepForm - Aucune direction dans editData, initialisation des options vides pour sous-directions et services');
            setDynamicOptions(prevOptions => ({
                ...prevOptions,
                id_sous_direction: [],
                sous_direction_id: [],
                service_id: []
            }));
        }
    };

    // Charger les options dynamiques quand le modal s'ouvre
    useEffect(() => {
        if (isOpen && steps.length > 0) {
            // Seulement charger les options dynamiques si ce n'est PAS un mode d'édition
            // ou si initialData est vide (nouveau formulaire)
            if (!initialData || Object.keys(initialData).length === 0) {
                loadDynamicOptions();
            }
        } else if (!isOpen && (!initialData || Object.keys(initialData).length === 0)) {
            // Réinitialiser les données du formulaire et les options lorsque le formulaire se ferme
            // UNIQUEMENT si ce n'est pas en mode édition
            setFormData({});
            setCurrentStep(0);
            setDynamicOptions({});
        }
    }, [isOpen, steps, initialData]); // Ajout de initialData aux dépendances

    // Effet pour réinitialiser les enfants quand le nombre d'enfants change
    useEffect(() => {
        const nombreEnfants = Number(formData?.nombre_enfant) || 0;
        if (nombreEnfants === 0) {
            setFormData(prev => ({
                ...prev,
                enfants: []
            }));
        }
    }, [formData?.nombre_enfant]);

    // Fonction stable pour gérer les changements de diplômes
    const handleDiplomesChange = useCallback((diplomes) => {
        setFormData(prev => ({
            ...prev,
            diplomes: diplomes
        }));
    }, []);

    // Fonction pour calculer l'âge de retraite selon le grade
    const calculateRetirementAge = (gradeLabel) => {
        if (!gradeLabel) return 60; // Par défaut 60 ans
        
        const normalized = gradeLabel.toUpperCase().trim();
        // Grades qui partent à 65 ans : A4, A5, A6, A7
        const grades65 = ['A4', 'A5', 'A6', 'A7'];
        return grades65.includes(normalized) ? 65 : 60;
    };

    // Fonction pour calculer la date de retraite
    const calculateRetirementDate = (dateNaissance, gradeLabel) => {
        if (!dateNaissance) return null;
        
        try {
            const birthDate = new Date(dateNaissance);
            if (isNaN(birthDate.getTime())) return null;
            
            const birthYear = birthDate.getFullYear();
            const retirementAge = calculateRetirementAge(gradeLabel);
            const retirementYear = birthYear + retirementAge;
            
            // La date de retraite est toujours le 31 décembre de l'année de retraite
            // Mois 11 = Décembre (0-indexed en JavaScript)
            const retirementDate = new Date(retirementYear, 11, 31);
            
            // Formater au format YYYY-MM-DD pour l'input date
            const year = retirementDate.getFullYear();
            const month = String(retirementDate.getMonth() + 1).padStart(2, '0');
            const day = String(retirementDate.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        } catch (error) {
            console.error('Erreur lors du calcul de la date de retraite:', error);
            return null;
        }
    };

    // Fonction pour valider que le grade correspond à la catégorie
    const validateGradeCategory = async (categorieId, gradeId) => {
        if (!categorieId || !gradeId) return { valid: true, message: null };
        
        try {
            // Récupérer les informations de la catégorie et du grade
            const [categorieRes, gradeRes] = await Promise.all([
                fetch(`https://tourisme.2ise-groupe.com/api/categories/${categorieId}`, {
                    headers: getAuthHeaders()
                }),
                fetch(`https://tourisme.2ise-groupe.com/api/grades/${gradeId}`, {
                    headers: getAuthHeaders()
                })
            ]);
            
            if (!categorieRes.ok || !gradeRes.ok) {
                return { valid: true, message: null }; // En cas d'erreur, ne pas bloquer
            }
            
            const [categorieData, gradeData] = await Promise.all([
                categorieRes.json(),
                gradeRes.json()
            ]);
            
            const categorieLibele = (categorieData.libele || categorieData.data?.libele || '').toUpperCase().trim();
            const gradeLibele = (gradeData.libele || gradeData.data?.libele || '').toUpperCase().trim();
            
            // Les grades préfectoraux (GI, GII, GIII, HG) ne doivent pas être associés aux catégories normales
            const prefectoralGrades = ['GI', 'GII', 'GIII', 'HG', 'GRADE I', 'GRADE II', 'GRADE III', 'HORS GRADE'];
            const isPrefectoralGrade = prefectoralGrades.some(pref => 
                gradeLibele.includes(pref) || gradeLibele === pref
            );
            
            // Si la catégorie commence par 'A' (A, A1, A2, etc.) et le grade est préfectoral, c'est invalide
            if (categorieLibele.startsWith('A') && isPrefectoralGrade) {
                return {
                    valid: false,
                    message: `Le grade "${gradeData.libele || gradeData.data?.libele}" (préfectoral) ne correspond pas à la catégorie "${categorieData.libele || categorieData.data?.libele}". Les grades préfectoraux (GI, GII, GIII, HG) ne peuvent pas être associés aux catégories normales.`
                };
            }
            
            return { valid: true, message: null };
        } catch (error) {
            console.error('Erreur lors de la validation catégorie/grade:', error);
            return { valid: true, message: null }; // En cas d'erreur, ne pas bloquer
        }
    };

    const handleInputChange = async (field, value) => {
        
        // Log spécifique pour id_sous_direction
        if (field === 'id_sous_direction') {
            console.log('🔍 MultiStepForm - handleInputChange pour id_sous_direction:', {
                field,
                value,
                valueType: typeof value,
                currentFormDataValue: formData.id_sous_direction,
                currentFormDataKeys: Object.keys(formData)
            });
        }
        
        // Filtrer les caractères non numériques pour les champs de téléphone
        let processedValue = value;
        const telephoneFields = ['telephone1', 'telephone2', 'telephone3', 'telephone'];
        if (telephoneFields.includes(field) && typeof value === 'string') {
            // Ne garder que les chiffres
            processedValue = value.replace(/\D/g, '');
        }
        // Convertir en majuscules pour les champs textuels, sauf pour certains champs spéciaux
        else {
            const fieldsToPreserveCase = ['email', 'situation_militaire', 'statut_emploi', 'grade_prefectoral', 'corps_prefectoral', 'numero_acte_mariage', 'numero_et_date_acte_mariage', ...telephoneFields];
            // Ne pas convertir en majuscules les champs numériques (IDs)
            const numericFields = ['id_direction', 'id_sous_direction', 'service_id', 'id_service', 
                                   'id_pays', 'id_civilite', 'id_nationalite', 'id_type_d_agent', 
                                   'id_situation_matrimoniale', 'id_ministere', 'id_entite_principale', 
                                   'id_grade', 'id_categorie', 'id_echelon', 'id_position', 'id_handicap', 
                                   'id_mode_entree', 'echelon_prefectoral'];
            if (typeof value === 'string' && !fieldsToPreserveCase.includes(field) && !numericFields.includes(field)) {
                processedValue = value.toUpperCase();
            }
        }
        
        let updatedFormData = {
            ...formData,
            [field]: processedValue
        };
        
        // Cas spécial : Gestion du Corps Préfectoral - Attribution automatique du grade depuis la base de données
        if (field === 'corps_prefectoral') {
            // Trouver le champ corps_prefectoral dans la configuration
            const currentStep = steps.find(step => step.fields.some(f => f.name === 'corps_prefectoral'));
            if (currentStep) {
                const corpsField = currentStep.fields.find(f => f.name === 'corps_prefectoral');
                if (corpsField && corpsField.options && processedValue) {
                    // Comparaison insensible à la casse pour trouver l'option correspondante
                    const selectedOption = corpsField.options.find(opt => 
                        opt.id && processedValue && 
                        opt.id.toLowerCase() === processedValue.toLowerCase()
                    );
                    if (selectedOption) {
                        // Recharger les options des grades et échelons préfectoraux avec le filtre is_prefectoral = true
                        const gradePrefectoralField = currentStep.fields.find(f => f.name === 'grade_prefectoral');
                        const echelonPrefectoralField = currentStep.fields.find(f => f.name === 'echelon_prefectoral');
                        
                        // Charger les grades préfectoraux
                        if (gradePrefectoralField && gradePrefectoralField.dynamicTable) {
                            try {
                                const gradesUrl = `https://tourisme.2ise-groupe.com/api/${gradePrefectoralField.dynamicTable}/select/all?is_prefectoral=true`;
                                console.log('🔄 Chargement des grades préfectoraux:', gradesUrl);
                                const gradesResponse = await fetch(gradesUrl, { headers: getAuthHeaders() });
                                if (gradesResponse.ok) {
                                    const gradesResult = await gradesResponse.json();
                                    const gradesData = gradesResult.data || gradesResult || [];
                                    const mappedGrades = gradesData.map(item => ({
                                        id: item.id,
                                        label: item.libele || item.label || item.nom
                                    }));
                                    setDynamicOptions(prev => ({ ...prev, grade_prefectoral: mappedGrades }));
                                    console.log('✅ Grades préfectoraux chargés:', mappedGrades.length);
                                }
                            } catch (error) {
                                console.error('❌ Erreur lors du chargement des grades préfectoraux:', error);
                            }
                        }
                        
                        // Charger les échelons préfectoraux
                        if (echelonPrefectoralField && echelonPrefectoralField.dynamicTable) {
                            try {
                                const echelonsUrl = `https://tourisme.2ise-groupe.com/api/${echelonPrefectoralField.dynamicTable}/select/all?is_prefectoral=true`;
                                console.log('🔄 Chargement des échelons préfectoraux:', echelonsUrl);
                                const echelonsResponse = await fetch(echelonsUrl, { headers: getAuthHeaders() });
                                if (echelonsResponse.ok) {
                                    const echelonsResult = await echelonsResponse.json();
                                    const echelonsData = echelonsResult.data || echelonsResult || [];
                                    const mappedEchelons = echelonsData.map(item => ({
                                        id: item.id,
                                        label: item.libele || item.label || item.nom
                                    }));
                                    setDynamicOptions(prev => ({ ...prev, echelon_prefectoral: mappedEchelons }));
                                    console.log('✅ Échelons préfectoraux chargés:', mappedEchelons.length);
                                }
                            } catch (error) {
                                console.error('❌ Erreur lors du chargement des échelons préfectoraux:', error);
                            }
                        }
                        
                        // Trouver le grade préfectoral correspondant dans les options chargées depuis la base de données
                        if (gradePrefectoralField && dynamicOptions.grade_prefectoral) {
                            // Mapper le corps préfectoral vers le grade correspondant
                            // Les grades préfectoraux dans la base de données doivent avoir un libellé qui correspond
                            const gradeMapping = {
                                'prefet_hors_grade': ['HG', 'Hors grade', 'Hors grade (HG)'],
                                'prefet': ['GI', 'Grade I', 'Grade I (GI)'],
                                'secretaire_general': ['GII', 'Grade II', 'Grade II (GII)'],
                                'sous_prefet': ['GIII', 'Grade III', 'Grade III (GIII)']
                            };
                            
                            const searchTerms = gradeMapping[selectedOption.id] || [];
                            const matchingGrade = dynamicOptions.grade_prefectoral.find(grade => {
                                const gradeLabel = grade.label || grade.libele || '';
                                return searchTerms.some(term => 
                                    gradeLabel.toLowerCase().includes(term.toLowerCase()) ||
                                    gradeLabel === term
                                );
                            });
                            
                            if (matchingGrade) {
                                updatedFormData = {
                                    ...updatedFormData,
                                    grade_prefectoral: matchingGrade.id,
                                    // Vider les anciens champs de catégorie, grade et échelon
                                    id_categorie: null,
                                    id_grade: null,
                                    id_echelon: null
                                };
                                console.log('✅ Grade préfectoral attribué automatiquement depuis la base de données:', matchingGrade.id, matchingGrade.label);
                            } else {
                                // Fallback : utiliser l'abréviation si le grade n'est pas trouvé
                                updatedFormData = {
                                    ...updatedFormData,
                                    grade_prefectoral: selectedOption.grade,
                                    id_categorie: null,
                                    id_grade: null,
                                    id_echelon: null
                                };
                                console.log('⚠️ Grade préfectoral non trouvé dans la base, utilisation de l\'abréviation:', selectedOption.grade);
                            }
                        } else {
                            // Fallback : utiliser l'abréviation si les options ne sont pas encore chargées
                            updatedFormData = {
                                ...updatedFormData,
                                grade_prefectoral: selectedOption.grade,
                                id_categorie: null,
                                id_grade: null,
                                id_echelon: null
                            };
                            console.log('⚠️ Options de grades préfectoraux non encore chargées, utilisation de l\'abréviation:', selectedOption.grade);
                        }
                        console.log('✅ Corps préfectoral sélectionné:', processedValue);
                        console.log('✅ Anciens champs (catégorie, grade, échelon) vidés');
                    } else {
                        console.warn('⚠️ Aucune option trouvée pour corps_prefectoral:', processedValue);
                        console.log('   Options disponibles:', corpsField.options.map(o => o.id));
                    }
                } else if (!processedValue || processedValue === '') {
                    // Si on désélectionne le corps préfectoral, vider les champs préfectoraux
                    updatedFormData = {
                        ...updatedFormData,
                        grade_prefectoral: null,
                        echelon_prefectoral: null
                    };
                    console.log('✅ Champs préfectoraux vidés (corps préfectoral désélectionné)');
                }
            }
        }
        
        // Cas spécial : Si on sélectionne une catégorie/grade classique, vider les champs préfectoraux
        if ((field === 'id_categorie' || field === 'id_grade') && processedValue) {
            updatedFormData = {
                ...updatedFormData,
                corps_prefectoral: null,
                grade_prefectoral: null,
                echelon_prefectoral: null
            };
            console.log('✅ Champs préfectoraux vidés (sélection catégorie/grade classique)');
        }

        // Validation catégorie/grade : vérifier que le grade correspond à la catégorie
        // Quand le grade change
        if (field === 'id_grade' && processedValue && updatedFormData.id_categorie) {
            const validation = await validateGradeCategory(updatedFormData.id_categorie, processedValue);
            if (!validation.valid) {
                setErrors(prev => ({
                    ...prev,
                    id_grade: validation.message
                }));
                console.warn('⚠️ Validation catégorie/grade échouée:', validation.message);
            } else {
                // Si la validation réussit, effacer l'erreur
                setErrors(prev => ({
                    ...prev,
                    id_grade: null
                }));
            }
        }
        // Quand la catégorie change et qu'un grade est déjà sélectionné
        else if (field === 'id_categorie' && processedValue && updatedFormData.id_grade) {
            const validation = await validateGradeCategory(processedValue, updatedFormData.id_grade);
            if (!validation.valid) {
                setErrors(prev => ({
                    ...prev,
                    id_grade: validation.message
                }));
                console.warn('⚠️ Validation catégorie/grade échouée (catégorie changée):', validation.message);
                // Vider le grade car il ne correspond pas à la nouvelle catégorie
                updatedFormData.id_grade = null;
            } else {
                // Si la validation réussit, effacer l'erreur
                setErrors(prev => ({
                    ...prev,
                    id_grade: null
                }));
            }
        }

        // Calcul automatique de la date de retraite
        // Déclencher le calcul quand la date de naissance ou le grade change
        // NOTE: Le calcul sera aussi fait dans le useEffect qui se déclenchera après
        // que les options de grade soient chargées, mais on essaie aussi ici pour un retour immédiat
        if ((field === 'date_de_naissance' || field === 'id_grade') && updatedFormData.date_de_naissance && updatedFormData.id_grade) {
            let gradeLabel = '';
            if (field === 'id_grade' && processedValue) {
                // Récupérer le libellé du grade sélectionné depuis les options
                const gradeOptions = dynamicOptions.id_grade || [];
                const selectedGrade = gradeOptions.find(opt => {
                    // Comparer en normalisant les types (peut être string ou number)
                    const optId = typeof opt === 'object' ? opt.id : opt;
                    const procValue = typeof processedValue === 'string' && !isNaN(processedValue) ? Number(processedValue) : processedValue;
                    return optId === procValue || Number(optId) === Number(procValue);
                });
                if (selectedGrade && selectedGrade.label) {
                    gradeLabel = selectedGrade.label;
                }
            } else if (updatedFormData.id_grade) {
                // Si c'est la date de naissance qui change, utiliser le grade existant
                const gradeOptions = dynamicOptions.id_grade || [];
                const gradeId = typeof updatedFormData.id_grade === 'string' && !isNaN(updatedFormData.id_grade) 
                    ? Number(updatedFormData.id_grade) 
                    : updatedFormData.id_grade;
                const selectedGrade = gradeOptions.find(opt => {
                    const optId = typeof opt === 'object' ? opt.id : opt;
                    return optId === gradeId || Number(optId) === Number(gradeId);
                });
                if (selectedGrade && selectedGrade.label) {
                    gradeLabel = selectedGrade.label;
                }
            }
            
            // Calculer la date de retraite seulement si on a un grade valide
            // Si gradeLabel est vide, le useEffect prendra le relais une fois les options chargées
            if (gradeLabel) {
                const calculatedRetirementDate = calculateRetirementDate(updatedFormData.date_de_naissance, gradeLabel);
                if (calculatedRetirementDate) {
                    updatedFormData.date_retraite = calculatedRetirementDate;
                    console.log('✅ Date de retraite calculée automatiquement dans handleInputChange:', calculatedRetirementDate, '(Grade:', gradeLabel, ')');
                    console.log('🔍 updatedFormData.date_retraite après calcul:', updatedFormData.date_retraite);
                }
            } else {
                console.log('⏳ Date de retraite non calculée dans handleInputChange (options de grade pas encore chargées), le useEffect s\'en chargera', {
                    hasGradeId: !!processedValue,
                    hasDateDeNaissance: !!updatedFormData.date_de_naissance,
                    gradeOptionsLength: dynamicOptions.id_grade?.length || 0
                });
            }
        }
        
        // Log spécifique pour id_sous_direction après traitement
        if (field === 'id_sous_direction') {
            console.log('🔍 MultiStepForm - handleInputChange pour id_sous_direction APRÈS traitement:', {
                processedValue,
                processedValueType: typeof processedValue,
                updatedFormDataValue: updatedFormData.id_sous_direction,
                updatedFormDataKeys: Object.keys(updatedFormData)
            });
        }
        
        // Log avant la mise à jour de formData pour vérifier que date_retraite est bien présente
        if (field === 'id_grade' || field === 'date_de_naissance') {
            console.log('🔍 handleInputChange - Avant setFormData:', {
                field: field,
                updatedFormDataDateRetraite: updatedFormData.date_retraite,
                updatedFormDataDateDeNaissance: updatedFormData.date_de_naissance,
                updatedFormDataIdGrade: updatedFormData.id_grade,
                hasDateRetraite: 'date_retraite' in updatedFormData
            });
        }
        
        setFormData(updatedFormData);
        
        // Effacer l'erreur pour ce champ
        if (errors[field]) {
            setErrors(prev => ({
                ...prev,
                [field]: null
            }));
        }
        
        // Cas spécial : Si on change la direction, vider le service et la sous-direction
        if (field === 'id_direction') {
            console.log(`🔗 MultiStepForm - Direction changée vers ${processedValue}, vidage de la sous-direction et du service`);
            // Vider la sous-direction et le service quand on change de direction
            updatedFormData.id_sous_direction = '';
            updatedFormData.sous_direction_id = '';
            updatedFormData.service_id = '';
            // Vider aussi les options de sous-direction et service IMMÉDIATEMENT
            setDynamicOptions(prevOptions => {
                const newOptions = { ...prevOptions };
                // Vider complètement les options de sous-direction et service
                newOptions.id_sous_direction = [];
                newOptions.sous_direction_id = [];
                newOptions.service_id = []; // CRITIQUE: Vider les services pour éviter d'afficher les anciens
                console.log(`🔗 MultiStepForm - Options vidées pour sous-direction et service`);
                return newOptions;
            });
            // Recharger les sous-directions de la nouvelle direction
            if (processedValue) {
                console.log(`🔗 MultiStepForm - Rechargement des sous-directions pour la direction ${processedValue}`);
                // Le rechargement sera géré par handleCascadeChange qui sera appelé ensuite
            }
        }
        
        // Vérifier si ce champ déclenche un changement en cascade
        const fieldConfig = steps.flatMap(step => step.fields).find(f => f.name === field);
        if (fieldConfig && fieldConfig.cascadeTrigger) {
            handleCascadeChange(field, processedValue, updatedFormData);
        }
        
        // Cas spécial : Si on vide le champ id_sous_direction, recharger les services directs de la direction
        if ((field === 'id_sous_direction' || field === 'sous_direction_id') && !processedValue && updatedFormData.id_direction) {
            console.log(`🔗 MultiStepForm - Sous-direction vidée, rechargement des services directs de la direction ${updatedFormData.id_direction}`);
            // Recharger les services directs de la direction de manière asynchrone
            const servicesOptions = {};
            loadDirectServicesOfDirection(updatedFormData.id_direction, servicesOptions).then(() => {
                setDynamicOptions(prevOptions => ({
                    ...prevOptions,
                    service_id: servicesOptions.service_id || []
                }));
                console.log(`✅ MultiStepForm - Services directs rechargés après vidage de sous-direction:`, servicesOptions.service_id?.length || 0, 'éléments');
            }).catch(error => {
                console.error('❌ Erreur lors du rechargement des services directs:', error);
            });
            // Vider aussi la valeur du service pour forcer une nouvelle sélection
            updatedFormData.service_id = '';
        }
    };

    // Fonction pour formater les dates pour les champs HTML type="date" (éviter les décalages de fuseau horaire)
    const formatDateForInput = (dateValue) => {
        if (!dateValue) return '';
        // Si c'est déjà au format YYYY-MM-DD, on le retourne tel quel
        if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
            return dateValue;
        }
        // Si c'est une date avec timestamp, on extrait juste la partie date
        if (typeof dateValue === 'string' && dateValue.includes('T')) {
            return dateValue.split('T')[0];
        }
        // Sinon, on parse la date en utilisant UTC pour éviter les décalages de fuseau horaire
        const date = new Date(dateValue);
        // Vérifier si la date est valide
        if (isNaN(date.getTime())) {
            return '';
        }
        // Utiliser les méthodes UTC pour éviter le décalage d'un jour
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const validateCurrentStep = () => {
        const currentStepFields = steps[currentStep]?.fields || [];
        const stepErrors = {};

        currentStepFields.forEach(field => {
            // Vérifier d'abord si le champ doit être affiché
            if (!shouldShowField(field)) {
                // Si le champ n'est pas affiché, ne pas le valider
                return;
            }
            
            // Vérifier si le champ est requis (soit required: true, soit conditionalRequired)
            let isRequired = field.required;
            
            // Vérifier la condition pour conditionalRequired (comparaison souple 1 == "1")
            if (field.conditionalRequired) {
                const { field: conditionalField, value, values, notValue, notValues, isEmpty } = field.conditionalRequired;
                const conditionalValue = formData[conditionalField];
                
                if (isEmpty) {
                    // Champ requis lorsque le champ conditionnel est vide (pas de direction générale choisie)
                    isRequired = (conditionalValue == null || conditionalValue === '');
                } else if (value !== undefined) {
                    isRequired = valuesEqual(conditionalValue, value);
                } else if (values !== undefined) {
                    isRequired = Array.isArray(values) && values.some(v => valuesEqual(conditionalValue, v));
                } else if (notValue !== undefined) {
                    isRequired = !valuesEqual(conditionalValue, notValue);
                } else if (notValues !== undefined) {
                    isRequired = !Array.isArray(notValues) || !notValues.some(v => valuesEqual(conditionalValue, v));
                }
            }
            
            // Validation spéciale pour le champ composite acte_mariage_composite
            if (field.type === 'acte_mariage_composite' && isRequired) {
                const acteValue = formData[field.name] || {};
                if (!acteValue.numero || acteValue.numero === '' || !acteValue.date || acteValue.date === '') {
                    stepErrors[field.name] = `${field.label} est requis (numéro et date)`;
                }
            } 
            // Validation normale pour les autres champs
            else if (isRequired && (!formData[field.name] || formData[field.name] === '')) {
                stepErrors[field.name] = `${field.label} est requis`;
            }
        });

        // Validation spéciale pour les champs enfants DÉSACTIVÉE - Les champs enfants ne sont plus obligatoires
        const currentStepTitle = steps[currentStep]?.title || '';
        // if (currentStepTitle.includes('Familiales') || currentStepTitle.includes('Familiale')) {
        //     const nombreEnfants = Number(formData?.nombre_enfant) || 0;
        //     if (nombreEnfants >= 1 && formData?.enfants) {
        //         formData.enfants.forEach((enfant, index) => {
        //             if (index < nombreEnfants) {
        //                 // Validation des champs obligatoires pour chaque enfant
        //                 const requiredChildFields = ['nom', 'prenom', 'sexe', 'date_naissance', 'scolarise'];
        //                 
        //                 requiredChildFields.forEach(childField => {
        //                     if (!enfant[childField] || enfant[childField] === '') {
        //                         const fieldLabels = {
        //                             'nom': 'Nom',
        //                             'prenom': 'Prénoms', 
        //                             'sexe': 'Sexe',
        //                             'date_naissance': 'Date de naissance',
        //                             'scolarise': 'Scolarisé'
        //                         };
        //                         stepErrors[`enfant_${index}_${childField}`] = `${fieldLabels[childField]} de l'enfant ${index + 1} est requis`;
        //                     }
        //                 });
        //             }
        //         });
        //     }
        // }

        // Validation spéciale pour la correspondance catégorie/grade
        if (currentStepTitle.includes('Carrière') || currentStepTitle.includes('Grade')) {
            if (formData.id_categorie && formData.id_grade) {
                // Validation synchrone basée sur les noms (validation asynchrone déjà faite dans handleInputChange)
                // Ici on vérifie juste que l'erreur n'existe pas déjà
                if (errors.id_grade && errors.id_grade.includes('ne correspond pas')) {
                    // L'erreur existe déjà, ne pas l'ajouter à nouveau
                }
            }
        }

        // Validation spéciale pour les diplômes (uniquement à l'étape des documents)
        if (currentStepTitle.includes('Documents') || currentStepTitle.includes('Photos')) {
            const nombreDiplomes = Number(formData?.nombre_diplomes) || 0;
            const diplomeFields = [
                { key: 'diplome', label: 'Nom du diplôme' },
                { key: 'date_diplome', label: 'Date d\'obtention' },
                { key: 'ecole', label: 'École/Université' },
                { key: 'ville', label: 'Ville' },
                { key: 'pays', label: 'Pays' }
            ];
            
            if (nombreDiplomes < 1) {
                stepErrors['nombre_diplomes'] = 'Au moins un diplôme est obligatoire';
            } else {
                const diplomesList = formData?.diplomes || [];
                for (let i = 0; i < nombreDiplomes; i++) {
                    const diplome = diplomesList[i] || {};
                    diplomeFields.forEach(({ key, label }) => {
                        const value = diplome[key];
                        if (!value || (typeof value === 'string' && value.trim() === '')) {
                            stepErrors[`diplome_${i}_${key}`] = `${label} du diplôme ${i + 1} est requis`;
                        }
                    });
                }
            }
        }

        setErrors(stepErrors);
        return Object.keys(stepErrors).length === 0;
    };

    const handleNext = () => {
        if (validateCurrentStep()) {
            setCurrentStep(prev => prev + 1);
        }
    };

    const handlePrevious = () => {
        setCurrentStep(prev => prev - 1);
    };

    const handleSubmit = async () => {
        if (validateCurrentStep()) {
            // Log du formData avant soumission pour déboguer
            console.log('🔍 MultiStepForm - handleSubmit - formData avant soumission:', {
                id_sous_direction: formData.id_sous_direction,
                id_sous_direction_type: typeof formData.id_sous_direction,
                id_direction: formData.id_direction,
                service_id: formData.service_id,
                allKeys: Object.keys(formData),
                formDataComplete: formData
            });
            
            // S'assurer que id_sous_direction est toujours présent dans formData
            // même s'il est null ou vide, pour permettre sa mise à jour dans la base de données
            const formDataToSubmit = { ...formData };
            if (!('id_sous_direction' in formDataToSubmit)) {
                formDataToSubmit.id_sous_direction = null;
                console.log('⚠️ MultiStepForm - id_sous_direction manquant dans formData, initialisé à null');
            }
            
            console.log('🔍 MultiStepForm - handleSubmit - formDataToSubmit final:', {
                id_sous_direction: formDataToSubmit.id_sous_direction,
                id_sous_direction_type: typeof formDataToSubmit.id_sous_direction,
                id_direction: formDataToSubmit.id_direction,
                service_id: formDataToSubmit.service_id,
                allKeys: Object.keys(formDataToSubmit),
                hasIdSousDirection: 'id_sous_direction' in formDataToSubmit,
                formDataToSubmitComplete: formDataToSubmit
            });
            
            // Log juste avant l'appel à onSubmit pour voir exactement ce qui est passé
            console.log('🚀 MultiStepForm - Appel à onSubmit avec formDataToSubmit:', {
                id_sous_direction: formDataToSubmit.id_sous_direction,
                id_sous_direction_type: typeof formDataToSubmit.id_sous_direction,
                id_sous_direction_value: formDataToSubmit.id_sous_direction
            });

            try {
                const result = await onSubmit(formDataToSubmit);

                if (result && result.success === false) {
                    const message = result.message || result.error || "Une erreur est survenue lors de l'enregistrement.";
                    console.warn('⚠️ MultiStepForm - Erreur de soumission retournée par onSubmit:', result);
                    setSubmitError(message);
                    return;
                }

                setSubmitError(null);
                setCurrentStep(0);
                setFormData({});
                setErrors({});
                setDynamicOptions({});
            } catch (error) {
                console.error('❌ MultiStepForm - Erreur lors de la soumission du formulaire:', error);

                let message = "Une erreur est survenue lors de l'enregistrement de l'agent.";
                if (error && typeof error === 'object') {
                    if (error.message) {
                        message = error.message;
                    }
                    if (error.response && typeof error.response === 'object') {
                        const data = error.response.data || error.response;
                        if (data && (data.error || data.message)) {
                            message = data.error || data.message;
                        }
                    }
                }

                setSubmitError(message);
            }
        }
    };

    const handleClose = () => {
        setCurrentStep(0);
        setFormData({});
        setErrors({});
        setDynamicOptions({});
        setSubmitError(null);
        toggle();
    };

    const renderField = (field) => {
        // Utiliser defaultValue si défini et que la valeur n'est pas encore définie
        let value = formData[field.name];
        if ((value === undefined || value === null || value === '') && field.defaultValue !== undefined) {
            value = field.defaultValue;
        } else if (value === undefined || value === null) {
            value = '';
        }
        
        // Pour les champs select avec des IDs numériques, normaliser la valeur pour la correspondance
        // Convertir en nombre si c'est une chaîne numérique valide
        if (field.type === 'select' && field.dynamicTable && value !== '' && value !== null && value !== undefined) {
            if (typeof value === 'string' && !isNaN(value) && value.trim() !== '') {
                const numValue = Number(value);
                if (!isNaN(numValue)) {
                    value = numValue;
                }
            } else if (value === '') {
                // Si c'est une chaîne vide pour un champ numérique, convertir en null
                value = null;
            }
        }
        
        const hasError = errors[field.name];

        switch (field.type) {
            case 'select':
                // Préparer les options pour SearchableSelect
                let selectOptions = [];
                
                // Options statiques
                if (field.options) {
                    selectOptions = field.options.map(option => {
                        // Si l'option est déjà un objet avec id et label
                        if (typeof option === 'object' && option.id !== undefined && option.label !== undefined) {
                            return {
                                id: option.id,
                                label: option.label
                            };
                        }
                        // Si l'option est une string simple
                        return {
                            id: option,
                            label: option
                        };
                    });
                }
                
                // Options dynamiques
                console.log(`🔍 MultiStepForm - Vérification options dynamiques pour ${field.name}:`, dynamicOptions[field.name]);
                if (dynamicOptions[field.name]) {
                    const dynamicOpts = dynamicOptions[field.name].map(option => {
                        if (typeof option === 'object' && option.id && option.label && typeof option.label === 'string') {
                            return option;
                        }
                        return {
                            id: option,
                            label: String(option)
                        };
                    });
                    console.log(`🔄 MultiStepForm - Options dynamiques mappées pour ${field.name}:`, dynamicOpts);
                    selectOptions = [...selectOptions, ...dynamicOpts];
                }
                
                // Debug spécial pour les champs de cascade et la direction
                if (field.name === 'id_sous_direction' || field.name === 'sous_direction_id' || field.name === 'service_id' || field.name === 'id_direction') {
                    const valueInOptions = selectOptions.some(opt => {
                        const optId = typeof opt === 'object' ? opt.id : opt;
                        return String(optId) === String(value) || Number(optId) === Number(value);
                    });
                    
                    const matchingOption = selectOptions.find(opt => {
                        const optId = typeof opt === 'object' ? opt.id : opt;
                        return String(optId) === String(value) || Number(optId) === Number(value);
                    });
                    
                    console.log(`🔍 MultiStepForm - Debug pour ${field.name}:`, {
                        value: value,
                        valueType: typeof value,
                        formDataValue: formData[field.name],
                        hasDynamicOptions: !!dynamicOptions[field.name],
                        optionsArray: Array.isArray(dynamicOptions[field.name]),
                        optionsLength: dynamicOptions[field.name]?.length || 0,
                        selectOptionsLength: selectOptions.length,
                        optionsIds: dynamicOptions[field.name]?.map(opt => ({ id: opt.id, idType: typeof opt.id, label: opt.label })) || [],
                        selectOptionsIds: selectOptions.map(opt => ({ id: typeof opt === 'object' ? opt.id : opt, idType: typeof (typeof opt === 'object' ? opt.id : opt), label: typeof opt === 'object' ? opt.label : opt })) || [],
                        dependsOn: field.dependsOn,
                        parentValue: field.dependsOn ? formData[field.dependsOn] : null,
                        valueInOptions: valueInOptions,
                        matchingOption: matchingOption
                    });
                    
                    if (!valueInOptions && value && selectOptions.length > 0) {
                        console.warn(`⚠️ MultiStepForm - La valeur ${value} (type: ${typeof value}) n'a pas été trouvée dans les options pour ${field.name}`);
                        console.warn(`⚠️ IDs disponibles:`, selectOptions.map(opt => {
                            const optId = typeof opt === 'object' ? opt.id : opt;
                            return `${optId} (${typeof optId})`;
                        }));
                    }
                }
                
                // Si pas encore chargé, afficher un message
                if (field.dynamicTable && (!dynamicOptions[field.name] || !Array.isArray(dynamicOptions[field.name]))) {
                    console.log(`⏳ MultiStepForm - Options non chargées pour ${field.name}, affichage du message de chargement`);
                    selectOptions = [{ id: 'loading', label: 'Chargement...' }];
                } else if (field.dynamicTable && Array.isArray(dynamicOptions[field.name]) && dynamicOptions[field.name].length === 0) {
                    // Si les options sont chargées mais vides, ne pas afficher de message
                    console.log(`📭 MultiStepForm - Options vides pour ${field.name}, pas de message`);
                    selectOptions = [];
                }
                // Option "Aucune" pour Direction Générale, Direction, Sous-direction (permettre de ne choisir aucun)
                if (['id_direction_generale', 'id_direction', 'id_sous_direction'].includes(field.name) && Array.isArray(selectOptions) && selectOptions[0]?.id !== 'loading') {
                    const hasEmpty = selectOptions.some(o => o.id === '' || o.id === null || o.id === undefined);
                    if (!hasEmpty) {
                        selectOptions = [{ id: '', label: 'Aucune' }, ...selectOptions];
                    }
                }
                
                console.log(`🎯 MultiStepForm - Options finales pour ${field.name}:`, selectOptions);
                
                // Log spécial pour la direction
                if (field.name === 'id_direction') {
                    console.log(`🎯 MultiStepForm - Rendu SearchableSelect pour ${field.name}:`, {
                        value: value,
                        valueType: typeof value,
                        selectOptionsCount: selectOptions.length,
                        hasMatchingOption: selectOptions.some(opt => {
                            const optId = typeof opt === 'object' ? opt.id : opt;
                            return String(optId) === String(value) || Number(optId) === Number(value);
                        }),
                        firstFewOptions: selectOptions.slice(0, 3)
                    });
                }
                
                // Déterminer si le champ est désactivé
                const isSelectDisabled = field.disabled || field.readOnly || (field.dynamicTable && (!dynamicOptions[field.name] || (Array.isArray(dynamicOptions[field.name]) && dynamicOptions[field.name].length === 0 && !field.dependsOn)));
                
                return (
                    <div>
                        <SearchableSelect
                            id={field.name}
                            value={value}
                            onChange={(selectedValue) => handleInputChange(field.name, selectedValue)}
                            options={selectOptions}
                            placeholder={field.placeholder || `Rechercher et sélectionner ${field.label.toLowerCase()}`}
                            invalid={hasError}
                            disabled={isSelectDisabled}
                            style={isSelectDisabled ? {
                                backgroundColor: '#f8f9fa',
                                color: '#6c757d',
                                cursor: 'not-allowed',
                                opacity: 0.6
                            } : {}}
                        />
                        
                        {/* Champ pour handicap personnalisé */}
                        {field.name === 'id_handicap' && (value === '14' || value === 14) && (
                            <Input
                                type="text"
                                placeholder="Saisir votre handicap"
                                value={formData.handicap_personnalise || ''}
                                onChange={(e) => handleInputChange('handicap_personnalise', e.target.value)}
                                className="mt-2"
                                style={{ textTransform: 'uppercase' }}
                            />
                        )}
                    </div>
                );

            case 'textarea':
                return (
                    <Input
                        type="textarea"
                        id={field.name}
                        value={value}
                        onChange={(e) => handleInputChange(field.name, e.target.value)}
                        placeholder={field.placeholder || `Saisir ${field.label.toLowerCase()}`}
                        invalid={hasError}
                        rows={3}
                        style={{ textTransform: 'uppercase' }}
                    />
                );

            case 'date':
                const isDateDisabled = field.disabled || shouldDisableField(field) || (!initialData || Object.keys(initialData).length === 0) && field.disabledInCreate;
                const formattedDateValue = formatDateForInput(value);
                
                // Log pour déboguer la date de retraite
                if (field.name === 'date_retraite') {
                    console.log('🔍 Rendu champ date_retraite:', {
                        fieldName: field.name,
                        rawValue: value,
                        formattedValue: formattedDateValue,
                        formDataDateRetraite: formData.date_retraite,
                        isDisabled: isDateDisabled,
                        hasDateDeNaissance: !!formData.date_de_naissance,
                        hasIdGrade: !!formData.id_grade,
                        idGrade: formData.id_grade
                    });
                }
                
                return (
                    <Input
                        type="date"
                        id={field.name}
                        value={formattedDateValue}
                        onChange={(e) => handleInputChange(field.name, e.target.value)}
                        invalid={hasError}
                        disabled={isDateDisabled}
                        style={{
                            backgroundColor: isDateDisabled ? '#f8f9fa' : 'white',
                            color: isDateDisabled ? '#6c757d' : 'inherit',
                            cursor: isDateDisabled ? 'not-allowed' : 'pointer'
                        }}
                        title={isDateDisabled ? (field.disabledPlaceholder || 'Ce champ est calculé automatiquement') : ''}
                    />
                );

            case 'tel':
                return (
                    <Input
                        type="tel"
                        id={field.name}
                        value={value || ''}
                        onChange={(e) => handleInputChange(field.name, e.target.value)}
                        placeholder={field.placeholder || `Saisir ${field.label.toLowerCase()}`}
                        invalid={hasError}
                        pattern="[0-9]*"
                        inputMode="numeric"
                    />
                );

            case 'acte_mariage_composite':
                // Extraire le numéro et la date depuis la valeur
                const acteValue = value || {};
                const numeroActe = acteValue.numero || '';
                const dateActe = acteValue.date || '';
                
                return (
                    <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '10px' 
                    }}>
                        {/* Numéro de l'acte avec préfixe N° */}
                        <div className="input-group" style={{ flex: '0 0 auto', width: '200px' }}>
                            <span className="input-group-text" style={{ 
                                backgroundColor: '#e9ecef',
                                border: '1px solid #ced4da',
                                fontWeight: 'bold'
                            }}>
                                N°
                            </span>
                            <Input
                                type="text"
                                value={numeroActe}
                                onChange={(e) => {
                                    // Limiter à 5 chiffres maximum et seulement des chiffres
                                    const inputValue = e.target.value.replace(/\D/g, '').slice(0, 5);
                                    handleInputChange(field.name, {
                                        ...acteValue,
                                        numero: inputValue
                                    });
                                }}
                                placeholder="12345"
                                invalid={hasError}
                                maxLength={5}
                                pattern="[0-9]*"
                                inputMode="numeric"
                                style={{ textTransform: 'none' }}
                            />
                        </div>
                        
                        {/* Séparateur */}
                        <span style={{ 
                            fontSize: '1.2em', 
                            fontWeight: 'bold',
                            color: '#6c757d',
                            flexShrink: 0
                        }}>/</span>
                        
                        {/* Date de délivrance avec calendrier */}
                        <div style={{ flex: '1', maxWidth: '300px' }}>
                            <Input
                                type="date"
                                value={formatDateForInput(dateActe)}
                                onChange={(e) => handleInputChange(field.name, {
                                    ...acteValue,
                                    date: e.target.value
                                })}
                                invalid={hasError}
                                placeholder="Date de délivrance"
                            />
                        </div>
                    </div>
                );

            case 'children':
                return (
                    <ChildrenFields
                        value={value || []}
                        onChange={(children) => handleInputChange(field.name, children)}
                        nombreEnfants={formData?.nombre_enfant || 0}
                        errors={errors}
                    />
                );

            case 'diplomes':
                return (
                    <DiplomesFields
                        value={value || []}
                        onChange={handleDiplomesChange}
                        nombreDiplomes={formData?.nombre_diplomes || 0}
                        existingDiplomes={formData?.existingFiles?.diplomes || []}
                        invalid={hasError}
                        errors={errors}
                    />
                );

            case 'dynamic_documents':
                return (
                    <DynamicDocumentsFields
                        value={value || []}
                        onChange={(documents) => handleInputChange(field.name, documents)}
                        existingDocuments={formData?.existingFiles?.documents || []}
                        invalid={hasError}
                    />
                );

            case 'agent_langues':
                return (
                    <AgentLanguesFields
                        value={value || []}
                        onChange={(langues) => handleInputChange(field.name, langues)}
                        invalid={hasError}
                    />
                );

            case 'agent_logiciels':
                return (
                    <AgentLogicielsFields
                        value={value || []}
                        onChange={(logiciels) => handleInputChange(field.name, logiciels)}
                        invalid={hasError}
                    />
                );

            case 'file':
                const existingFile = formData?.existingFiles?.[field.name];
                return (
                    <div>
                        <Input
                            type="file"
                            id={field.name}
                            onChange={(e) => handleInputChange(field.name, e.target.files[0])}
                            accept={field.accept}
                            invalid={hasError}
                        />
                        {existingFile && (
                            <div className="mt-2">
                                <small className="text-info">
                                    📄 Fichier existant: {existingFile.document_name || existingFile.photo_name} 
                                    {existingFile.document_size && ` (${(existingFile.document_size / 1024).toFixed(1)} KB)`}
                                    {existingFile.photo_size && ` (${(existingFile.photo_size / 1024).toFixed(1)} KB)`}
                                </small>
                            </div>
                        )}
                        {value && (
                            <div className="mt-2">
                                <small className="text-muted">
                                    Fichier sélectionné: {value.name} ({(value.size / 1024).toFixed(1)} KB)
                                </small>
                            </div>
                        )}
                    </div>
                );

            default:
                const isDisabled = shouldDisableField(field);
                const placeholder = isDisabled 
                    ? (field.disabledPlaceholder || field.placeholder || 'Généré automatiquement')
                    : (field.placeholder || `Saisir ${field.label.toLowerCase()}`);
                
                // Champs qui ne doivent pas être convertis en majuscules
                const fieldsToPreserveCase = ['email', 'situation_militaire', 'statut_emploi', 'grade_prefectoral', 'corps_prefectoral', 'numero_acte_mariage', 'numero_et_date_acte_mariage'];
                const shouldUppercase = !fieldsToPreserveCase.includes(field.name) && !field.readOnly;
                
                // Si le champ a un préfixe (comme "N°"), l'afficher avec InputGroup
                if (field.prefix) {
                    return (
                        <div className="input-group">
                            <span className="input-group-text" style={{ 
                                backgroundColor: '#e9ecef',
                                border: '1px solid #ced4da',
                                fontWeight: 'bold'
                            }}>
                                {field.prefix}
                            </span>
                            <Input
                                type={field.type || 'text'}
                                id={field.name}
                                value={value || ''}
                                onChange={(e) => handleInputChange(field.name, e.target.value)}
                                placeholder={placeholder}
                                invalid={hasError}
                                disabled={isDisabled}
                                readOnly={field.readOnly}
                                min={field.min}
                                max={field.max}
                                step={field.step}
                                style={{ 
                                    textTransform: shouldUppercase ? 'uppercase' : 'none',
                                    backgroundColor: isDisabled || field.readOnly ? '#f8f9fa' : 'white',
                                    color: isDisabled || field.readOnly ? '#6c757d' : 'inherit'
                                }}
                            />
                        </div>
                    );
                }
                
                return (
                    <Input
                        type={field.type || 'text'}
                        id={field.name}
                        value={value}
                        onChange={(e) => handleInputChange(field.name, e.target.value)}
                        placeholder={placeholder}
                        invalid={hasError}
                        disabled={isDisabled}
                        readOnly={field.readOnly}
                        min={field.min}
                        max={field.max}
                        step={field.step}
                        style={{ 
                            textTransform: shouldUppercase ? 'uppercase' : 'none',
                            backgroundColor: isDisabled || field.readOnly ? '#f8f9fa' : 'white',
                            color: isDisabled || field.readOnly ? '#6c757d' : 'inherit',
                            cursor: field.readOnly ? 'not-allowed' : 'text'
                        }}
                    />
                );
        }
    };

    // Comparaison souple pour valeurs de select (1 == "1")
    const valuesEqual = (a, b) => a != null && b != null && (Number(a) === Number(b) || String(a) === String(b));

    // Fonction pour vérifier si un champ conditionnel doit être affiché
    const shouldShowField = (field) => {
        // Si conditionalMultiple est défini, toutes les conditions doivent être vraies
        if (field.conditionalMultiple && Array.isArray(field.conditionalMultiple)) {
            return field.conditionalMultiple.every(condition => {
                const { field: conditionalField, value, values, notValue, notValues, min, notEmpty, isEmpty } = condition;
                const conditionalValue = formData[conditionalField];
                
                if (value !== undefined) {
                    return valuesEqual(conditionalValue, value);
                }
                
                if (values !== undefined) {
                    return Array.isArray(values) && values.some(v => valuesEqual(conditionalValue, v));
                }
                
                if (notValue !== undefined) {
                    return !valuesEqual(conditionalValue, notValue);
                }
                
                if (notValues !== undefined) {
                    return !Array.isArray(notValues) || !notValues.some(v => valuesEqual(conditionalValue, v));
                }
                
                if (min !== undefined) {
                    return Number(conditionalValue) >= min;
                }
                
                if (notEmpty !== undefined) {
                    return conditionalValue !== null && conditionalValue !== undefined && conditionalValue !== '';
                }
                
                if (isEmpty !== undefined) {
                    return conditionalValue === null || conditionalValue === undefined || conditionalValue === '';
                }
                
                return true;
            });
        }
        
        // Gestion de la condition simple (ancien comportement)
        if (!field.conditional) return true;
        
        const { field: conditionalField, value, values, notValue, notValues, min, notEmpty, isEmpty } = field.conditional;
        const conditionalValue = formData[conditionalField];
        
        if (value !== undefined) {
            return valuesEqual(conditionalValue, value);
        }
        
        if (values !== undefined) {
            return Array.isArray(values) && values.some(v => valuesEqual(conditionalValue, v));
        }
        
        if (notValue !== undefined) {
            return !valuesEqual(conditionalValue, notValue);
        }
        
        if (notValues !== undefined) {
            return !Array.isArray(notValues) || !notValues.some(v => valuesEqual(conditionalValue, v));
        }
        
        if (min !== undefined) {
            return Number(conditionalValue) >= min;
        }
        
        if (notEmpty !== undefined) {
            // Vérifier si le champ conditionnel n'est pas vide
            return conditionalValue !== null && conditionalValue !== undefined && conditionalValue !== '';
        }
        
        if (isEmpty !== undefined) {
            // Vérifier si le champ conditionnel est vide
            return conditionalValue === null || conditionalValue === undefined || conditionalValue === '';
        }
        
        return true;
    };

    // Fonction pour vérifier si un champ doit être désactivé
    const shouldDisableField = (field) => {
        if (!field.conditionalDisabled) return false;
        
        const { field: conditionalField, value, values, notValue, notValues } = field.conditionalDisabled;
        const conditionalValue = formData[conditionalField];
        
        // Logique spéciale pour le champ matricule : permettre la saisie pour FONCTIONNAIRE, BNETD et ARTICLE 18
        if (field.name === 'matricule' && conditionalField === 'id_type_d_agent') {
            // Types d'agents qui doivent avoir leur matricule saisi manuellement (pas de génération automatique)
            const manualMatriculeTypes = ['BNETD', 'CONTRACTUEL(ARTICLE 18)'];
            
            // Si c'est FONCTIONNAIRE (id = 1), permettre la saisie
            if (conditionalValue === 1 || conditionalValue === '1') {
                return false; // Champ non désactivé (saisie autorisée)
            }
            
            // Vérifier si le type d'agent est BNETD ou ARTICLE 18 en utilisant les options dynamiques
            if (dynamicOptions.id_type_d_agent && Array.isArray(dynamicOptions.id_type_d_agent)) {
                const selectedType = dynamicOptions.id_type_d_agent.find(opt => {
                    const optId = typeof opt === 'object' ? opt.id : opt;
                    return String(optId) === String(conditionalValue) || Number(optId) === Number(conditionalValue);
                });
                
                if (selectedType) {
                    const typeLabel = typeof selectedType === 'object' ? selectedType.label : selectedType;
                    // Si c'est BNETD ou ARTICLE 18, permettre la saisie (champ non désactivé)
                    if (manualMatriculeTypes.includes(typeLabel)) {
                        return false; // Champ non désactivé (saisie autorisée)
                    }
                }
            }
            
            // Pour tous les autres types d'agents non fonctionnaires, désactiver le champ (génération automatique)
            return true;
        }
        
        if (value !== undefined) {
            return conditionalValue !== value;
        }
        
        if (values !== undefined) {
            return !values.includes(conditionalValue);
        }
        
        if (notValue !== undefined) {
            return conditionalValue !== notValue;
        }
        
        if (notValues !== undefined) {
            return notValues.includes(conditionalValue);
        }
        
        return false;
    };

    const renderStep = (step, stepIndex) => {
        if (stepIndex !== currentStep) return null;

        return (
            <div key={stepIndex}>
                <h5 className="mb-4">{step.title}</h5>
                <Row>
                    {step.fields.map(field => {
                        // Vérifier si le champ doit être affiché
                        if (!shouldShowField(field)) return null;
                        
                        return (
                            <Col key={field.name} md={field.colSize || 6} className="mb-3">
                                <FormGroup>
                                    <Label for={field.name}>
                                        {field.label}
                                        {(() => {
                                            // Vérifier si le champ est requis (soit required: true, soit conditionalRequired)
                                            let isRequired = field.required;
                                            
                                            // Vérifier la condition pour conditionalRequired (comparaison souple 1 == "1")
                                            if (field.conditionalRequired) {
                                                const { field: conditionalField, value, values, notValue, notValues, isEmpty } = field.conditionalRequired;
                                                const conditionalValue = formData[conditionalField];
                                                
                                                if (isEmpty) {
                                                    isRequired = (conditionalValue == null || conditionalValue === '');
                                                } else if (value !== undefined) {
                                                    isRequired = valuesEqual(conditionalValue, value);
                                                } else if (values !== undefined) {
                                                    isRequired = Array.isArray(values) && values.some(v => valuesEqual(conditionalValue, v));
                                                } else if (notValue !== undefined) {
                                                    isRequired = !valuesEqual(conditionalValue, notValue);
                                                } else if (notValues !== undefined) {
                                                    isRequired = !Array.isArray(notValues) || !notValues.some(v => valuesEqual(conditionalValue, v));
                                                }
                                            }
                                            
                                            return isRequired && <span className="text-danger"> *</span>;
                                        })()}
                                    </Label>
                                    {renderField(field)}
                                    {field.helpText && (
                                        <small className="form-text text-muted mt-1 d-block">
                                            {field.helpText}
                                        </small>
                                    )}
                                    {errors[field.name] && (
                                        <Alert color="danger" className="mt-1 py-1">
                                            {errors[field.name]}
                                        </Alert>
                                    )}
                                </FormGroup>
                            </Col>
                        );
                    })}
                </Row>
            </div>
        );
    };

    const progressPercentage = ((currentStep + 1) / steps.length) * 100;

    return (
        <Modal isOpen={isOpen} toggle={handleClose} size="lg" scrollable>
            <ModalHeader toggle={handleClose}>
                {title}
            </ModalHeader>
            <ModalBody>
                {submitError && (
                    <Alert color="danger">
                        {submitError}
                    </Alert>
                )}

                {/* Barre de progression */}
                <div className="mb-4">
                    <div className="d-flex justify-content-between mb-2">
                        <span className="text-muted">Étape {currentStep + 1} sur {steps.length}</span>
                        <span className="text-muted">{Math.round(progressPercentage)}%</span>
                    </div>
                    <Progress value={progressPercentage} color="primary" />
                </div>

                {/* Contenu de l'étape */}
                {steps.map((step, index) => renderStep(step, index))}
            </ModalBody>
            <ModalFooter>
                <Button color="secondary" onClick={handleClose}>
                    Annuler
                </Button>
                
                {currentStep > 0 && (
                    <Button color="outline-primary" onClick={handlePrevious}>
                        Précédent
                    </Button>
                )}
                
                {/* En mode modification, afficher le bouton de soumission sur toutes les étapes */}
                {initialData && Object.keys(initialData).length > 0 ? (
                    <>
                        {currentStep < steps.length - 1 && (
                            <Button color="primary" onClick={handleNext}>
                                Suivant
                            </Button>
                        )}
                        <Button color="success" onClick={handleSubmit}>
                            {submitText}
                        </Button>
                    </>
                ) : (
                    /* En mode création, afficher le bouton seulement sur la dernière étape */
                    currentStep < steps.length - 1 ? (
                        <Button color="primary" onClick={handleNext}>
                            Suivant
                        </Button>
                    ) : (
                        <Button color="success" onClick={handleSubmit}>
                            {submitText}
                        </Button>
                    )
                )}
            </ModalFooter>
        </Modal>
    );
};

export default MultiStepForm;
