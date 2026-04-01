# Script PowerShell pour corriger la contrainte situation_militaire
# Assurez-vous que PostgreSQL est en cours d'exécution

Write-Host "🔧 Correction de la contrainte situation_militaire..." -ForegroundColor Green

# Configuration de la base de données (ajustez selon votre configuration)
$env:PGPASSWORD = "votre_mot_de_passe"
$env:PGUSER = "postgres"
$env:PGDATABASE = "rh_db"
$env:PGHOST = "localhost"
$env:PGPORT = "5432"

# Chemin vers le script SQL
$sqlScript = "database/fix_situation_militaire_constraint.sql"

# Vérifier que le script existe
if (-not (Test-Path $sqlScript)) {
    Write-Host "❌ Erreur: Le fichier $sqlScript n'existe pas!" -ForegroundColor Red
    exit 1
}

Write-Host "📋 Exécution du script SQL: $sqlScript" -ForegroundColor Yellow

try {
    # Exécuter le script SQL
    & "C:\Program Files\PostgreSQL\15\bin\psql.exe" -f $sqlScript
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Contrainte situation_militaire corrigée avec succès!" -ForegroundColor Green
    } else {
        Write-Host "❌ Erreur lors de l'exécution du script SQL!" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Erreur: $_" -ForegroundColor Red
    exit 1
}

Write-Host "🎉 Correction terminée! Vous pouvez maintenant redémarrer votre backend." -ForegroundColor Green
