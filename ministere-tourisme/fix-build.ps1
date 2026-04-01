# Script pour corriger le build et creer le ZIP
Write-Host "Correction du build en cours..." -ForegroundColor Yellow

# Corriger index.html
(Get-Content build\index.html) -replace 'https://reduction-admin.github.io/react-reduction/', '/' | Set-Content build\index.html

# Verifier
$check = Get-Content build\index.html | Select-String "reduction-admin"
if ($check) {
    Write-Host "ERREUR: Le fichier contient encore des references a reduction-admin!" -ForegroundColor Red
    exit 1
}

Write-Host "Fichier corrige avec succes!" -ForegroundColor Green

# Creer le ZIP
Write-Host "Creation du fichier build-tourisme.zip..." -ForegroundColor Yellow
Compress-Archive -Path build\* -DestinationPath build-tourisme.zip -Force

Write-Host "Fichier build-tourisme.zip cree avec succes!" -ForegroundColor Green
Write-Host "Vous pouvez maintenant uploader build-tourisme.zip sur TPCloud" -ForegroundColor Cyan

