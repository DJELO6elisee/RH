import React from 'react';
import {
    Modal,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
    Row,
    Col,
    Card,
    CardBody,
    Badge
} from 'reactstrap';
import { MdCake, MdPerson, MdPhone, MdEmail, MdLocationOn } from 'react-icons/md';
import { useAuth } from '../../contexts/AuthContext';

const BirthdaysDetailsModal = ({ isOpen, toggle, agents, title, type = 'today' }) => {
    const { user } = useAuth();
    
    // Vérifier si l'utilisateur est un directeur ou un sous-directeur
    const userRole = user?.role?.toLowerCase();
    const isDirecteur = userRole === 'directeur';
    const isSousDirecteur = userRole === 'sous_directeur' || userRole === 'sous-directeur';
    const hideAge = isDirecteur || isSousDirecteur;
    return (
        <Modal isOpen={isOpen} toggle={toggle} size="xl" scrollable>
            <ModalHeader toggle={toggle}>
                <MdCake className="me-2" />
                {title}
            </ModalHeader>
            <ModalBody style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                <Row>
                    {agents.map((agent) => {
                        const joursRestants = parseInt(agent.jours_restants) || 0;
                        let badgeColor = 'success';
                        let message = "Aujourd'hui ! 🎂";
                        
                        if (type === 'upcoming') {
                            if (joursRestants === 1) {
                                badgeColor = 'warning';
                                message = "Demain ! 🎈";
                            } else {
                                badgeColor = 'info';
                                message = `Dans ${joursRestants} jours`;
                            }
                        }

                        return (
                            <Col md="6" lg="4" key={agent.id} className="mb-3">
                                <Card className="h-100 shadow-sm border-0" style={{ 
                                    borderLeft: type === 'today' ? '4px solid #28a745' : joursRestants === 1 ? '4px solid #ffc107' : '4px solid #17a2b8',
                                    transition: 'transform 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                                >
                                    <CardBody>
                                        <div className="d-flex align-items-start">
                                            <div className="me-3">
                                                {agent.photo ? (
                                                    <img 
                                                        src={`https://tourisme.2ise-groupe.com${agent.photo}`} 
                                                        alt={`${agent.nom} ${agent.prenom}`}
                                                        style={{ 
                                                            width: '60px', 
                                                            height: '60px', 
                                                            borderRadius: '50%', 
                                                            objectFit: 'cover',
                                                            border: type === 'today' ? '3px solid #28a745' : joursRestants === 1 ? '3px solid #ffc107' : '3px solid #17a2b8'
                                                        }}
                                                    />
                                                ) : (
                                                    <div style={{ 
                                                        width: '60px', 
                                                        height: '60px', 
                                                        borderRadius: '50%', 
                                                        backgroundColor: '#f0f0f0',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontSize: '24px',
                                                        border: type === 'today' ? '3px solid #28a745' : joursRestants === 1 ? '3px solid #ffc107' : '3px solid #17a2b8'
                                                    }}>
                                                        <MdPerson />
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-grow-1">
                                                <h6 className="mb-1" style={{ fontWeight: 'bold', color: '#333' }}>
                                                    {agent.civilite} {agent.nom} {agent.prenom}
                                                </h6>
                                                <p className="mb-1 text-muted" style={{ fontSize: '0.85rem' }}>
                                                    <strong>Matricule:</strong> {agent.matricule}
                                                </p>
                                                {agent.direction && (
                                                    <p className="mb-1 text-muted" style={{ fontSize: '0.8rem' }}>
                                                        <MdLocationOn className="me-1" />
                                                        {agent.direction}
                                                    </p>
                                                )}
                                                {(agent.telephone1 || agent.telephone2 || agent.email) && (
                                                    <div className="mb-2" style={{ fontSize: '0.8rem' }}>
                                                        {agent.telephone1 && (
                                                            <p className="mb-1 text-muted" style={{ marginBottom: '2px' }}>
                                                                <MdPhone className="me-1" />
                                                                {agent.telephone1}
                                                            </p>
                                                        )}
                                                        {agent.telephone2 && (
                                                            <p className="mb-1 text-muted" style={{ marginBottom: '2px' }}>
                                                                <MdPhone className="me-1" />
                                                                {agent.telephone2}
                                                            </p>
                                                        )}
                                                        {agent.email && (
                                                            <p className="mb-1 text-muted" style={{ marginBottom: '2px' }}>
                                                                <MdEmail className="me-1" />
                                                                {agent.email}
                                                            </p>
                                                        )}
                                                    </div>
                                                )}
                                                <div className="mt-2">
                                                    <Badge 
                                                        color={badgeColor} 
                                                        style={{
                                                            fontSize: '0.9rem',
                                                            fontWeight: 'bold',
                                                            padding: '6px 12px',
                                                            backgroundColor: type === 'today' ? '#28a745' : joursRestants === 1 ? '#ffc107' : '#17a2b8',
                                                            color: joursRestants === 1 ? '#000' : '#fff',
                                                            border: 'none'
                                                        }}
                                                    >
                                                        {message}
                                                    </Badge>
                                                    {!hideAge && agent.age_futur && (
                                                        <Badge 
                                                            color="secondary" 
                                                            className="ms-2"
                                                            style={{
                                                                fontSize: '0.85rem',
                                                                fontWeight: 'bold',
                                                                padding: '6px 12px',
                                                                backgroundColor: '#6c757d',
                                                                color: '#fff',
                                                                border: 'none'
                                                            }}
                                                        >
                                                            {agent.age_futur} ans
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </CardBody>
                                </Card>
                            </Col>
                        );
                    })}
                </Row>
            </ModalBody>
            <ModalFooter>
                <Button color="secondary" onClick={toggle}>
                    Fermer
                </Button>
            </ModalFooter>
        </Modal>
    );
};

export default BirthdaysDetailsModal;

