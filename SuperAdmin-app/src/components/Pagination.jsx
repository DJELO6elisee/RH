import React from 'react';
import { Button, ButtonGroup } from 'reactstrap';

const Pagination = ({ 
    currentPage, 
    totalPages, 
    onPageChange, 
    showFirstLast = true,
    maxVisiblePages = 5 
}) => {
    // Calculer les pages à afficher
    const getVisiblePages = () => {
        const pages = [];
        
        if (totalPages <= maxVisiblePages) {
            // Si le nombre total de pages est inférieur ou égal au maximum visible
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            // Calculer le début et la fin de la plage visible
            let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
            let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
            
            // Ajuster le début si on est près de la fin
            if (endPage - startPage + 1 < maxVisiblePages) {
                startPage = Math.max(1, endPage - maxVisiblePages + 1);
            }
            
            for (let i = startPage; i <= endPage; i++) {
                pages.push(i);
            }
        }
        
        return pages;
    };

    const visiblePages = getVisiblePages();

    // Ne pas afficher la pagination s'il n'y a qu'une page
    if (totalPages <= 1) {
        return null;
    }

    return (
        <div className="d-flex justify-content-center align-items-center mt-4">
            <ButtonGroup>
                {/* Bouton "Premier" */}
                {showFirstLast && currentPage > 1 && (
                    <Button
                        color="outline-primary"
                        size="sm"
                        onClick={() => onPageChange(1)}
                        title="Première page"
                    >
                        ««
                    </Button>
                )}
                
                {/* Bouton "Précédent" */}
                {currentPage > 1 && (
                    <Button
                        color="outline-primary"
                        size="sm"
                        onClick={() => onPageChange(currentPage - 1)}
                        title="Page précédente"
                    >
                        ‹
                    </Button>
                )}
                
                {/* Pages numérotées */}
                {visiblePages.map((page) => (
                    <Button
                        key={page}
                        color={page === currentPage ? "primary" : "outline-primary"}
                        size="sm"
                        onClick={() => onPageChange(page)}
                        className={page === currentPage ? "fw-bold" : ""}
                    >
                        {page}
                    </Button>
                ))}
                
                {/* Bouton "Suivant" */}
                {currentPage < totalPages && (
                    <Button
                        color="outline-primary"
                        size="sm"
                        onClick={() => onPageChange(currentPage + 1)}
                        title="Page suivante"
                    >
                        ›
                    </Button>
                )}
                
                {/* Bouton "Dernier" */}
                {showFirstLast && currentPage < totalPages && (
                    <Button
                        color="outline-primary"
                        size="sm"
                        onClick={() => onPageChange(totalPages)}
                        title="Dernière page"
                    >
                        »»
                    </Button>
                )}
            </ButtonGroup>
        </div>
    );
};

export default Pagination;
