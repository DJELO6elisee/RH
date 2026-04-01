# ========================================
# Script PowerShell pour exécuter les mises à jour
# sur la base de données PostgreSQL en ligne
# ========================================

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  MISE À JOUR DE LA BASE DE DONNÉES EN LIGNE" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Demander les informations de connexion
Write-Host "📋 Veuillez entrer les informations de connexion à votre base PostgreSQL :" -ForegroundColor Yellow
Write-Host ""

$DB_HOST = Read-Host "Adresse du serveur (ex: db.exemple.com)"
$DB_PORT = Read-Host "Port [5432]"
if ([string]::IsNullOrWhiteSpace($DB_PORT)) { $DB_PORT = "5432" }

$DB_NAME = Read-Host "Nom de la base de données [rh]"
if ([string]::IsNullOrWhiteSpace($DB_NAME)) { $DB_NAME = "rh" }

$DB_USER = Read-Host "Nom d'utilisateur [isegroup]"
if ([string]::IsNullOrWhiteSpace($DB_USER)) { $DB_USER = "isegroup" }

$DB_PASSWORD = Read-Host "Mot de passe" -AsSecureString
$DB_PASSWORD_PLAIN = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($DB_PASSWORD)
)

Write-Host ""
Write-Host "🔄 Création du fichier .env..." -ForegroundColor Green

# Créer le fichier .env
$envContent = @"
# Configuration de la base de données PostgreSQL en ligne
DB_HOST=$DB_HOST
DB_PORT=$DB_PORT
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD_PLAIN
"@

$envPath = Join-Path (Split-Path $PSScriptRoot -Parent) ".env"
Set-Content -Path $envPath -Value $envContent

Write-Host "✅ Fichier .env créé avec succès !" -ForegroundColor Green
Write-Host ""

# Menu de choix
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  CHOISISSEZ L'ACTION À EFFECTUER" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Mettre à jour les CATÉGORIES" -ForegroundColor White
Write-Host "2. Mettre à jour les GRADES" -ForegroundColor White
Write-Host "3. Mettre à jour les TYPES D'AGENTS" -ForegroundColor White
Write-Host "4. TOUT mettre à jour (Catégories + Grades + Types)" -ForegroundColor Yellow
Write-Host "5. Quitter" -ForegroundColor Red
Write-Host ""

$choice = Read-Host "Votre choix (1-5)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "🔄 Exécution du script : importCategoriesFromCSV.js" -ForegroundColor Cyan
        Set-Location $PSScriptRoot
        node importCategoriesFromCSV.js --apply
    }
    "2" {
        Write-Host ""
        Write-Host "🔄 Exécution du script : updateAgentGrades.js" -ForegroundColor Cyan
        Set-Location $PSScriptRoot
        node updateAgentGrades.js --apply
    }
    "3" {
        Write-Host ""
        Write-Host "🔄 Exécution du script : updateAgentTypes.js" -ForegroundColor Cyan
        Set-Location $PSScriptRoot
        node updateAgentTypes.js --apply
    }
    "4" {
        Write-Host ""
        Write-Host "🔄 Exécution COMPLÈTE : Catégories → Grades → Types" -ForegroundColor Yellow
        Write-Host ""
        
        Write-Host "1/3 - Mise à jour des CATÉGORIES..." -ForegroundColor Cyan
        Set-Location $PSScriptRoot
        node importCategoriesFromCSV.js --apply
        
        Write-Host ""
        Write-Host "2/3 - Mise à jour des GRADES..." -ForegroundColor Cyan
        node updateAgentGrades.js --apply
        
        Write-Host ""
        Write-Host "3/3 - Mise à jour des TYPES D'AGENTS..." -ForegroundColor Cyan
        node updateAgentTypes.js --apply
        
        Write-Host ""
        Write-Host "============================================" -ForegroundColor Green
        Write-Host "  ✅ MISE À JOUR COMPLÈTE TERMINÉE !" -ForegroundColor Green
        Write-Host "============================================" -ForegroundColor Green
    }
    "5" {
        Write-Host ""
        Write-Host "👋 Au revoir !" -ForegroundColor Yellow
        exit
    }
    default {
        Write-Host ""
        Write-Host "❌ Choix invalide ! Veuillez choisir entre 1 et 5." -ForegroundColor Red
        exit
    }
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  Script terminé avec succès !" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Appuyez sur une touche pour fermer..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

