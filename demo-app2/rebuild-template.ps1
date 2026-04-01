# Script de rebuild pour Online Template
# Ce script nettoie et rebuild l'application avec la bonne configuration

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Rebuild Online Template" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Étape 1: Nettoyer les fichiers de build existants
Write-Host "Étape 1: Nettoyage des fichiers de build..." -ForegroundColor Yellow
if (Test-Path "build") {
    Remove-Item -Recurse -Force "build"
    Write-Host "✓ Dossier build supprimé" -ForegroundColor Green
}

# Étape 2: Nettoyer le cache (optionnel mais recommandé)
Write-Host ""
Write-Host "Étape 2: Nettoyage du cache..." -ForegroundColor Yellow
if (Test-Path "node_modules\.cache") {
    Remove-Item -Recurse -Force "node_modules\.cache"
    Write-Host "✓ Cache nettoyé" -ForegroundColor Green
}

# Étape 3: Build de l'application
Write-Host ""
Write-Host "Étape 3: Build de l'application..." -ForegroundColor Yellow
Write-Host "Configuration: PUBLIC_URL=/react-reduction/ministere" -ForegroundColor Cyan

# Définir PUBLIC_URL pour le build
$env:PUBLIC_URL = "/react-reduction/ministere"

# Exécuter le build
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "✓ Build complété avec succès!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Prochaines étapes:" -ForegroundColor Cyan
    Write-Host "1. Uploadez le contenu du dossier 'build' vers votre serveur" -ForegroundColor White
    Write-Host "2. Placez les fichiers dans: /react-reduction/ministere/" -ForegroundColor White
    Write-Host "3. Accédez à: https://tourisme.2ise-groupe.com/react-reduction/ministere" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "✗ Erreur lors du build" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Vérifiez les erreurs ci-dessus" -ForegroundColor Yellow
}

