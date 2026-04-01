import React, { useState, useEffect } from 'react';
import {
    Card,
    CardHeader,
    CardBody,
    Table,
    Button,
    Modal,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Form,
    FormGroup,
    Label,
    Input,
    Alert,
    Pagination,
    PaginationItem,
    PaginationLink,
    Row,
    Col,
    Badge
} from 'reactstrap';
import { MdAdd, MdEdit, MdDelete, MdSearch, MdRefresh } from 'react-icons/md';

const GenericTableManager = ({ tableName, title, description }) => {
    const [data, setData] = useState([]);
    const [columns, setColumns] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [modal, setModal] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [formData, setFormData] = useState({});
    const [searchTerm, setSearchTerm] = useState('');
    const [pagination, setPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        totalCount: 0,
        limit: 10
    });

    // Charger les données
    const loadData = async (page = 1, search = '') => {
        setLoading(true);
        setError('');
        
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: pagination.limit.toString()
            });
            
            if (search) {
                params.append('search', search);
            }

            const response = await fetch(`https://tourisme.2ise-groupe.com/api/${tableName}?${params}`);
            const result = await response.json();

            if (result.success) {
                setData(result.data);
                setColumns(result.columns);
                setPagination(result.pagination);
            } else {
                setError(result.message || 'Erreur lors du chargement des données');
            }
        } catch (err) {
            setError('Erreur de connexion au serveur');
            console.error('Erreur:', err);
        } finally {
            setLoading(false);
        }
    };

    // Charger les données au montage du composant
    useEffect(() => {
        loadData();
    }, [tableName]);

    // Gestion du formulaire
    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    // Ouvrir le modal pour créer/éditer
    const toggleModal = (item = null) => {
        setEditingItem(item);
        setFormData(item ? { ...item } : {});
        setModal(!modal);
    };

    // Sauvegarder (créer ou mettre à jour)
    const handleSave = async () => {
        setLoading(true);
        setError('');

        try {
            const url = editingItem 
                ? `https://tourisme.2ise-groupe.com/api/${tableName}/${editingItem.id}`
                : `https://tourisme.2ise-groupe.com/api/${tableName}`;
            
            const method = editingItem ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (result.success) {
                setModal(false);
                loadData(pagination.currentPage, searchTerm);
            } else {
                setError(result.message || 'Erreur lors de la sauvegarde');
            }
        } catch (err) {
            setError('Erreur de connexion au serveur');
            console.error('Erreur:', err);
        } finally {
            setLoading(false);
        }
    };

    // Supprimer un élément
    const handleDelete = async (id) => {
        if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet élément ?')) {
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await fetch(`https://tourisme.2ise-groupe.com/api/${tableName}/${id}`, {
                method: 'DELETE'
            });

            const result = await response.json();

            if (result.success) {
                loadData(pagination.currentPage, searchTerm);
            } else {
                setError(result.message || 'Erreur lors de la suppression');
            }
        } catch (err) {
            setError('Erreur de connexion au serveur');
            console.error('Erreur:', err);
        } finally {
            setLoading(false);
        }
    };

    // Recherche
    const handleSearch = (e) => {
        e.preventDefault();
        loadData(1, searchTerm);
    };

    // Pagination
    const handlePageChange = (page) => {
        loadData(page, searchTerm);
    };

    // Rendu des champs du formulaire
    const renderFormField = (column) => {
        const { column_name, data_type, is_nullable } = column;
        
        // Ignorer les colonnes système
        if (['id', 'created_at', 'updated_at'].includes(column_name)) {
            return null;
        }

        const isRequired = is_nullable === 'NO' && !column_name.includes('_at');

        let inputType = 'text';
        if (data_type === 'integer' || data_type === 'bigint') {
            inputType = 'number';
        } else if (data_type === 'boolean') {
            inputType = 'checkbox';
        } else if (data_type === 'date') {
            inputType = 'date';
        } else if (data_type === 'timestamp without time zone') {
            inputType = 'datetime-local';
        }

        return (
            <FormGroup key={column_name}>
                <Label for={column_name}>
                    {column_name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    {isRequired && <span className="text-danger"> *</span>}
                </Label>
                {inputType === 'checkbox' ? (
                    <Input
                        type="checkbox"
                        name={column_name}
                        id={column_name}
                        checked={formData[column_name] || false}
                        onChange={handleInputChange}
                    />
                ) : (
                    <Input
                        type={inputType}
                        name={column_name}
                        id={column_name}
                        value={formData[column_name] || ''}
                        onChange={handleInputChange}
                        required={isRequired}
                    />
                )}
            </FormGroup>
        );
    };

    return (
        <div>
            <Card>
                <CardHeader className="d-flex justify-content-between align-items-center">
                    <div>
                        <h4 className="mb-0">{title}</h4>
                        <small className="text-muted">{description}</small>
                    </div>
                    <div>
                        <Badge color="info" className="me-2">
                            {pagination.totalCount} enregistrement(s)
                        </Badge>
                        <Button color="primary" onClick={() => toggleModal()}>
                            <MdAdd className="me-1" />
                            Ajouter
                        </Button>
                    </div>
                </CardHeader>
                <CardBody>
                    {error && (
                        <Alert color="danger" className="mb-3">
                            {error}
                        </Alert>
                    )}

                    {/* Barre de recherche */}
                    <Row className="mb-3">
                        <Col md="6">
                            <Form onSubmit={handleSearch} className="d-flex">
                                <Input
                                    type="text"
                                    placeholder="Rechercher..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="me-2"
                                />
                                <Button type="submit" color="secondary" className="me-2">
                                    <MdSearch />
                                </Button>
                                <Button 
                                    type="button" 
                                    color="outline-secondary"
                                    onClick={() => {
                                        setSearchTerm('');
                                        loadData(1, '');
                                    }}
                                >
                                    <MdRefresh />
                                </Button>
                            </Form>
                        </Col>
                    </Row>

                    {/* Tableau */}
                    {loading ? (
                        <div className="text-center py-4">
                            <div className="spinner-border" role="status">
                                <span className="visually-hidden">Chargement...</span>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="table-responsive">
                                <Table striped hover>
                                    <thead>
                                        <tr>
                                            {columns.map(column => (
                                                <th key={column.column_name}>
                                                    {column.column_name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                                </th>
                                            ))}
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.map((item, index) => (
                                            <tr key={item.id || index}>
                                                {columns.map(column => (
                                                    <td key={column.column_name}>
                                                        {column.data_type === 'boolean' ? (
                                                            <Badge color={item[column.column_name] ? 'success' : 'secondary'}>
                                                                {item[column.column_name] ? 'Oui' : 'Non'}
                                                            </Badge>
                                                        ) : (
                                                            typeof item[column.column_name] === 'object' && item[column.column_name] !== null ? 
                                                                (item[column.column_name].label || item[column.column_name].name || item[column.column_name].nom || JSON.stringify(item[column.column_name])) : 
                                                                (item[column.column_name] || '-')
                                                        )}
                                                    </td>
                                                ))}
                                                <td>
                                                    <Button
                                                        size="sm"
                                                        color="warning"
                                                        className="me-1"
                                                        onClick={() => toggleModal(item)}
                                                    >
                                                        <MdEdit />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        color="danger"
                                                        onClick={() => handleDelete(item.id)}
                                                    >
                                                        <MdDelete />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            </div>

                            {/* Pagination */}
                            {pagination.totalPages > 1 && (
                                <div className="d-flex justify-content-center mt-3">
                                    <Pagination>
                                        <PaginationItem disabled={pagination.currentPage === 1}>
                                            <PaginationLink 
                                                previous 
                                                onClick={() => handlePageChange(pagination.currentPage - 1)}
                                            />
                                        </PaginationItem>
                                        
                                        {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(page => (
                                            <PaginationItem key={page} active={page === pagination.currentPage}>
                                                <PaginationLink onClick={() => handlePageChange(page)}>
                                                    {page}
                                                </PaginationLink>
                                            </PaginationItem>
                                        ))}
                                        
                                        <PaginationItem disabled={pagination.currentPage === pagination.totalPages}>
                                            <PaginationLink 
                                                next 
                                                onClick={() => handlePageChange(pagination.currentPage + 1)}
                                            />
                                        </PaginationItem>
                                    </Pagination>
                                </div>
                            )}
                        </>
                    )}
                </CardBody>
            </Card>

            {/* Modal de création/édition */}
            <Modal isOpen={modal} toggle={() => toggleModal()} size="lg">
                <ModalHeader toggle={() => toggleModal()}>
                    {editingItem ? 'Modifier' : 'Créer'} {title}
                </ModalHeader>
                <ModalBody>
                    <Form>
                        <Row>
                            {columns.map(column => (
                                <Col md="6" key={column.column_name}>
                                    {renderFormField(column)}
                                </Col>
                            ))}
                        </Row>
                    </Form>
                </ModalBody>
                <ModalFooter>
                    <Button color="secondary" onClick={() => toggleModal()}>
                        Annuler
                    </Button>
                    <Button color="primary" onClick={handleSave} disabled={loading}>
                        {loading ? 'Sauvegarde...' : 'Sauvegarder'}
                    </Button>
                </ModalFooter>
            </Modal>
        </div>
    );
};

export default GenericTableManager;
