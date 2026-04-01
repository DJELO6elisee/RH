-- =====================================================
-- SCRIPT COMPLET : Tables Institutions Manquantes
-- =====================================================
-- Date : 4 Décembre 2024
-- Description : Crée toutes les tables nécessaires pour 
--               avoir les mêmes fonctionnalités que les ministères
-- =====================================================

-- ==========================================
-- 0. VÉRIFICATION ET CRÉATION DES TABLES PRÉALABLES
-- ==========================================

-- S'assurer que la table institutions existe
CREATE TABLE IF NOT EXISTS institutions (
    id SERIAL PRIMARY KEY,
    code VARCHAR(10) UNIQUE NOT NULL,
    nom VARCHAR(200) NOT NULL,
    sigle VARCHAR(20),
    description TEXT,
    adresse TEXT,
    telephone VARCHAR(20),
    email VARCHAR(255),
    website VARCHAR(255),
    logo_url VARCHAR(500),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- S'assurer que la table agents_institutions_main existe
CREATE TABLE IF NOT EXISTS agents_institutions_main (
    id SERIAL PRIMARY KEY,
    id_civilite INTEGER,
    id_situation_matrimoniale INTEGER,
    id_nationalite INTEGER,
    id_type_d_agent INTEGER,
    id_institution INTEGER REFERENCES institutions(id) ON DELETE SET NULL,
    id_entite_principale INTEGER,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100) NOT NULL,
    matricule VARCHAR(50) UNIQUE NOT NULL,
    date_de_naissance DATE,
    lieu_de_naissance VARCHAR(200),
    age INTEGER,
    telephone1 VARCHAR(20),
    telephone2 VARCHAR(20),
    sexe CHAR(1) CHECK (sexe IN ('M', 'F')),
    email VARCHAR(255),
    statut_emploi VARCHAR(20) DEFAULT 'actif',
    date_embauche DATE,
    date_fin_contrat DATE,
    id_direction INTEGER,
    retire BOOLEAN DEFAULT FALSE,
    id_grade INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- S'assurer que la table type_de_seminaire_de_formation_institutions existe
CREATE TABLE IF NOT EXISTS type_de_seminaire_de_formation_institutions (
    id SERIAL PRIMARY KEY,
    id_institution INTEGER REFERENCES institutions(id) ON DELETE CASCADE,
    libelle VARCHAR(200) NOT NULL,
    annee INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================
-- 1. TABLE DIRECTIONS INSTITUTIONS
-- ==========================================
CREATE TABLE IF NOT EXISTS directions_institutions (
    id SERIAL PRIMARY KEY,
    id_institution INTEGER REFERENCES institutions(id) ON DELETE CASCADE,
    libelle VARCHAR(200) NOT NULL,
    code VARCHAR(20),
    description TEXT,
    responsable_id INTEGER, -- Référence vers agents_institutions_main
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(id_institution, code)
);

COMMENT ON TABLE directions_institutions IS 'Directions des institutions (équivalent directions pour ministères)';
COMMENT ON COLUMN directions_institutions.responsable_id IS 'ID de l''agent responsable (directeur)';

CREATE INDEX IF NOT EXISTS idx_directions_institutions_institution ON directions_institutions(id_institution);
CREATE INDEX IF NOT EXISTS idx_directions_institutions_responsable ON directions_institutions(responsable_id);

-- ==========================================
-- 2. TABLE SOUS-DIRECTIONS INSTITUTIONS
-- ==========================================
CREATE TABLE IF NOT EXISTS sous_directions_institutions (
    id SERIAL PRIMARY KEY,
    id_institution INTEGER REFERENCES institutions(id) ON DELETE CASCADE,
    id_direction INTEGER REFERENCES directions_institutions(id) ON DELETE CASCADE,
    libelle VARCHAR(200) NOT NULL,
    code VARCHAR(20),
    description TEXT,
    responsable_id INTEGER, -- Référence vers agents_institutions_main
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(id_direction, code)
);

COMMENT ON TABLE sous_directions_institutions IS 'Sous-directions des institutions';
COMMENT ON COLUMN sous_directions_institutions.responsable_id IS 'ID de l''agent responsable (sous-directeur)';

CREATE INDEX IF NOT EXISTS idx_sous_directions_institutions_institution ON sous_directions_institutions(id_institution);
CREATE INDEX IF NOT EXISTS idx_sous_directions_institutions_direction ON sous_directions_institutions(id_direction);
CREATE INDEX IF NOT EXISTS idx_sous_directions_institutions_responsable ON sous_directions_institutions(responsable_id);

-- ==========================================
-- 3. TABLE CONGÉS INSTITUTIONS
-- ==========================================
CREATE TABLE IF NOT EXISTS agent_conges_institutions (
    id SERIAL PRIMARY KEY,
    id_agent INTEGER NOT NULL, -- Référence vers agents_institutions_main(id)
    annee INTEGER NOT NULL,
    jours_alloues INTEGER DEFAULT 30,
    jours_pris INTEGER DEFAULT 0,
    jours_restants INTEGER DEFAULT 30,
    jours_reportes INTEGER DEFAULT 0,
    dette_annee_suivante INTEGER DEFAULT 0,
    commentaires TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(id_agent, annee)
);

COMMENT ON TABLE agent_conges_institutions IS 'Gestion des congés des agents d''institutions';
COMMENT ON COLUMN agent_conges_institutions.jours_alloues IS 'Nombre de jours de congés alloués pour l''année';
COMMENT ON COLUMN agent_conges_institutions.jours_pris IS 'Nombre de jours déjà pris';
COMMENT ON COLUMN agent_conges_institutions.jours_restants IS 'Nombre de jours restants';
COMMENT ON COLUMN agent_conges_institutions.jours_reportes IS 'Jours reportés de l''année précédente';
COMMENT ON COLUMN agent_conges_institutions.dette_annee_suivante IS 'Dette à reporter sur l''année suivante (congés négatifs)';

CREATE INDEX IF NOT EXISTS idx_agent_conges_institutions_agent ON agent_conges_institutions(id_agent);
CREATE INDEX IF NOT EXISTS idx_agent_conges_institutions_annee ON agent_conges_institutions(annee);

-- ==========================================
-- 4. TABLE DEMANDES INSTITUTIONS
-- ==========================================
CREATE TABLE IF NOT EXISTS demandes_institutions (
    id SERIAL PRIMARY KEY,
    id_agent INTEGER NOT NULL, -- Référence vers agents_institutions_main(id)
    id_institution INTEGER REFERENCES institutions(id),
    type_demande VARCHAR(50) NOT NULL,
    description TEXT,
    date_debut DATE,
    date_fin DATE,
    nombre_jours INTEGER,
    lieu VARCHAR(255),
    status VARCHAR(20) DEFAULT 'en_attente',
    niveau_evolution_demande VARCHAR(30) DEFAULT 'soumis',
    
    -- Validateurs
    id_chef_service INTEGER,
    id_sous_directeur INTEGER,
    id_directeur INTEGER,
    id_drh INTEGER,
    id_president INTEGER, -- Pour les institutions (équivalent ministre)
    
    -- Statuts de validation
    statut_chef_service VARCHAR(20) DEFAULT 'en_attente',
    statut_sous_directeur VARCHAR(20) DEFAULT 'en_attente',
    statut_directeur VARCHAR(20) DEFAULT 'en_attente',
    statut_drh VARCHAR(20) DEFAULT 'en_attente',
    statut_president VARCHAR(20) DEFAULT 'en_attente',
    
    -- Dates de validation
    date_validation_chef_service TIMESTAMP,
    date_validation_sous_directeur TIMESTAMP,
    date_validation_directeur TIMESTAMP,
    date_validation_drh TIMESTAMP,
    date_validation_president TIMESTAMP,
    
    -- Commentaires
    commentaire_chef_service TEXT,
    commentaire_sous_directeur TEXT,
    commentaire_directeur TEXT,
    commentaire_drh TEXT,
    commentaire_president TEXT,
    
    -- Niveau actuel dans le workflow
    niveau_actuel VARCHAR(20) DEFAULT 'chef_service',
    priorite VARCHAR(20) DEFAULT 'normale',
    phase VARCHAR(20) DEFAULT 'aller',
    
    -- Documents joints
    documents_joints JSONB,
    
    -- Traçabilité
    created_by INTEGER,
    updated_by INTEGER,
    date_creation TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date_modification TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Spécifique congés
    motif_conge VARCHAR(100),
    raison_exceptionnelle TEXT,
    jours_restants_avant_deduction INTEGER,
    jours_restants_apres_deduction INTEGER,
    solde_negatif INTEGER DEFAULT 0,
    
    -- Spécifique missions
    pays_destination VARCHAR(100),
    ville_destination VARCHAR(100),
    objet_mission TEXT
);

COMMENT ON TABLE demandes_institutions IS 'Demandes des agents d''institutions (congés, autorisations, missions, etc.)';
COMMENT ON COLUMN demandes_institutions.type_demande IS 'Type: conge, autorisation_absence, sortie_territoire, mission, etc.';
COMMENT ON COLUMN demandes_institutions.status IS 'Status global: en_attente, validee, rejetee, annulee';
COMMENT ON COLUMN demandes_institutions.niveau_actuel IS 'Niveau actuel de validation: chef_service, sous_directeur, directeur, drh, president';
COMMENT ON COLUMN demandes_institutions.phase IS 'Phase du workflow: aller (validation) ou retour (après validation finale)';

CREATE INDEX IF NOT EXISTS idx_demandes_institutions_agent ON demandes_institutions(id_agent);
CREATE INDEX IF NOT EXISTS idx_demandes_institutions_institution ON demandes_institutions(id_institution);
CREATE INDEX IF NOT EXISTS idx_demandes_institutions_type ON demandes_institutions(type_demande);
CREATE INDEX IF NOT EXISTS idx_demandes_institutions_status ON demandes_institutions(status);
CREATE INDEX IF NOT EXISTS idx_demandes_institutions_niveau ON demandes_institutions(niveau_actuel);
CREATE INDEX IF NOT EXISTS idx_demandes_institutions_dates ON demandes_institutions(date_debut, date_fin);

-- ==========================================
-- 5. TABLE PLANNING PRÉVISIONNEL INSTITUTIONS
-- ==========================================
CREATE TABLE IF NOT EXISTS planning_previsionnel_institutions (
    id SERIAL PRIMARY KEY,
    id_agent INTEGER NOT NULL, -- Référence vers agents_institutions_main(id)
    id_institution INTEGER REFERENCES institutions(id),
    annee INTEGER NOT NULL,
    trimestre INTEGER CHECK (trimestre BETWEEN 1 AND 4),
    mois INTEGER CHECK (mois BETWEEN 1 AND 12),
    date_debut_prevue DATE,
    date_fin_prevue DATE,
    nombre_jours_prevus INTEGER,
    type_conge VARCHAR(50) DEFAULT 'conge_annuel',
    statut VARCHAR(20) DEFAULT 'previsionnel',
    commentaires TEXT,
    valide_par INTEGER, -- Référence vers utilisateur qui a validé
    date_validation TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE planning_previsionnel_institutions IS 'Planning prévisionnel des congés des agents d''institutions';
COMMENT ON COLUMN planning_previsionnel_institutions.statut IS 'previsionnel, valide, realise, annule';
COMMENT ON COLUMN planning_previsionnel_institutions.type_conge IS 'conge_annuel, conge_maladie, conge_maternite, etc.';

CREATE INDEX IF NOT EXISTS idx_planning_prev_institutions_agent ON planning_previsionnel_institutions(id_agent);
CREATE INDEX IF NOT EXISTS idx_planning_prev_institutions_institution ON planning_previsionnel_institutions(id_institution);
CREATE INDEX IF NOT EXISTS idx_planning_prev_institutions_annee ON planning_previsionnel_institutions(annee);
CREATE INDEX IF NOT EXISTS idx_planning_prev_institutions_dates ON planning_previsionnel_institutions(date_debut_prevue, date_fin_prevue);

-- ==========================================
-- 6. TABLE SÉMINAIRES/FORMATIONS INSTITUTIONS
-- ==========================================
CREATE TABLE IF NOT EXISTS seminaire_formation_institutions (
    id SERIAL PRIMARY KEY,
    id_institution INTEGER REFERENCES institutions(id),
    id_type_seminaire INTEGER, -- Référence vers type_de_seminaire_de_formation_institutions(id)
    titre VARCHAR(200) NOT NULL,
    description TEXT,
    objectifs TEXT,
    lieu VARCHAR(200),
    date_debut DATE,
    date_fin DATE,
    duree_jours INTEGER,
    nombre_participants_max INTEGER,
    nombre_participants_inscrits INTEGER DEFAULT 0,
    formateur VARCHAR(200),
    organisme_formateur VARCHAR(200),
    cout_total DECIMAL(12,2),
    cout_par_participant DECIMAL(12,2),
    statut VARCHAR(20) DEFAULT 'planifie',
    documents_joints JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE seminaire_formation_institutions IS 'Séminaires et formations pour agents d''institutions';
COMMENT ON COLUMN seminaire_formation_institutions.statut IS 'planifie, en_cours, termine, annule';

CREATE INDEX IF NOT EXISTS idx_seminaire_institutions_institution ON seminaire_formation_institutions(id_institution);
CREATE INDEX IF NOT EXISTS idx_seminaire_institutions_type ON seminaire_formation_institutions(id_type_seminaire);
CREATE INDEX IF NOT EXISTS idx_seminaire_institutions_dates ON seminaire_formation_institutions(date_debut, date_fin);

-- ==========================================
-- 7. TABLE PARTICIPANTS SÉMINAIRES INSTITUTIONS
-- ==========================================
CREATE TABLE IF NOT EXISTS seminaire_participants_institutions (
    id SERIAL PRIMARY KEY,
    id_seminaire INTEGER REFERENCES seminaire_formation_institutions(id) ON DELETE CASCADE,
    id_agent INTEGER NOT NULL, -- Référence vers agents_institutions_main(id)
    statut_participation VARCHAR(20) DEFAULT 'inscrit',
    date_inscription TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    present BOOLEAN,
    note_evaluation DECIMAL(5,2),
    commentaires TEXT,
    certificat_obtenu BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(id_seminaire, id_agent)
);

COMMENT ON TABLE seminaire_participants_institutions IS 'Participation des agents aux séminaires/formations';
COMMENT ON COLUMN seminaire_participants_institutions.statut_participation IS 'inscrit, confirme, present, absent, annule';

CREATE INDEX IF NOT EXISTS idx_seminaire_part_institutions_seminaire ON seminaire_participants_institutions(id_seminaire);
CREATE INDEX IF NOT EXISTS idx_seminaire_part_institutions_agent ON seminaire_participants_institutions(id_agent);

-- ==========================================
-- 8. TABLE DÉCISIONS ADMINISTRATIVES INSTITUTIONS
-- ==========================================
CREATE TABLE IF NOT EXISTS decisions_institutions (
    id SERIAL PRIMARY KEY,
    id_institution INTEGER REFERENCES institutions(id),
    id_agent INTEGER, -- Référence vers agents_institutions_main(id) - Agent concerné
    numero_decision VARCHAR(50) UNIQUE NOT NULL,
    type_decision VARCHAR(50) NOT NULL,
    objet TEXT NOT NULL,
    date_decision DATE NOT NULL,
    date_effet DATE,
    signataire VARCHAR(200),
    contenu TEXT,
    fichier_url VARCHAR(500),
    statut VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE decisions_institutions IS 'Décisions administratives concernant les agents d''institutions';
COMMENT ON COLUMN decisions_institutions.type_decision IS 'nomination, affectation, promotion, sanction, etc.';
COMMENT ON COLUMN decisions_institutions.statut IS 'active, annulee, suspendue';

CREATE INDEX IF NOT EXISTS idx_decisions_institutions_institution ON decisions_institutions(id_institution);
CREATE INDEX IF NOT EXISTS idx_decisions_institutions_agent ON decisions_institutions(id_agent);
CREATE INDEX IF NOT EXISTS idx_decisions_institutions_type ON decisions_institutions(type_decision);
CREATE INDEX IF NOT EXISTS idx_decisions_institutions_numero ON decisions_institutions(numero_decision);

-- ==========================================
-- 9. VUES UTILES
-- ==========================================

-- Vue pour les agents avec leurs congés de l'année en cours
CREATE OR REPLACE VIEW v_agents_conges_institutions AS
SELECT 
    a.id as agent_id,
    a.nom,
    a.prenom,
    a.matricule,
    a.id_institution,
    i.nom as institution_nom,
    ac.annee,
    ac.jours_alloues,
    ac.jours_pris,
    ac.jours_restants,
    ac.jours_reportes
FROM agents_institutions_main a
LEFT JOIN institutions i ON a.id_institution = i.id
LEFT JOIN agent_conges_institutions ac ON a.id = ac.id_agent 
    AND ac.annee = EXTRACT(YEAR FROM CURRENT_DATE);

COMMENT ON VIEW v_agents_conges_institutions IS 'Vue simplifiée des agents avec leurs congés de l''année en cours';

-- Vue pour les demandes en attente par institution
CREATE OR REPLACE VIEW v_demandes_en_attente_institutions AS
SELECT 
    d.id,
    d.id_agent,
    a.nom as agent_nom,
    a.prenom as agent_prenom,
    a.matricule as agent_matricule,
    d.id_institution,
    i.nom as institution_nom,
    d.type_demande,
    d.date_debut,
    d.date_fin,
    d.nombre_jours,
    d.status,
    d.niveau_actuel,
    d.date_creation
FROM demandes_institutions d
JOIN agents_institutions_main a ON d.id_agent = a.id
LEFT JOIN institutions i ON d.id_institution = i.id
WHERE d.status = 'en_attente'
ORDER BY d.date_creation DESC;

COMMENT ON VIEW v_demandes_en_attente_institutions IS 'Vue des demandes en attente pour suivi facile';

-- ==========================================
-- 10. FONCTIONS UTILES
-- ==========================================

-- Fonction pour initialiser les congés d'un agent
CREATE OR REPLACE FUNCTION init_conges_agent_institution(p_agent_id INTEGER, p_annee INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE))
RETURNS VOID AS $$
BEGIN
    INSERT INTO agent_conges_institutions (id_agent, annee, jours_alloues, jours_pris, jours_restants)
    VALUES (p_agent_id, p_annee, 30, 0, 30)
    ON CONFLICT (id_agent, annee) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION init_conges_agent_institution IS 'Initialise les congés d''un agent pour une année donnée';

-- Fonction pour calculer les jours ouvrés entre deux dates
CREATE OR REPLACE FUNCTION calculer_jours_ouvres_institutions(p_date_debut DATE, p_date_fin DATE)
RETURNS INTEGER AS $$
DECLARE
    v_jours INTEGER := 0;
    v_date_courante DATE;
BEGIN
    v_date_courante := p_date_debut;
    
    WHILE v_date_courante <= p_date_fin LOOP
        -- Compter seulement les jours de semaine (lundi à vendredi)
        IF EXTRACT(DOW FROM v_date_courante) BETWEEN 1 AND 5 THEN
            v_jours := v_jours + 1;
        END IF;
        
        v_date_courante := v_date_courante + 1;
    END LOOP;
    
    RETURN v_jours;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculer_jours_ouvres_institutions IS 'Calcule le nombre de jours ouvrés entre deux dates (exclut samedi/dimanche)';

-- ==========================================
-- 11. TRIGGERS
-- ==========================================

-- Trigger pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Appliquer le trigger sur toutes les tables (avec DROP si existe déjà)
-- Note: Utilisation de EXECUTE PROCEDURE pour compatibilité avec toutes les versions de PostgreSQL
DROP TRIGGER IF EXISTS update_directions_institutions_updated_at ON directions_institutions;
CREATE TRIGGER update_directions_institutions_updated_at
    BEFORE UPDATE ON directions_institutions
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_sous_directions_institutions_updated_at ON sous_directions_institutions;
CREATE TRIGGER update_sous_directions_institutions_updated_at
    BEFORE UPDATE ON sous_directions_institutions
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_agent_conges_institutions_updated_at ON agent_conges_institutions;
CREATE TRIGGER update_agent_conges_institutions_updated_at
    BEFORE UPDATE ON agent_conges_institutions
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_demandes_institutions_updated_at ON demandes_institutions;
CREATE TRIGGER update_demandes_institutions_updated_at
    BEFORE UPDATE ON demandes_institutions
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_planning_previsionnel_institutions_updated_at ON planning_previsionnel_institutions;
CREATE TRIGGER update_planning_previsionnel_institutions_updated_at
    BEFORE UPDATE ON planning_previsionnel_institutions
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_seminaire_formation_institutions_updated_at ON seminaire_formation_institutions;
CREATE TRIGGER update_seminaire_formation_institutions_updated_at
    BEFORE UPDATE ON seminaire_formation_institutions
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

DROP TRIGGER IF EXISTS update_decisions_institutions_updated_at ON decisions_institutions;
CREATE TRIGGER update_decisions_institutions_updated_at
    BEFORE UPDATE ON decisions_institutions
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ==========================================
-- 12. CONTRAINTES DE CLÉS ÉTRANGÈRES
-- ==========================================

-- Ajouter la contrainte FK pour seminaire_formation_institutions si elle n'existe pas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'fk_seminaire_formation_type'
    ) THEN
        ALTER TABLE seminaire_formation_institutions 
        ADD CONSTRAINT fk_seminaire_formation_type 
        FOREIGN KEY (id_type_seminaire) 
        REFERENCES type_de_seminaire_de_formation_institutions(id) 
        ON DELETE SET NULL;
    END IF;
END $$;

-- ==========================================
-- 13. DONNÉES DE TEST (OPTIONNEL)
-- ==========================================

-- Exemple: Initialiser les congés pour tous les agents de l'institution CEI
-- SELECT init_conges_agent_institution(id, EXTRACT(YEAR FROM CURRENT_DATE))
-- FROM agents_institutions_main
-- WHERE id_institution = 1;

-- =====================================================
-- FIN DU SCRIPT
-- =====================================================

-- Afficher un message de succès
DO $$
BEGIN
    RAISE NOTICE '✅ Toutes les tables institutions ont été créées avec succès!';
    RAISE NOTICE '📊 Tables créées:';
    RAISE NOTICE '   - directions_institutions';
    RAISE NOTICE '   - sous_directions_institutions';
    RAISE NOTICE '   - agent_conges_institutions';
    RAISE NOTICE '   - demandes_institutions';
    RAISE NOTICE '   - planning_previsionnel_institutions';
    RAISE NOTICE '   - seminaire_formation_institutions';
    RAISE NOTICE '   - seminaire_participants_institutions';
    RAISE NOTICE '   - decisions_institutions';
    RAISE NOTICE '✅ Vues et fonctions utilitaires créées';
    RAISE NOTICE '✅ Triggers mis en place';
    RAISE NOTICE '';
    RAISE NOTICE '🚀 Les institutions disposent maintenant de toutes les fonctionnalités!';
END $$;

