-- Ajout des nouveaux rôles
-- inspecteur_general, conseiller_technique, charge_d_etude, charge_de_mission,
-- chef_du_secretariat_particulier, directeur_service_exterieur

INSERT INTO public.roles (nom, description, permissions) VALUES
('inspecteur_general', 'Inspecteur général avec missions de contrôle et d''inspection', '{"inspection": true, "controle": true, "reports": true}'),
('conseiller_technique', 'Conseiller technique avec accès aux études et recommandations', '{"conseil": true, "reports": true, "documents": true}'),
('charge_d_etude', 'Chargé d''étude avec accès aux dossiers et analyses', '{"etudes": true, "documents": true, "profile": true}'),
('charge_de_mission', 'Chargé de mission avec accès aux missions et suivi', '{"missions": true, "documents": true, "profile": true}'),
('chef_du_secretariat_particulier', 'Chef du secrétariat particulier avec gestion du cabinet', '{"secretariat": true, "cabinet": true, "documents": true}'),
('directeur_service_exterieur', 'Directeur de service extérieur avec gestion des services déconcentrés', '{"service_exterieur": true, "direction": true, "reports": true, "validations": true}')
ON CONFLICT (nom) DO NOTHING;

-- Vérification des rôles ajoutés
SELECT id, nom, description, created_at
FROM public.roles
WHERE nom IN (
    'inspecteur_general',
    'conseiller_technique',
    'charge_d_etude',
    'charge_de_mission',
    'chef_du_secretariat_particulier',
    'directeur_service_exterieur'
)
ORDER BY id;
