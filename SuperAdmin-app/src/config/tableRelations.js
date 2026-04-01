// Configuration des relations entre tables pour les options dynamiques
export const tableRelations = {
    // Relations pour la table agents
    agents: {
        grade: { table: 'grades', field: 'libelle' },
        service: { table: 'services', field: 'libelle' },
        fonction: { table: 'fonctions', field: 'libelle' },
        ministere: { table: 'ministeres', field: 'libelle' },
        entite: { table: 'entites', field: 'libelle' }
    },

    // Relations pour la table services
    services: {
        ministere: { table: 'ministeres', field: 'libelle' },
        entite: { table: 'entites', field: 'libelle' },
        chefService: { table: 'agents', field: 'nom' }
    },

    // Relations pour la table entites
    entites: {
        parent: { table: 'entites', field: 'libelle' },
        ministere: { table: 'ministeres', field: 'libelle' }
    },

    // Relations pour la table emplois
    emplois: {
        grade: { table: 'grades', field: 'libelle' },
        fonction: { table: 'fonctions', field: 'libelle' }
    },

    // Relations pour la table fonctions
    fonctions: {
        grade: { table: 'grades', field: 'libelle' },
        service: { table: 'services', field: 'libelle' }
    }
};

// Fonction pour obtenir les relations d'une table
export const getTableRelations = (tableName) => {
    return tableRelations[tableName] || {};
};

// Fonction pour obtenir la configuration d'un champ spécifique
export const getFieldRelation = (tableName, fieldName) => {
    const relations = getTableRelations(tableName);
    return relations[fieldName] || null;
};
