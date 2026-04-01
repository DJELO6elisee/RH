import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Input } from 'reactstrap';

const SearchableSelect = ({
    id,
    value,
    onChange,
    options = [],
    placeholder = "Rechercher et sélectionner...",
    invalid = false,
    disabled = false,
    className = ""
}) => {
    // Log pour la direction lors du rendu
    useEffect(() => {
        if (id === 'id_direction') {
            console.log(`🔄 SearchableSelect ${id} - Rendu avec:`, {
                value: value,
                valueType: typeof value,
                optionsCount: options.length,
                hasOptions: options && options.length > 0,
                firstFewOptions: options.slice(0, 3).map(opt => ({
                    id: typeof opt === 'object' ? opt.id : opt,
                    label: typeof opt === 'object' ? opt.label : opt
                }))
            });
        }
    }, [id, value, options]);
    
    // Fonction utilitaire pour obtenir une chaîne valide à partir d'une option
    const getOptionLabel = (option) => {
        if (typeof option === 'string' || typeof option === 'number') {
            return String(option);
        }
        if (typeof option === 'object' && option !== null) {
            if (option.label && typeof option.label === 'string') {
                return option.label;
            }
            if (option.name && typeof option.name === 'string') {
                return option.name;
            }
            if (option.nom && typeof option.nom === 'string') {
                return option.nom;
            }
            if (option.libelle && typeof option.libelle === 'string') {
                return option.libelle;
            }
            if (option.id !== undefined) {
                return String(option.id);
            }
            return JSON.stringify(option);
        }
        return String(option);
    };
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredOptions, setFilteredOptions] = useState(options);
    const [selectedOption, setSelectedOption] = useState(null);
    const dropdownRef = useRef(null);
    const inputRef = useRef(null);



    // Filtrer les options basées sur le terme de recherche
    useEffect(() => {
        if (searchTerm) {
            const filtered = options.filter(option => {
                const label = getOptionLabel(option);
                return label.toLowerCase().includes(searchTerm.toLowerCase());
            });
            setFilteredOptions(filtered);
        } else {
            setFilteredOptions(options);
        }
    }, [searchTerm, options]);

    
    // Trouver l'option sélectionnée basée sur la valeur
    useEffect(() => {
        if (value !== null && value !== undefined && value !== '' && options && options.length > 0) {
            const selected = options.find(option => {
                const optionValue = typeof option === 'object' ? option.id : option;
                // Comparaison robuste : convertir en string ET en nombre pour éviter les problèmes de type
                // Utiliser == au lieu de === pour permettre la conversion automatique de type
                const stringMatch = String(optionValue) === String(value);
                const numberMatch = !isNaN(Number(optionValue)) && !isNaN(Number(value)) && Number(optionValue) === Number(value);
                const looseMatch = optionValue == value; // == permet la conversion de type
                const matches = stringMatch || numberMatch || looseMatch;
                
                if (matches && id === 'id_direction') {
                    console.log(`✅ SearchableSelect ${id} - Option trouvée:`, {
                        value: value,
                        valueType: typeof value,
                        optionValue: optionValue,
                        optionValueType: typeof optionValue,
                        optionLabel: typeof option === 'object' ? option.label : option,
                        stringMatch: stringMatch,
                        numberMatch: numberMatch,
                        looseMatch: looseMatch
                    });
                }
                return matches;
            });
            
            if (selected) {
                setSelectedOption(selected);
                // Forcer une mise à jour du displayValue en déclenchant un re-render
                if (id === 'id_direction') {
                    console.log(`✅ SearchableSelect ${id} - selectedOption mis à jour avec:`, getOptionLabel(selected));
                }
            } else {
                // Si la valeur existe mais n'est pas trouvée, essayer une recherche plus approfondie
                if (id === 'id_direction') {
                    console.warn(`⚠️ SearchableSelect ${id} - Aucune option trouvée pour la valeur:`, {
                        value: value,
                        valueType: typeof value,
                        optionsCount: options.length,
                        firstFewOptions: options.slice(0, 5).map(opt => ({
                            id: typeof opt === 'object' ? opt.id : opt,
                            idType: typeof (typeof opt === 'object' ? opt.id : opt),
                            label: typeof opt === 'object' ? opt.label : opt
                        })),
                        allOptionIds: options.map(opt => {
                            const optId = typeof opt === 'object' ? opt.id : opt;
                            return `${optId} (${typeof optId})`;
                        }),
                        // Essayer de trouver avec différentes comparaisons
                        stringComparison: options.filter(opt => {
                            const optId = typeof opt === 'object' ? opt.id : opt;
                            return String(optId) === String(value);
                        }),
                        numberComparison: options.filter(opt => {
                            const optId = typeof opt === 'object' ? opt.id : opt;
                            return Number(optId) === Number(value);
                        })
                    });
                }
                setSelectedOption(null);
            }
        } else {
            // Si pas de valeur ou pas d'options, réinitialiser
            if (selectedOption !== null) {
                setSelectedOption(null);
            }
        }
    }, [value, options, id]);

    // Gérer le clic en dehors du dropdown
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
                setSearchTerm('');
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleInputClick = () => {
        setIsOpen(!isOpen);
        if (!isOpen) {
            // Focus sur l'input de recherche quand on ouvre
            setTimeout(() => {
                if (inputRef.current) {
                    inputRef.current.focus();
                }
            }, 100);
        }
    };

    const handleOptionSelect = (option) => {
        const optionValue = typeof option === 'object' ? option.id : option;
        const optionLabel = typeof option === 'object' ? option.label : option;
        
        if (typeof onChange === 'function') {
            onChange(optionValue);
        } else {
            console.error(`❌ SearchableSelect ${id} - onChange n'est pas une fonction:`, typeof onChange);
        }
        
        setSelectedOption(option);
        setIsOpen(false);
        setSearchTerm('');
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            setIsOpen(false);
            setSearchTerm('');
        } else if (e.key === 'Enter' && filteredOptions.length > 0) {
            e.preventDefault();
            handleOptionSelect(filteredOptions[0]);
        }
    };

    // Calculer la valeur d'affichage - utiliser useMemo pour recalculer quand selectedOption, value ou options changent
    const displayValue = useMemo(() => {
        // Priorité 1: Utiliser selectedOption si disponible
        if (selectedOption) {
            const label = getOptionLabel(selectedOption);
            if (id === 'id_direction') {
                console.log(`✅ SearchableSelect ${id} - Affichage depuis selectedOption:`, label);
            }
            return label;
        }
        
        // Priorité 2: Si pas d'option trouvée mais qu'on a une valeur et des options, essayer de la trouver
        if (value !== null && value !== undefined && value !== '' && options && options.length > 0) {
            const found = options.find(option => {
                const optionValue = typeof option === 'object' ? option.id : option;
                // Utiliser la même logique de comparaison robuste que dans useEffect
                const stringMatch = String(optionValue) === String(value);
                const numberMatch = !isNaN(Number(optionValue)) && !isNaN(Number(value)) && Number(optionValue) === Number(value);
                const looseMatch = optionValue == value; // == permet la conversion de type
                const matches = stringMatch || numberMatch || looseMatch;
                
                if (matches && id === 'id_direction') {
                    console.log(`✅ SearchableSelect ${id} - Option trouvée dans displayValue (useMemo):`, {
                        value: value,
                        valueType: typeof value,
                        optionValue: optionValue,
                        optionValueType: typeof optionValue,
                        label: getOptionLabel(option),
                        stringMatch: stringMatch,
                        numberMatch: numberMatch,
                        looseMatch: looseMatch
                    });
                }
                return matches;
            });
            if (found) {
                const label = getOptionLabel(found);
                // Si on trouve l'option mais que selectedOption n'est pas défini, le définir
                if (!selectedOption && id === 'id_direction') {
                    console.log(`🔄 SearchableSelect ${id} - Option trouvée dans displayValue, mise à jour de selectedOption`);
                }
                return label;
            } else if (id === 'id_direction') {
                console.warn(`⚠️ SearchableSelect ${id} - Valeur non trouvée dans displayValue (useMemo):`, {
                    value: value,
                    valueType: typeof value,
                    optionsCount: options.length,
                    firstFewOptions: options.slice(0, 5).map(opt => ({
                        id: typeof opt === 'object' ? opt.id : opt,
                        idType: typeof (typeof opt === 'object' ? opt.id : opt),
                        label: typeof opt === 'object' ? opt.label : opt
                    }))
                });
            }
        }
        
        // Fallback : retourner la valeur brute seulement si c'est une chaîne de caractères
        return typeof value === 'string' ? value : '';
    }, [selectedOption, value, options, id]);
    

    return (
        <div className={`searchable-select ${className}`} ref={dropdownRef}>
            <Input
                ref={inputRef}
                type="text"
                id={id}
                value={isOpen ? searchTerm : displayValue}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClick={handleInputClick}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                invalid={invalid}
                disabled={disabled}
                readOnly={!isOpen}
                style={{
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    backgroundColor: disabled ? '#f8f9fa' : 'white'
                }}
            />
            
            {isOpen && (
                <div 
                    className="searchable-select-dropdown"
                    style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        backgroundColor: 'white',
                        border: '1px solid #ced4da',
                        borderTop: 'none',
                        borderRadius: '0 0 0.25rem 0.25rem',
                        maxHeight: '300px',
                        overflowY: 'auto',
                        zIndex: 1050,
                        boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)'
                    }}
                >
                    {filteredOptions.length > 0 ? (
                        filteredOptions.map((option, index) => {
                            const optionValue = typeof option === 'object' ? option.id : option;
                            const optionLabel = getOptionLabel(option);
                            const isSelected = optionValue == value;
                            
                            return (
                                <div
                                    key={optionValue}
                                    className="searchable-select-option"
                                    onClick={() => handleOptionSelect(option)}
                                    style={{
                                        padding: '0.5rem 0.75rem',
                                        cursor: 'pointer',
                                        backgroundColor: isSelected ? '#007bff' : 'transparent',
                                        color: isSelected ? 'white' : '#495057',
                                        borderBottom: index < filteredOptions.length - 1 ? '1px solid #e9ecef' : 'none'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (!isSelected) {
                                            e.target.style.backgroundColor = '#f8f9fa';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (!isSelected) {
                                            e.target.style.backgroundColor = 'transparent';
                                        }
                                    }}
                                >
                                    {optionLabel}
                                </div>
                            );
                        })
                    ) : (
                        <div 
                            style={{
                                padding: '0.5rem 0.75rem',
                                color: '#6c757d',
                                fontStyle: 'italic'
                            }}
                        >
                            {options.length === 0 ? 'Aucune donnée disponible' : 'Aucun résultat trouvé'}
                        </div>
                    )}
                </div>
            )}
            
            <style jsx>{`
                .searchable-select {
                    position: relative;
                }
                
                .searchable-select-dropdown::-webkit-scrollbar {
                    width: 6px;
                }
                
                .searchable-select-dropdown::-webkit-scrollbar-track {
                    background: #f1f1f1;
                }
                
                .searchable-select-dropdown::-webkit-scrollbar-thumb {
                    background: #c1c1c1;
                    border-radius: 3px;
                }
                
                .searchable-select-dropdown::-webkit-scrollbar-thumb:hover {
                    background: #a8a8a8;
                }
            `}</style>
        </div>
    );
};

export default SearchableSelect;
