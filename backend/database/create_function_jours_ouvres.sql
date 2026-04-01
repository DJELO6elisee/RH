-- Fonction pour calculer le nombre de jours ouvrés entre deux dates
-- Exclut les weekends (samedi et dimanche) ET les jours fériés officiels

CREATE OR REPLACE FUNCTION calculer_jours_ouvres(date_debut DATE, date_fin DATE)
RETURNS INTEGER AS $$
DECLARE
    jour_courant DATE;
    jours_ouvres INTEGER := 0;
    jour_semaine INTEGER;
    est_ferie BOOLEAN;
BEGIN
    -- Valider les dates
    IF date_debut > date_fin THEN
        RAISE EXCEPTION 'La date de début doit être antérieure ou égale à la date de fin';
    END IF;
    
    jour_courant := date_debut;
    
    -- Parcourir chaque jour entre date_debut et date_fin (inclus)
    WHILE jour_courant <= date_fin LOOP
        -- Obtenir le jour de la semaine (0 = dimanche, 1 = lundi, ..., 6 = samedi)
        jour_semaine := EXTRACT(DOW FROM jour_courant)::INTEGER;
        
        -- Vérifier si c'est un jour ouvré (pas un weekend)
        IF jour_semaine != 0 AND jour_semaine != 6 THEN
            -- Vérifier si c'est un jour férié officiel
            SELECT EXISTS (
                SELECT 1 
                FROM jours_feries 
                WHERE date_feriee = jour_courant
            ) INTO est_ferie;
            
            -- Si ce n'est pas un jour férié, c'est un jour ouvré
            IF NOT est_ferie THEN
                -- C'est un jour ouvré (pas un weekend, pas un jour férié), on l'ajoute au compteur
                jours_ouvres := jours_ouvres + 1;
            END IF;
        END IF;
        
        -- Passer au jour suivant
        jour_courant := jour_courant + INTERVAL '1 day';
    END LOOP;
    
    RETURN jours_ouvres;
END;
$$ LANGUAGE plpgsql;

-- Commentaire sur la fonction
COMMENT ON FUNCTION calculer_jours_ouvres(DATE, DATE) IS 'Calcule le nombre de jours ouvrés (hors weekends : samedi et dimanche, ET hors jours fériés officiels) entre deux dates';

