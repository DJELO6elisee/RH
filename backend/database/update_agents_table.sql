-- Script pour ajouter toutes les références aux petites tables dans la table agents
-- Ce script facilite les recherches en évitant les jointures multiples

-- =====================================================
-- AJOUT DES COLONNES MANQUANTES À LA TABLE AGENTS
-- =====================================================

-- Colonnes déjà présentes dans agents (à ne pas ajouter) :
-- id_civilite, id_situation_matrimoniale, id_nationalite, id_type_d_agent, id_ministere, id_entite_principale

-- Ajout des nouvelles colonnes pour les références
ALTER TABLE agents ADD COLUMN IF NOT EXISTS id_fonction INTEGER;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS id_pays INTEGER;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS id_categorie INTEGER;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS id_grade INTEGER;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS id_emploi INTEGER;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS id_echelon INTEGER;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS id_specialite INTEGER;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS id_langue INTEGER;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS id_niveau_langue INTEGER;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS id_motif_depart INTEGER;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS id_type_conge INTEGER;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS id_autre_absence INTEGER;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS id_distinction INTEGER;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS id_type_etablissement INTEGER;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS id_unite_administrative INTEGER;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS id_diplome INTEGER;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS id_type_materiel INTEGER;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS id_type_destination INTEGER;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS id_nature_accident INTEGER;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS id_sanction INTEGER;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS id_sindicat INTEGER;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS id_type_courrier INTEGER;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS id_nature_acte INTEGER;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS id_localite INTEGER;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS id_mode_entree INTEGER;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS id_position INTEGER;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS id_pathologie INTEGER;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS id_handicap INTEGER;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS id_niveau_informatique INTEGER;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS id_logiciel INTEGER;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS id_type_retraite INTEGER;

-- =====================================================
-- AJOUT DES CONTRAINTES DE CLÉS ÉTRANGÈRES
-- =====================================================

-- Contraintes pour les nouvelles colonnes
ALTER TABLE agents ADD CONSTRAINT fk_agents_id_fonction 
    FOREIGN KEY (id_fonction) REFERENCES fonctions(id) ON DELETE SET NULL;

ALTER TABLE agents ADD CONSTRAINT fk_agents_id_pays 
    FOREIGN KEY (id_pays) REFERENCES pays(id) ON DELETE SET NULL;

ALTER TABLE agents ADD CONSTRAINT fk_agents_id_categorie 
    FOREIGN KEY (id_categorie) REFERENCES categories(id) ON DELETE SET NULL;

ALTER TABLE agents ADD CONSTRAINT fk_agents_id_grade 
    FOREIGN KEY (id_grade) REFERENCES grades(id) ON DELETE SET NULL;

ALTER TABLE agents ADD CONSTRAINT fk_agents_id_emploi 
    FOREIGN KEY (id_emploi) REFERENCES emplois(id) ON DELETE SET NULL;

ALTER TABLE agents ADD CONSTRAINT fk_agents_id_echelon 
    FOREIGN KEY (id_echelon) REFERENCES echelons(id) ON DELETE SET NULL;

ALTER TABLE agents ADD CONSTRAINT fk_agents_id_specialite 
    FOREIGN KEY (id_specialite) REFERENCES specialites(id) ON DELETE SET NULL;

ALTER TABLE agents ADD CONSTRAINT fk_agents_id_langue 
    FOREIGN KEY (id_langue) REFERENCES langues(id) ON DELETE SET NULL;

ALTER TABLE agents ADD CONSTRAINT fk_agents_id_niveau_langue 
    FOREIGN KEY (id_niveau_langue) REFERENCES niveau_langues(id) ON DELETE SET NULL;

ALTER TABLE agents ADD CONSTRAINT fk_agents_id_motif_depart 
    FOREIGN KEY (id_motif_depart) REFERENCES motif_de_departs(id) ON DELETE SET NULL;

ALTER TABLE agents ADD CONSTRAINT fk_agents_id_type_conge 
    FOREIGN KEY (id_type_conge) REFERENCES type_de_conges(id) ON DELETE SET NULL;

ALTER TABLE agents ADD CONSTRAINT fk_agents_id_autre_absence 
    FOREIGN KEY (id_autre_absence) REFERENCES autre_absences(id) ON DELETE SET NULL;

ALTER TABLE agents ADD CONSTRAINT fk_agents_id_distinction 
    FOREIGN KEY (id_distinction) REFERENCES distinctions(id) ON DELETE SET NULL;

ALTER TABLE agents ADD CONSTRAINT fk_agents_id_type_etablissement 
    FOREIGN KEY (id_type_etablissement) REFERENCES type_etablissements(id) ON DELETE SET NULL;

ALTER TABLE agents ADD CONSTRAINT fk_agents_id_unite_administrative 
    FOREIGN KEY (id_unite_administrative) REFERENCES unite_administratives(id) ON DELETE SET NULL;

ALTER TABLE agents ADD CONSTRAINT fk_agents_id_diplome 
    FOREIGN KEY (id_diplome) REFERENCES diplomes(id) ON DELETE SET NULL;

ALTER TABLE agents ADD CONSTRAINT fk_agents_id_type_materiel 
    FOREIGN KEY (id_type_materiel) REFERENCES type_de_materiels(id) ON DELETE SET NULL;

ALTER TABLE agents ADD CONSTRAINT fk_agents_id_type_destination 
    FOREIGN KEY (id_type_destination) REFERENCES type_de_destinations(id) ON DELETE SET NULL;

ALTER TABLE agents ADD CONSTRAINT fk_agents_id_nature_accident 
    FOREIGN KEY (id_nature_accident) REFERENCES nature_d_accidents(id) ON DELETE SET NULL;

ALTER TABLE agents ADD CONSTRAINT fk_agents_id_sanction 
    FOREIGN KEY (id_sanction) REFERENCES sanctions(id) ON DELETE SET NULL;

ALTER TABLE agents ADD CONSTRAINT fk_agents_id_sindicat 
    FOREIGN KEY (id_sindicat) REFERENCES sindicats(id) ON DELETE SET NULL;

ALTER TABLE agents ADD CONSTRAINT fk_agents_id_type_courrier 
    FOREIGN KEY (id_type_courrier) REFERENCES type_de_couriers(id) ON DELETE SET NULL;

ALTER TABLE agents ADD CONSTRAINT fk_agents_id_nature_acte 
    FOREIGN KEY (id_nature_acte) REFERENCES nature_actes(id) ON DELETE SET NULL;

ALTER TABLE agents ADD CONSTRAINT fk_agents_id_localite 
    FOREIGN KEY (id_localite) REFERENCES localites(id) ON DELETE SET NULL;

ALTER TABLE agents ADD CONSTRAINT fk_agents_id_mode_entree 
    FOREIGN KEY (id_mode_entree) REFERENCES mode_d_entrees(id) ON DELETE SET NULL;

ALTER TABLE agents ADD CONSTRAINT fk_agents_id_position 
    FOREIGN KEY (id_position) REFERENCES positions(id) ON DELETE SET NULL;

ALTER TABLE agents ADD CONSTRAINT fk_agents_id_pathologie 
    FOREIGN KEY (id_pathologie) REFERENCES pathologies(id) ON DELETE SET NULL;

ALTER TABLE agents ADD CONSTRAINT fk_agents_id_handicap 
    FOREIGN KEY (id_handicap) REFERENCES handicaps(id) ON DELETE SET NULL;

ALTER TABLE agents ADD CONSTRAINT fk_agents_id_niveau_informatique 
    FOREIGN KEY (id_niveau_informatique) REFERENCES niveau_informatiques(id) ON DELETE SET NULL;

ALTER TABLE agents ADD CONSTRAINT fk_agents_id_logiciel 
    FOREIGN KEY (id_logiciel) REFERENCES logiciels(id) ON DELETE SET NULL;

ALTER TABLE agents ADD CONSTRAINT fk_agents_id_type_retraite 
    FOREIGN KEY (id_type_retraite) REFERENCES type_de_retraites(id) ON DELETE SET NULL;

-- =====================================================
-- CRÉATION DES INDEX POUR OPTIMISER LES RECHERCHES
-- =====================================================

-- Index pour les nouvelles colonnes de référence
CREATE INDEX IF NOT EXISTS idx_agents_id_fonction ON agents(id_fonction);
CREATE INDEX IF NOT EXISTS idx_agents_id_pays ON agents(id_pays);
CREATE INDEX IF NOT EXISTS idx_agents_id_categorie ON agents(id_categorie);
CREATE INDEX IF NOT EXISTS idx_agents_id_grade ON agents(id_grade);
CREATE INDEX IF NOT EXISTS idx_agents_id_emploi ON agents(id_emploi);
CREATE INDEX IF NOT EXISTS idx_agents_id_echelon ON agents(id_echelon);
CREATE INDEX IF NOT EXISTS idx_agents_id_specialite ON agents(id_specialite);
CREATE INDEX IF NOT EXISTS idx_agents_id_langue ON agents(id_langue);
CREATE INDEX IF NOT EXISTS idx_agents_id_niveau_langue ON agents(id_niveau_langue);
CREATE INDEX IF NOT EXISTS idx_agents_id_motif_depart ON agents(id_motif_depart);
CREATE INDEX IF NOT EXISTS idx_agents_id_type_conge ON agents(id_type_conge);
CREATE INDEX IF NOT EXISTS idx_agents_id_autre_absence ON agents(id_autre_absence);
CREATE INDEX IF NOT EXISTS idx_agents_id_distinction ON agents(id_distinction);
CREATE INDEX IF NOT EXISTS idx_agents_id_type_etablissement ON agents(id_type_etablissement);
CREATE INDEX IF NOT EXISTS idx_agents_id_unite_administrative ON agents(id_unite_administrative);
CREATE INDEX IF NOT EXISTS idx_agents_id_diplome ON agents(id_diplome);
CREATE INDEX IF NOT EXISTS idx_agents_id_type_materiel ON agents(id_type_materiel);
CREATE INDEX IF NOT EXISTS idx_agents_id_type_destination ON agents(id_type_destination);
CREATE INDEX IF NOT EXISTS idx_agents_id_nature_accident ON agents(id_nature_accident);
CREATE INDEX IF NOT EXISTS idx_agents_id_sanction ON agents(id_sanction);
CREATE INDEX IF NOT EXISTS idx_agents_id_sindicat ON agents(id_sindicat);
CREATE INDEX IF NOT EXISTS idx_agents_id_type_courrier ON agents(id_type_courrier);
CREATE INDEX IF NOT EXISTS idx_agents_id_nature_acte ON agents(id_nature_acte);
CREATE INDEX IF NOT EXISTS idx_agents_id_localite ON agents(id_localite);
CREATE INDEX IF NOT EXISTS idx_agents_id_mode_entree ON agents(id_mode_entree);
CREATE INDEX IF NOT EXISTS idx_agents_id_position ON agents(id_position);
CREATE INDEX IF NOT EXISTS idx_agents_id_pathologie ON agents(id_pathologie);
CREATE INDEX IF NOT EXISTS idx_agents_id_handicap ON agents(id_handicap);
CREATE INDEX IF NOT EXISTS idx_agents_id_niveau_informatique ON agents(id_niveau_informatique);
CREATE INDEX IF NOT EXISTS idx_agents_id_logiciel ON agents(id_logiciel);
CREATE INDEX IF NOT EXISTS idx_agents_id_type_retraite ON agents(id_type_retraite);

-- =====================================================
-- COMMENTAIRES POUR DOCUMENTATION
-- =====================================================

-- Ajout de commentaires pour documenter les nouvelles colonnes
COMMENT ON COLUMN agents.id_fonction IS 'Référence vers la fonction de l''agent';
COMMENT ON COLUMN agents.id_pays IS 'Référence vers le pays de l''agent';
COMMENT ON COLUMN agents.id_categorie IS 'Référence vers la catégorie de l''agent';
COMMENT ON COLUMN agents.id_grade IS 'Référence vers le grade de l''agent';
COMMENT ON COLUMN agents.id_emploi IS 'Référence vers l''emploi de l''agent';
COMMENT ON COLUMN agents.id_echelon IS 'Référence vers l''échelon de l''agent';
COMMENT ON COLUMN agents.id_specialite IS 'Référence vers la spécialité de l''agent';
COMMENT ON COLUMN agents.id_langue IS 'Référence vers la langue de l''agent';
COMMENT ON COLUMN agents.id_niveau_langue IS 'Référence vers le niveau de langue de l''agent';
COMMENT ON COLUMN agents.id_motif_depart IS 'Référence vers le motif de départ de l''agent';
COMMENT ON COLUMN agents.id_type_conge IS 'Référence vers le type de congé de l''agent';
COMMENT ON COLUMN agents.id_autre_absence IS 'Référence vers le type d''autre absence de l''agent';
COMMENT ON COLUMN agents.id_distinction IS 'Référence vers la distinction de l''agent';
COMMENT ON COLUMN agents.id_type_etablissement IS 'Référence vers le type d''établissement de l''agent';
COMMENT ON COLUMN agents.id_unite_administrative IS 'Référence vers l''unité administrative de l''agent';
COMMENT ON COLUMN agents.id_diplome IS 'Référence vers le diplôme de l''agent';
COMMENT ON COLUMN agents.id_type_materiel IS 'Référence vers le type de matériel de l''agent';
COMMENT ON COLUMN agents.id_type_destination IS 'Référence vers le type de destination de l''agent';
COMMENT ON COLUMN agents.id_nature_accident IS 'Référence vers la nature d''accident de l''agent';
COMMENT ON COLUMN agents.id_sanction IS 'Référence vers la sanction de l''agent';
COMMENT ON COLUMN agents.id_sindicat IS 'Référence vers le syndicat de l''agent';
COMMENT ON COLUMN agents.id_type_courrier IS 'Référence vers le type de courrier de l''agent';
COMMENT ON COLUMN agents.id_nature_acte IS 'Référence vers la nature d''acte de l''agent';
COMMENT ON COLUMN agents.id_localite IS 'Référence vers la localité de l''agent';
COMMENT ON COLUMN agents.id_mode_entree IS 'Référence vers le mode d''entrée de l''agent';
COMMENT ON COLUMN agents.id_position IS 'Référence vers la position de l''agent';
COMMENT ON COLUMN agents.id_pathologie IS 'Référence vers la pathologie de l''agent';
COMMENT ON COLUMN agents.id_handicap IS 'Référence vers le handicap de l''agent';
COMMENT ON COLUMN agents.id_niveau_informatique IS 'Référence vers le niveau informatique de l''agent';
COMMENT ON COLUMN agents.id_logiciel IS 'Référence vers le logiciel de l''agent';
COMMENT ON COLUMN agents.id_type_retraite IS 'Référence vers le type de retraite de l''agent';

-- =====================================================
-- SCRIPT TERMINÉ
-- =====================================================

-- Ce script ajoute 33 nouvelles colonnes de référence à la table agents
-- Toutes les contraintes de clés étrangères sont configurées avec ON DELETE SET NULL
-- Des index sont créés pour optimiser les performances des requêtes
-- Les colonnes sont documentées avec des commentaires explicatifs
