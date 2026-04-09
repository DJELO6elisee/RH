/**
 * Composant pour afficher les congés avec calcul dynamique garantie
 * Ce composant recalcule TOUJOURS jours_restants au moment du rendu
 * Version: 2025-01-22 - RECALCUL FORCÉ DIRECT
 */

import React from 'react';
import { Col, Card, CardHeader, CardTitle, CardBody, Row } from 'reactstrap';

// Log pour confirmer que le nouveau composant est chargé
console.log('🚨🚨🚨🚨🚨 CongesYearDisplay COMPOSANT CHARGÉ - Version FORCÉE v2.0 🚨🚨🚨🚨🚨');
console.log('🚨 RECALCUL DYNAMIQUE ACTIVÉ - jours_restants sera TOUJOURS recalculé');

/**
 * Composant pour afficher une année de congés avec recalcul dynamique
 */
export const CongesYearDisplay = ({ congesData, index, isCurrentYear = false }) => {
    // Log très visible à chaque rendu
    console.log('🎯🎯🎯 CongesYearDisplay RENDU avec données:', congesData);
    
    if (!congesData) {
        console.log('⚠️ CongesYearDisplay: congesData est null/undefined');
        return null;
    }
    
    // RECALCUL FORCÉ - Extraire les valeurs brutes et recalculer TOUJOURS
    // Ne JAMAIS utiliser congesData.jours_restants directement
    const jours_alloues_BRUT = congesData.jours_alloues;
    const jours_pris_BRUT = congesData.jours_pris;
    const jours_restants_BRUT_DB = congesData.jours_restants; // Valeur de la DB (à IGNORER)
    
    const jours_alloues = jours_alloues_BRUT !== null && jours_alloues_BRUT !== undefined 
        ? parseInt(jours_alloues_BRUT, 10) 
        : 30;
    const jours_pris = jours_pris_BRUT !== null && jours_pris_BRUT !== undefined 
        ? parseInt(jours_pris_BRUT, 10) 
        : 0;
    
    // RECALCUL DIRECT - Ne jamais utiliser congesData.jours_restants
    const jours_restants = Math.max(0, jours_alloues - jours_pris);
    
    // Log TOUJOURS pour 2023 (très visible)
    if (congesData.annee === 2023 || parseInt(congesData.annee, 10) === 2023) {
        console.log('🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨');
        console.log('🚨 ANNÉE 2023 DÉTECTÉE - RECALCUL FORCÉ');
        console.log('🚨 Données brutes reçues:', {
            annee: congesData.annee,
            jours_alloues_BRUT: jours_alloues_BRUT,
            jours_pris_BRUT: jours_pris_BRUT,
            jours_restants_BRUT_DB: jours_restants_BRUT_DB
        });
        console.log('🚨 Valeurs parsées:', {
            jours_alloues_PARSE: jours_alloues,
            jours_pris_PARSE: jours_pris
        });
        console.log('🚨 CALCUL FINAL:', `${jours_alloues} - ${jours_pris} = ${jours_restants}`);
        console.log('🚨 VALEUR AFFICHÉE:', jours_restants);
        console.log('🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨');
    }
    
    if (isCurrentYear) {
        // Affichage pour l'année en cours (4 cartes horizontales)
        return (
            <>
                <Col md="3">
                    <div className="text-center p-3 bg-info text-white rounded">
                        <h6 className="mb-1">Année</h6>
                        <h4 className="mb-0">{congesData.annee}</h4>
                    </div>
                </Col>
                <Col md="3">
                    <div className="text-center p-3 bg-success text-white rounded">
                        <h6 className="mb-1">Jours alloués</h6>
                        <h4 className="mb-0">{jours_alloues}</h4>
                        {congesData.jours_reportes > 0 && (
                            <small className="d-block mt-1">
                                (30 de base + {congesData.jours_reportes} reportés)
                            </small>
                        )}
                    </div>
                </Col>
                <Col md="3">
                    <div className="text-center p-3 bg-warning text-white rounded">
                        <h6 className="mb-1">Jours pris</h6>
                        <h4 className="mb-0">{jours_pris}</h4>
                    </div>
                </Col>
                <Col md="3">
                    <div className="text-center p-3 bg-primary text-white rounded" style={{ border: '2px solid #007bff' }}>
                        <h6 className="mb-1">Jours restants</h6>
                        <h2 className="mb-0" style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>
                            {jours_restants}
                        </h2>
                        <small className="d-block mt-1">jours ouvrés</small>
                    </div>
                </Col>
            </>
        );
    }
    
    // Affichage pour les années précédentes (carte)
    return (
        <Col md="6" className="mb-3">
            <Card className="h-100">
                <CardHeader style={{ backgroundColor: index === 0 ? '#ffc107' : '#17a2b8', color: 'white' }}>
                    <CardTitle className="mb-0 text-center">
                        Année {congesData.annee}
                    </CardTitle>
                </CardHeader>
                <CardBody>
                    <Row>
                        <Col xs="4" className="text-center">
                            <div>
                                <small className="text-muted d-block">Alloués</small>
                                <strong className="text-success">{jours_alloues}</strong>
                            </div>
                        </Col>
                        <Col xs="4" className="text-center">
                            <div>
                                <small className="text-muted d-block">Pris</small>
                                <strong className="text-warning">{jours_pris}</strong>
                            </div>
                        </Col>
                        <Col xs="4" className="text-center">
                            <div>
                                <small className="text-muted d-block">Restants</small>
                                <strong className="text-primary">
                                    {jours_restants}
                                </strong>
                            </div>
                        </Col>
                    </Row>
                </CardBody>
            </Card>
        </Col>
    );
};

