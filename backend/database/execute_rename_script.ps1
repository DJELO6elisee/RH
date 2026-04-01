# Script PowerShell pour exécuter la migration de renommage services -> directions
# Assurez-vous que PostgreSQL est en cours d'exécution

Write-Host "🚀 Début de la migration services -> directions..." -ForegroundColor Green

# Configuration de la base de données (ajustez selon votre configuration)
$env:PGPASSWORD = "votre_mot_de_passe"
$env:PGUSER = "votre_utilisateur"
$env:PGDATABASE = "votre_base_de_donnees"
$env:PGHOST = "localhost"
$env:PGPORT = "5432"

# Chemin vers le script SQL
$sqlScript = "rename_services_to_directions.sql"

# Vérifier que le script existe
if (-not (Test-Path $sqlScript)) {
    Write-Host "❌ Erreur: Le fichier $sqlScript n'existe pas!" -ForegroundColor Red
    exit 1
}

Write-Host "📋 Exécution du script SQL: $sqlScript" -ForegroundColor Yellow

try {
    # Exécuter le script SQL
    psql -f $sqlScript
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Migration terminée avec succès!" -ForegroundColor Green
        Write-Host "📊 Table 'services' renommée en 'directions'" -ForegroundColor Cyan
        Write-Host "🔗 Colonne 'id_service' renommée en 'id_direction' dans la table 'agents'" -ForegroundColor Cyan
        Write-Host "🔧 Contraintes de clés étrangères mises à jour" -ForegroundColor Cyan
    } else {
        Write-Host "❌ Erreur lors de l'exécution du script SQL!" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Erreur: $_" -ForegroundColor Red
    exit 1
}

Write-Host "🎉 Migration terminée! Vous pouvez maintenant redémarrer votre backend." -ForegroundColor Green
