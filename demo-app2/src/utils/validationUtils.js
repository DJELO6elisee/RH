/**
 * Utilitaires pour la validation des demandes
 * Gestion des permissions et de la hiérarchie
 */

/**
 * Vérifie si l'utilisateur peut valider une demande spécifique
 * @param {Object} demande - La demande à valider
 * @param {Object} user - L'utilisateur connecté
 * @returns {boolean} - true si l'utilisateur peut valider
 */
export const canUserValidateDemande = (demande, user) => {
    if (!demande || !user || !user.role) return false;

    const role = user.role.toLowerCase();
    const niveauEvolution = demande.niveau_evolution_demande;
    const typeDemande = demande.type_demande;

    // NOUVELLE HIÉRARCHIE SELON LES SPÉCIFICATIONS

    // Chef Service : peut valider les demandes au niveau 'soumis' (agents)
    if (role === 'chef_service') {
        return niveauEvolution === 'soumis';
    }

    // Sous-Directeur : peut valider les demandes des agents au niveau 'soumis'
    if (role === 'sous_directeur') {
        return niveauEvolution === 'soumis';
    }

    // Directeur : valide les demandes validées par le sous-directeur
    if (role === 'directeur') {
        return niveauEvolution === 'valide_par_sous_directeur';
    }

    // DRH : valide les demandes validées par le directeur et le chef de service
    if (role === 'drh') {
        return niveauEvolution === 'valide_par_directeur' ||
            niveauEvolution === 'valide_par_superieur';
    }

    // Directeur de Cabinet : valide les demandes des Directeurs Généraux et Directeurs Centraux
    if (role === 'dir_cabinet') {
        return niveauEvolution === 'valide_par_directeur_general';
    }

    // Chef de Cabinet : valide les demandes des Dir Cabinet et Chef de Cabinet
    if (role === 'chef_cabinet') {
        return niveauEvolution === 'valide_par_dir_cabinet' ||
            niveauEvolution === 'valide_par_chef_cabinet';
    }

    // Directeur Général : valide les demandes des Dir Cabinet et Chef de Cabinet
    if (role === 'directeur_general') {
        return niveauEvolution === 'valide_par_dir_cabinet' ||
            niveauEvolution === 'valide_par_chef_cabinet';
    }

    // Directeur Central : valide les demandes des Dir Cabinet et Chef de Cabinet
    if (role === 'directeur_central') {
        return niveauEvolution === 'valide_par_dir_cabinet' ||
            niveauEvolution === 'valide_par_chef_cabinet';
    }

    // Ministre : valide les demandes des Dir Cabinet et Chef de Cabinet
    if (role === 'ministre') {
        return niveauEvolution === 'valide_par_dir_cabinet' ||
            niveauEvolution === 'valide_par_chef_cabinet';
    }

    // Super Admin : peut tout valider
    if (role === 'super_admin') {
        return true;
    }

    return false;
};

/**
 * Vérifie si l'utilisateur peut voir la demande (même sans la valider)
 * @param {Object} demande - La demande
 * @param {Object} user - L'utilisateur connecté
 * @returns {boolean} - true si l'utilisateur peut voir la demande
 */
export const canUserViewDemande = (demande, user) => {
    if (!demande || !user || !user.role) return false;

    const role = user.role.toLowerCase();

    // Super Admin peut tout voir
    if (role === 'super_admin') return true;

    // Tous les rôles de validation peuvent voir les demandes
    const validationRoles = ['chef_service', 'sous_directeur', 'directeur', 'drh', 'dir_cabinet', 'ministre'];
    return validationRoles.includes(role);
};

/**
 * Retourne le mode d'accès pour une demande
 * @param {Object} demande - La demande
 * @param {Object} user - L'utilisateur connecté
 * @returns {string} - 'validate', 'readonly', ou 'none'
 */
export const getUserAccessMode = (demande, user) => {
    if (!demande || !user) return 'none';

    if (canUserValidateDemande(demande, user)) {
        return 'validate';
    }

    if (canUserViewDemande(demande, user)) {
        return 'readonly';
    }

    return 'none';
};

/**
 * Retourne un message explicatif sur le mode d'accès
 * @param {Object} demande - La demande
 * @param {Object} user - L'utilisateur connecté
 * @returns {string} - Message explicatif
 */
export const getAccessModeMessage = (demande, user) => {
    const mode = getUserAccessMode(demande, user);
    const role = user ? .role ? .toLowerCase();

    if (mode === 'validate') {
        return 'Vous pouvez valider ou rejeter cette demande';
    }

    if (mode === 'readonly') {
        if (role === 'chef_service' && demande.type_demande !== 'absence') {
            return 'Cette demande suit un circuit de validation direct au Directeur. Vous pouvez consulter son statut.';
        }

        if (role === 'sous_directeur') {
            return 'Les autorisations suivent un circuit de validation direct au Directeur. Vous pouvez consulter leur statut.';
        }

        return 'Vous pouvez consulter cette demande mais ne pouvez pas la valider';
    }

    return 'Vous n\'avez pas accès à cette demande';
};

/**
 * Retourne le badge approprié pour le mode d'accès
 * @param {string} mode - 'validate' ou 'readonly'
 * @returns {Object} - {icon, text, color}
 */
export const getAccessModeBadge = (mode) => {
    if (mode === 'validate') {
        return {
            icon: '✅',
            text: 'Validation',
            color: 'success'
        };
    }

    if (mode === 'readonly') {
        return {
            icon: '👁️',
            text: 'Consultation',
            color: 'info'
        };
    }

    return {
        icon: '🚫',
        text: 'Aucun accès',
        color: 'secondary'
    };
};

/**
 * Détermine si un rôle peut voir les demandes (pour afficher dans la liste)
 * @param {string} role - Le rôle de l'utilisateur
 * @returns {boolean}
 */
export const roleCanSeeDemandes = (role) => {
    if (!role) return false;
    const roleLower = role.toLowerCase();
    return ['chef_service', 'sous_directeur', 'directeur', 'drh', 'dir_cabinet', 'ministre', 'super_admin'].includes(roleLower);
};
