import React, { useState, useEffect } from 'react';
import {
    Button,
    Input,
    Row,
    Col,
    Card,
    CardBody,
    CardHeader,
    FormGroup,
    Label
} from 'reactstrap';
import { MdAdd, MdDelete, MdAttachFile } from 'react-icons/md';

// Composant pour gérer les documents dynamiques
const DynamicDocumentsFields = ({ value = [], onChange, invalid, existingDocuments = [] }) => {
    const [documents, setDocuments] = useState(value);

    useEffect(() => {
        setDocuments(value);
    }, [value]);

    useEffect(() => {
        if (existingDocuments && existingDocuments.length > 0) {
            console.log('🔧 DynamicDocumentsFields - Chargement des documents existants:', existingDocuments);
            const formattedDocuments = existingDocuments.map(doc => {
                const formattedDoc = {
                    id: doc.id,
                    name: doc.document_name || doc.name || 'Document sans nom',
                    file: null,
                    existingDocument: {
                        name: doc.document_name || doc.name,
                        size: doc.document_size,
                        url: doc.document_url,
                        type: doc.document_type
                    }
                };
                console.log('🔧 Document formaté:', formattedDoc);
                return formattedDoc;
            });
            setDocuments(formattedDocuments);
            onChange(formattedDocuments);
        }
    }, [existingDocuments]);

    const addDocument = () => {
        const newDocument = {
            id: `new_${Date.now()}`,
            name: '',
            file: null,
            existingDocument: null
        };
        const updatedDocuments = [...documents, newDocument];
        setDocuments(updatedDocuments);
        onChange(updatedDocuments);
    };

    const removeDocument = (index) => {
        const updatedDocuments = documents.filter((_, i) => i !== index);
        setDocuments(updatedDocuments);
        onChange(updatedDocuments);
    };

    const updateDocument = (index, field, newValue) => {
        console.log(`🔧 DynamicDocumentsFields - updateDocument(${index}, '${field}', newValue)`);
        console.log('   newValue:', newValue);
        console.log('   typeof newValue:', typeof newValue);
        console.log('   newValue instanceof File:', newValue instanceof File);
        
        const updatedDocuments = [...documents];
        updatedDocuments[index] = {
            ...updatedDocuments[index],
            [field]: newValue
        };
        
        // S'assurer que les fichiers vides sont null et non des objets vides
        if (field === 'file' && (!newValue || (typeof newValue === 'object' && !(newValue instanceof File) && Object.keys(newValue).length === 0))) {
            console.log('   ⚠️ Fichier vide détecté - conversion en null');
            updatedDocuments[index][field] = null;
        }
        
        console.log('   📄 Document mis à jour:', updatedDocuments[index]);
        setDocuments(updatedDocuments);
        onChange(updatedDocuments);
    };

    return (
        <div>
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="mb-0">
                    <MdAttachFile className="me-2" />
                    Documents ({documents.length})
                </h6>
                <Button
                    color="primary"
                    size="sm"
                    onClick={addDocument}
                    className="d-flex align-items-center"
                >
                    <MdAdd className="me-1" />
                    Ajouter un document
                </Button>
            </div>

            {documents.length === 0 && (
                <div className="text-center py-4" style={{ 
                    border: '2px dashed #dee2e6', 
                    borderRadius: '8px',
                    background: '#f8f9fa'
                }}>
                    <MdAttachFile size={48} color="#6c757d" />
                    <p className="mt-2 text-muted">Aucun document ajouté</p>
                    <Button
                        color="primary"
                        size="sm"
                        onClick={addDocument}
                        className="d-flex align-items-center mx-auto"
                    >
                        <MdAdd className="me-1" />
                        Ajouter le premier document
                    </Button>
                </div>
            )}

            {documents.map((document, index) => (
                <Card key={document.id || index} className="mb-3">
                    <CardHeader style={{ 
                        background: '#f8f9fa', 
                        borderBottom: '1px solid #dee2e6',
                        padding: '0.75rem 1rem'
                    }}>
                        <div className="d-flex justify-content-between align-items-center">
                            <h6 className="mb-0">
                                Document {index + 1}
                                {document.name && ` - ${document.name}`}
                            </h6>
                            <Button
                                color="danger"
                                size="sm"
                                onClick={() => removeDocument(index)}
                                className="d-flex align-items-center"
                            >
                                <MdDelete />
                            </Button>
                        </div>
                    </CardHeader>
                    <CardBody>
                        <Row>
                            <Col md={6}>
                                <FormGroup>
                                    <Label for={`document_${index}_name`}>Nom du document</Label>
                                    <Input
                                        type="text"
                                        id={`document_${index}_name`}
                                        value={document.name}
                                        onChange={(e) => updateDocument(index, 'name', e.target.value)}
                                        placeholder="Ex: Certificat de travail, Attestation..."
                                        invalid={invalid}
                                    />
                                </FormGroup>
                            </Col>
                            <Col md={6}>
                                <FormGroup>
                                    <Label for={`document_${index}_file`}>Fichier</Label>
                                    <Input
                                        type="file"
                                        id={`document_${index}_file`}
                                        onChange={(e) => {
                                            const file = e.target.files && e.target.files[0] ? e.target.files[0] : null;
                                            console.log(`🔧 DynamicDocumentsFields - Fichier sélectionné pour document ${index + 1}:`, file);
                                            updateDocument(index, 'file', file);
                                        }}
                                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                                        invalid={invalid}
                                    />
                                </FormGroup>
                            </Col>
                        </Row>

                        {/* Affichage du document existant */}
                        {document.existingDocument && (
                            <div className="mt-2 p-2" style={{ 
                                background: '#e3f2fd', 
                                borderRadius: '4px',
                                border: '1px solid #bbdefb'
                            }}>
                                <small className="text-info d-flex align-items-center">
                                    <MdAttachFile className="me-1" />
                                    <strong>Document existant:</strong> {document.existingDocument.name}
                                    {document.existingDocument.size && (
                                        <span className="ms-2">
                                            ({Math.round(document.existingDocument.size / 1024)} KB)
                                        </span>
                                    )}
                                </small>
                            </div>
                        )}

                        {/* Affichage du nouveau fichier sélectionné */}
                        {document.file && (
                            <div className="mt-2 p-2" style={{ 
                                background: '#f3e5f5', 
                                borderRadius: '4px',
                                border: '1px solid #e1bee7'
                            }}>
                                <small className="text-muted d-flex align-items-center">
                                    <MdAttachFile className="me-1" />
                                    <strong>Nouveau fichier:</strong> {document.file.name}
                                    <span className="ms-2">
                                        ({Math.round(document.file.size / 1024)} KB)
                                    </span>
                                </small>
                            </div>
                        )}

                        {/* Validation */}
                        {invalid && !document.name && (
                            <small className="text-danger">
                                Le nom du document est obligatoire
                            </small>
                        )}
                        {invalid && !document.file && !document.existingDocument && (
                            <small className="text-danger">
                                Un fichier est obligatoire
                            </small>
                        )}
                    </CardBody>
                </Card>
            ))}
        </div>
    );
};

export default DynamicDocumentsFields;
