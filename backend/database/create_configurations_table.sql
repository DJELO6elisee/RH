-- Script pour créer la table des configurations
-- =============================================

CREATE TABLE IF NOT EXISTS configurations (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL,
    value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertion des configurations par défaut
INSERT INTO configurations (key, value, description) VALUES
('theme_colors', '{"primary": "#6a82fb", "secondary": "#fc5c7d", "success": "#45b649", "danger": "#f85032", "warning": "#ffd700", "info": "#00c9ff"}', 'Couleurs du thème de l''application'),
('sidebar_disabled_tabs', '[]', 'Liste des IDs d''onglets désactivés dans la barre latérale'),
('template_attestation_presence', '{
    "body": "Je soussigné{validateurGenre}, <strong>{validateurNomComplet}</strong>, <strong>{validateurFonction}</strong>, atteste que {civilite} <strong>{prenoms} {nom}</strong>, <strong>{fonctionAvecService}</strong>, est en service dans ledit Ministère, depuis le <strong>{dateDebut}</strong>.",
    "footer": "En foi de quoi, la présente attestation lui est délivrée pour servir et valoir ce que de droit."
}', 'Template pour l''attestation de présence'),
('template_autorisation_absence', '{
    "body": "Une autorisation d''absence de <strong>{diffDays} jour{pluralS}</strong> valable du <strong>{dateDebut}</strong> au <strong>{dateFin}</strong> inclus est accordée à <strong>{fullWithCivilite}</strong> matricule <strong>{matricule}</strong>, <strong>{fonctionActuelle}</strong> en service à la <strong>{serviceNom}</strong> pour se rendre à <strong>{lieu}</strong>.",
    "motif_header": "Motif de l''absence :",
    "motif": "<strong>{description}</strong>"
}', 'Template pour l''autorisation d''absence'),
('template_autorisation_sortie_territoire', '{
    "body": "Le Ministre de l''Economie et des Finances autorise <strong>{fullWithCivilite}</strong> matricule <strong>{matricule}</strong>, <strong>{fonctionActuelle}</strong> en service à la <strong>{serviceNom}</strong> à se rendre en <strong>{lieu}</strong> du <strong>{dateDebut}</strong> au <strong>{dateFin}</strong>, pour ses congés annuels.",
    "footer": "En foi de quoi, la présente autorisation lui est délivrée pour servir et valoir ce que de droit."
}', 'Template pour l''autorisation de sortie du territoire'),
('template_certificat_cessation', '{
    "body": "Je soussigné{validateurGenre}, <strong>{validateurNomComplet}</strong>, <strong>{validateurFonction}</strong>, certifie que {civilite} <strong>{prenoms} {nom}</strong>, matricule <strong>{matricule}</strong>, <strong>{designationPoste}</strong>, a cessé le service à la <strong>{serviceNom}</strong> le <strong>{dateCessation}</strong>.",
    "motif_title": "MOTIF DE LA CESSATION",
    "reprise_text": "A l''issue de son congé, l''intéressé{interesseGenre} reprendra le service à son poste le <strong>{dateRepriseFormatee}</strong>."
}', 'Template pour le certificat de cessation de service'),
('template_certificat_non_jouissance_conge', '{
    "body": "Je soussigné{validateurGenre}, <strong>{validateurNomComplet}</strong>, <strong>{validateurFonction}</strong>, certifie que {civilite} <strong>{prenoms} {nom}</strong>, Matricule <strong>{matricule}</strong>, <strong>{designationPoste}</strong>, n''a pas jouie de ses congés annuels au titre de {anneeTexte}.",
    "footer": "En foi de quoi, le présent Certificat lui est délivré pour servir et valoir ce que de droit."
}', 'Template pour le certificat de non jouissance de congé'),
('template_certificat_reprise_service', '{
    "body": "<strong>{fullWithCivilite}</strong><br/>Matricule: <strong>{matricule}</strong><br/><strong>{fonctionActuelle}</strong><br/>{classeInfo}<br/>a repris le service à la <strong>{serviceNom}</strong> le <strong>{dateReprise}</strong>.",
    "motif_title": "MOTIF DE LA REPRISE DE SERVICE"
}', 'Template pour le certificat de reprise de service'),
('template_attestation_travail', '{
    "body": "Le Directeur soussigné(e), atteste que <strong>{fullWithCivilite}</strong>, matricule <strong>{matricule}</strong>, <strong>{poste}</strong>, {classeInfo}, à la <strong>{direction}</strong> travaille dans ledit Ministère depuis le <strong>{dateDebut}</strong> jusqu''à ce jour.",
    "footer": "En foi de quoi, la présente attestation lui est délivrée pour servir et valoir ce que de droit."
}', 'Template pour l''attestation de travail')
ON CONFLICT (key) DO NOTHING;
