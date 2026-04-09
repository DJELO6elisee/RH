import React, { useState, useEffect } from 'react';
import { Alert, Fade } from 'reactstrap';

const SuccessNotification = ({ message, isVisible, onClose, duration = 4000 }) => {
    const [show, setShow] = useState(false);

    useEffect(() => {
        if (isVisible) {
            setShow(true);
            const timer = setTimeout(() => {
                setShow(false);
                setTimeout(onClose, 300); // Délai pour l'animation de sortie
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [isVisible, duration, onClose]);

    if (!isVisible) return null;

    return (
        <div 
            style={{
                position: 'fixed',
                top: '20px',
                right: '20px',
                zIndex: 9999,
                minWidth: '350px',
                maxWidth: '500px'
            }}
        >
            <Fade in={show} timeout={300}>
                <Alert 
                    color="success" 
                    style={{
                        borderRadius: '12px',
                        border: 'none',
                        boxShadow: '0 8px 25px rgba(40, 167, 69, 0.3)',
                        padding: '20px',
                        margin: '0',
                        fontSize: '16px',
                        fontWeight: '500',
                        lineHeight: '1.5'
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div 
                            style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                backgroundColor: '#28a745',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                            }}
                        >
                            <svg 
                                width="20" 
                                height="20" 
                                viewBox="0 0 24 24" 
                                fill="none" 
                                style={{ color: 'white' }}
                            >
                                <path 
                                    d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" 
                                    fill="currentColor"
                                />
                            </svg>
                        </div>
                        <div style={{ flex: 1 }}>
                            <div style={{ 
                                fontWeight: '600', 
                                color: '#155724',
                                marginBottom: '4px',
                                fontSize: '18px'
                            }}>
                                ✅ Succès !
                            </div>
                            <div style={{ 
                                color: '#155724',
                                whiteSpace: 'pre-line'
                            }}>
                                {message}
                            </div>
                        </div>
                    </div>
                </Alert>
            </Fade>
        </div>
    );
};

export default SuccessNotification;
