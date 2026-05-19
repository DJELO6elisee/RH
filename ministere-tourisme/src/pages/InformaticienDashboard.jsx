import React, { useState, useEffect } from 'react';
import Page from 'components/Page';
import {
    Alert,
    Button,
    Card,
    CardBody,
    Form,
    FormGroup,
    Input,
    Label,
    Spinner,
    Row,
    Col,
    ListGroup,
    ListGroupItem,
    CustomInput,
    Nav,
    NavItem,
    NavLink
} from 'reactstrap';
import { useAuth } from 'contexts/AuthContext';
import { MdColorLens, MdViewList, MdDescription, MdSave } from 'react-icons/md';
import { backendRoutes } from '../config/routes';

const InformaticienDashboard = () => {
    const { token } = useAuth();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);
    const [activeTab, setActiveTab] = useState('1');

    // États pour les configurations
    const [themeColors, setThemeColors] = useState({
        primary: '#6a82fb',
        secondary: '#fc5c7d',
        success: '#45b649',
        danger: '#f85032',
        warning: '#ffd700',
        info: '#00c9ff'
    });

    const [disabledTabs, setDisabledTabs] = useState([]);
    
    const [templates, setTemplates] = useState({
        template_attestation_presence: { body: '', footer: '' },
        template_autorisation_absence: { body: '', motif_header: '', motif: '' },
        template_autorisation_sortie_territoire: { body: '', footer: '' },
        template_certificat_cessation: { body: '', motif_title: '', reprise_text: '' },
        template_certificat_non_jouissance_conge: { body: '', footer: '' },
        template_certificat_reprise_service: { body: '', motif_title: '' },
        template_attestation_travail: { body: '', footer: '' }
    });

    // Charger les configurations
    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const response = await fetch('https://tourisme.2ise-groupe.com/api/settings', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const result = await response.json();
                if (result.success) {
                    const settings = result.data;
                    
                    // Appliquer les valeurs récupérées
                    const colors = settings.find(s => s.key === 'theme_colors');
                    if (colors) setThemeColors(colors.value);

                    const tabs = settings.find(s => s.key === 'sidebar_disabled_tabs');
                    if (tabs) setDisabledTabs(tabs.value);

                    // Templates
                    const newTemplates = { ...templates };
                    settings.forEach(s => {
                        if (s.key.startsWith('template_')) {
                            newTemplates[s.key] = s.value;
                        }
                    });
                    setTemplates(newTemplates);
                }
            }
        } catch (error) {
            console.error('Erreur lors du chargement des paramètres:', error);
            setErrorMessage('Impossible de charger les paramètres.');
        }
    };

    const handleColorChange = (colorKey, value) => {
        setThemeColors(prev => ({
            ...prev,
            [colorKey]: value
        }));
    };

    const handleTabToggle = (tabId) => {
        setDisabledTabs(prev => {
            if (prev.includes(tabId)) {
                return prev.filter(id => id !== tabId);
            } else {
                return [...prev, tabId];
            }
        });
    };

    const handleTemplateChange = (templateKey, field, value) => {
        setTemplates(prev => ({
            ...prev,
            [templateKey]: {
                ...prev[templateKey],
                [field]: value
            }
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setErrorMessage(null);
        setSuccessMessage(null);
        setIsSubmitting(true);

        const settingsToUpdate = [
            { key: 'theme_colors', value: themeColors, description: 'Couleurs du thème de l\'application' },
            { key: 'sidebar_disabled_tabs', value: disabledTabs, description: 'Liste des IDs d\'onglets désactivés' },
            { key: 'template_attestation_presence', value: templates.template_attestation_presence, description: 'Template pour l\'attestation de présence' },
            { key: 'template_autorisation_absence', value: templates.template_autorisation_absence, description: 'Template pour l\'autorisation d\'absence' },
            { key: 'template_autorisation_sortie_territoire', value: templates.template_autorisation_sortie_territoire, description: 'Template pour l\'autorisation de sortie du territoire' },
            { key: 'template_certificat_cessation', value: templates.template_certificat_cessation, description: 'Template pour le certificat de cessation de service' },
            { key: 'template_certificat_non_jouissance_conge', value: templates.template_certificat_non_jouissance_conge, description: 'Template pour le certificat de non jouissance de congé' },
            { key: 'template_certificat_reprise_service', value: templates.template_certificat_reprise_service, description: 'Template pour le certificat de reprise de service' },
            { key: 'template_attestation_travail', value: templates.template_attestation_travail, description: 'Template pour l\'attestation de travail' }
        ];

        try {
            const response = await fetch('https://tourisme.2ise-groupe.com/api/settings/multiple', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ settings: settingsToUpdate })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || 'Une erreur est survenue lors de la sauvegarde.');
            }

            setSuccessMessage('Paramètres sauvegardés avec succès.');
            // Déclencher un rechargement ou appliquer les couleurs dynamiquement ici si possible
        } catch (error) {
            setErrorMessage(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Grouper les routes par catégorie pour l'affichage
    const routesByCategory = backendRoutes.reduce((acc, route) => {
        const category = route.category || 'Autres';
        if (!acc[category]) acc[category] = [];
        acc[category].push(route);
        return acc;
    }, {});

    return (
        <Page
            title="Tableau de Bord Informaticien"
            breadcrumbs={[
                { name: 'Administration', active: true }
            ]}
        >
            <Form onSubmit={handleSubmit}>
                {errorMessage && <Alert color="danger">{errorMessage}</Alert>}
                {successMessage && <Alert color="success">{successMessage}</Alert>}

            <Nav tabs className="mb-4">
                <NavItem>
                    <NavLink
                        className={activeTab === '1' ? 'active' : ''}
                        onClick={() => setActiveTab('1')}
                        style={{ cursor: 'pointer', fontWeight: 'bold' }}
                    >
                        <MdColorLens className="me-2" />
                        Couleurs du Thème
                    </NavLink>
                </NavItem>
                <NavItem>
                    <NavLink
                        className={activeTab === '2' ? 'active' : ''}
                        onClick={() => setActiveTab('2')}
                        style={{ cursor: 'pointer', fontWeight: 'bold' }}
                    >
                        <MdViewList className="me-2" />
                        Gestion des Onglets (Sidebar)
                    </NavLink>
                </NavItem>
                <NavItem>
                    <NavLink
                        className={activeTab === '3' ? 'active' : ''}
                        onClick={() => setActiveTab('3')}
                        style={{ cursor: 'pointer', fontWeight: 'bold' }}
                    >
                        <MdDescription className="me-2" />
                        Textes des Documents
                    </NavLink>
                </NavItem>
            </Nav>

            {activeTab === '1' && (
                <Card className="mb-4">
                    <CardBody>
                        <h6 className="mb-4">
                            <MdColorLens className="me-2" />
                            Couleurs du Thème
                        </h6>
                        <Row>
                            {Object.keys(themeColors).map(colorKey => (
                                <Col md="6" key={colorKey} className="mb-2">
                                    <FormGroup>
                                        <Label for={`color-${colorKey}`} className="text-capitalize">{colorKey}</Label>
                                        <div className="d-flex">
                                            <Input
                                                type="color"
                                                id={`color-${colorKey}`}
                                                value={themeColors[colorKey]}
                                                onChange={(e) => handleColorChange(colorKey, e.target.value)}
                                                style={{ width: '50px', padding: '0', height: '38px' }}
                                            />
                                            <Input
                                                type="text"
                                                value={themeColors[colorKey]}
                                                onChange={(e) => handleColorChange(colorKey, e.target.value)}
                                                className="ms-2"
                                            />
                                        </div>
                                    </FormGroup>
                                </Col>
                            ))}
                        </Row>
                    </CardBody>
                </Card>
            )}

            {activeTab === '2' && (
                <Card className="mb-4">
                    <CardBody style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        <h6 className="mb-4">
                            <MdViewList className="me-2" />
                            Gestion des Onglets (Sidebar)
                        </h6>
                        <p className="text-muted small">Cochez pour activer, décochez pour masquer l'onglet aux agents.</p>
                        
                        {Object.keys(routesByCategory).map(category => (
                            <div key={category} className="mb-3">
                                <h7 className="fw-bold text-uppercase text-primary">{category}</h7>
                                <ListGroup flush>
                                    {routesByCategory[category].map(route => (
                                        <ListGroupItem key={route.id} className="d-flex justify-content-between align-items-center py-2">
                                            <span>{route.name}</span>
                                            <CustomInput
                                                type="checkbox"
                                                id={`tab-${route.id}`}
                                                checked={!disabledTabs.includes(route.id)}
                                                onChange={() => handleTabToggle(route.id)}
                                            />
                                        </ListGroupItem>
                                    ))}
                                </ListGroup>
                            </div>
                        ))}
                    </CardBody>
                </Card>
            )}

            {activeTab === '3' && (
                <Card className="mb-4">
                    <CardBody>
                        <h6 className="mb-4">
                            <MdDescription className="me-2" />
                            Textes des Documents Administratifs
                        </h6>
                        <p className="text-muted small">Utilisez les placeholders entre accolades comme <code>{`{nom}`}</code> ou <code>{`{dateDebut}`}</code> pour insérer les données dynamiques.</p>

                        <Row>
                            {/* Attestation de présence */}
                            <Col md="6" className="mb-3">
                                <Card outline color="info">
                                    <CardBody>
                                        <h6>Attestation de Présence</h6>
                                        <FormGroup>
                                            <Label>Corps du texte</Label>
                                            <Input
                                                type="textarea"
                                                rows="4"
                                                value={templates.template_attestation_presence.body}
                                                onChange={(e) => handleTemplateChange('template_attestation_presence', 'body', e.target.value)}
                                            />
                                        </FormGroup>
                                        <FormGroup>
                                            <Label>Pied de page</Label>
                                            <Input
                                                type="textarea"
                                                rows="2"
                                                value={templates.template_attestation_presence.footer}
                                                onChange={(e) => handleTemplateChange('template_attestation_presence', 'footer', e.target.value)}
                                            />
                                        </FormGroup>
                                    </CardBody>
                                </Card>
                            </Col>

                            {/* Autorisation d'absence */}
                            <Col md="6" className="mb-3">
                                <Card outline color="info">
                                    <CardBody>
                                        <h6>Autorisation d'Absence</h6>
                                        <FormGroup>
                                            <Label>Corps du texte</Label>
                                            <Input
                                                type="textarea"
                                                rows="4"
                                                value={templates.template_autorisation_absence.body}
                                                onChange={(e) => handleTemplateChange('template_autorisation_absence', 'body', e.target.value)}
                                            />
                                        </FormGroup>
                                        <FormGroup>
                                            <Label>En-tête Motif</Label>
                                            <Input
                                                type="text"
                                                value={templates.template_autorisation_absence.motif_header}
                                                onChange={(e) => handleTemplateChange('template_autorisation_absence', 'motif_header', e.target.value)}
                                            />
                                        </FormGroup>
                                    </CardBody>
                                </Card>
                            </Col>

                            {/* Autorisation de sortie du territoire */}
                            <Col md="6" className="mb-3">
                                <Card outline color="info">
                                    <CardBody>
                                        <h6>Autorisation de Sortie du Territoire</h6>
                                        <FormGroup>
                                            <Label>Corps du texte</Label>
                                            <Input
                                                type="textarea"
                                                rows="4"
                                                value={templates.template_autorisation_sortie_territoire.body}
                                                onChange={(e) => handleTemplateChange('template_autorisation_sortie_territoire', 'body', e.target.value)}
                                            />
                                        </FormGroup>
                                        <FormGroup>
                                            <Label>Pied de page</Label>
                                            <Input
                                                type="textarea"
                                                rows="2"
                                                value={templates.template_autorisation_sortie_territoire.footer}
                                                onChange={(e) => handleTemplateChange('template_autorisation_sortie_territoire', 'footer', e.target.value)}
                                            />
                                        </FormGroup>
                                    </CardBody>
                                </Card>
                            </Col>

                            {/* Certificat de cessation de service */}
                            <Col md="6" className="mb-3">
                                <Card outline color="info">
                                    <CardBody>
                                        <h6>Certificat de Cessation de Service</h6>
                                        <FormGroup>
                                            <Label>Corps du texte</Label>
                                            <Input
                                                type="textarea"
                                                rows="4"
                                                value={templates.template_certificat_cessation.body}
                                                onChange={(e) => handleTemplateChange('template_certificat_cessation', 'body', e.target.value)}
                                            />
                                        </FormGroup>
                                        <FormGroup>
                                            <Label>Titre Motif</Label>
                                            <Input
                                                type="text"
                                                value={templates.template_certificat_cessation.motif_title}
                                                onChange={(e) => handleTemplateChange('template_certificat_cessation', 'motif_title', e.target.value)}
                                            />
                                        </FormGroup>
                                        <FormGroup>
                                            <Label>Texte Reprise</Label>
                                            <Input
                                                type="textarea"
                                                rows="2"
                                                value={templates.template_certificat_cessation.reprise_text}
                                                onChange={(e) => handleTemplateChange('template_certificat_cessation', 'reprise_text', e.target.value)}
                                            />
                                        </FormGroup>
                                    </CardBody>
                                </Card>
                            </Col>

                            {/* Certificat de non jouissance de congé */}
                            <Col md="6" className="mb-3">
                                <Card outline color="info">
                                    <CardBody>
                                        <h6>Certificat de Non Jouissance de Congé</h6>
                                        <FormGroup>
                                            <Label>Corps du texte</Label>
                                            <Input
                                                type="textarea"
                                                rows="4"
                                                value={templates.template_certificat_non_jouissance_conge.body}
                                                onChange={(e) => handleTemplateChange('template_certificat_non_jouissance_conge', 'body', e.target.value)}
                                            />
                                        </FormGroup>
                                        <FormGroup>
                                            <Label>Pied de page</Label>
                                            <Input
                                                type="textarea"
                                                rows="2"
                                                value={templates.template_certificat_non_jouissance_conge.footer}
                                                onChange={(e) => handleTemplateChange('template_certificat_non_jouissance_conge', 'footer', e.target.value)}
                                            />
                                        </FormGroup>
                                    </CardBody>
                                </Card>
                            </Col>

                            {/* Certificat de reprise de service */}
                            <Col md="6" className="mb-3">
                                <Card outline color="info">
                                    <CardBody>
                                        <h6>Certificat de Reprise de Service</h6>
                                        <FormGroup>
                                            <Label>Corps du texte</Label>
                                            <Input
                                                type="textarea"
                                                rows="4"
                                                value={templates.template_certificat_reprise_service.body}
                                                onChange={(e) => handleTemplateChange('template_certificat_reprise_service', 'body', e.target.value)}
                                            />
                                        </FormGroup>
                                        <FormGroup>
                                            <Label>Titre Motif</Label>
                                            <Input
                                                type="text"
                                                value={templates.template_certificat_reprise_service.motif_title}
                                                onChange={(e) => handleTemplateChange('template_certificat_reprise_service', 'motif_title', e.target.value)}
                                            />
                                        </FormGroup>
                                    </CardBody>
                                </Card>
                            </Col>

                            {/* Attestation de travail */}
                            <Col md="6" className="mb-3">
                                <Card outline color="info">
                                    <CardBody>
                                        <h6>Attestation de Travail</h6>
                                        <FormGroup>
                                            <Label>Corps du texte</Label>
                                            <Input
                                                type="textarea"
                                                rows="4"
                                                value={templates.template_attestation_travail.body}
                                                onChange={(e) => handleTemplateChange('template_attestation_travail', 'body', e.target.value)}
                                            />
                                        </FormGroup>
                                        <FormGroup>
                                            <Label>Pied de page</Label>
                                            <Input
                                                type="textarea"
                                                rows="2"
                                                value={templates.template_attestation_travail.footer}
                                                onChange={(e) => handleTemplateChange('template_attestation_travail', 'footer', e.target.value)}
                                            />
                                        </FormGroup>
                                    </CardBody>
                                </Card>
                            </Col>
                        </Row>
                    </CardBody>
                </Card>
            )}

                <div className="text-center mb-5">
                    <Button color="primary" size="lg" type="submit" disabled={isSubmitting}>
                        {isSubmitting ? (
                            <>
                                <Spinner size="sm" className="me-2" />
                                Sauvegarde en cours...
                            </>
                        ) : (
                            <>
                                <MdSave className="me-2" />
                                Sauvegarder toutes les configurations
                            </>
                        )}
                    </Button>
                </div>
            </Form>
        </Page>
    );
};

export default InformaticienDashboard;
