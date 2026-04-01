# ============================================================================
# Script PowerShell d'installation de la table direction_generale
# ============================================================================
# Ce script automatise l'installation complète de la table direction_generale
# Usage: .\install_direction_generale.ps1
# ============================================================================

# Configuration
$DB_NAME = "ma_rh_db"
$DB_USER = "postgres"
$PSQL_PATH = "C:\Program Files\PostgreSQL\16\bin\psql.exe"  # Ajuster selon votre version
$SCRIPT_DIR = $PSScriptRoot

# Couleurs pour l'affichage
function Write-Success { Write-Host $args -ForegroundColor Green }
function Write-Info { Write-Host $args -ForegroundColor Cyan }
function Write-Warning { Write-Host $args -ForegroundColor Yellow }
function Write-Error-Custom { Write-Host $args -ForegroundColor Red }

# Banner
Write-Host ""
Write-Host "============================================" -ForegroundColor Magenta
Write-Host "  INSTALLATION - Direction Générale        " -ForegroundColor Magenta
Write-Host "============================================" -ForegroundColor Magenta
Write-Host ""

# ============================================================================
# 1. Vérifications préliminaires
# ============================================================================

Write-Info "1. Vérifications préliminaires..."
Write-Host ""

# Vérifier que psql existe
if (-not (Test-Path $PSQL_PATH)) {
    Write-Error-Custom "❌ psql.exe non trouvé à: $PSQL_PATH"
    Write-Host ""
    Write-Warning "Veuillez modifier la variable PSQL_PATH dans le script avec le bon chemin."
    Write-Host "Chemins courants:"
    Write-Host "  - PostgreSQL 16: C:\Program Files\PostgreSQL\16\bin\psql.exe"
    Write-Host "  - PostgreSQL 15: C:\Program Files\PostgreSQL\15\bin\psql.exe"
    Write-Host "  - PostgreSQL 14: C:\Program Files\PostgreSQL\14\bin\psql.exe"
    Write-Host ""
    exit 1
}
Write-Success "   ✓ psql.exe trouvé"

# Vérifier que les fichiers SQL existent
$required_files = @(
    "create_direction_generale.sql",
    "verify_direction_generale.sql"
)

foreach ($file in $required_files) {
    $filepath = Join-Path $SCRIPT_DIR $file
    if (-not (Test-Path $filepath)) {
        Write-Error-Custom "❌ Fichier manquant: $file"
        exit 1
    }
}
Write-Success "   ✓ Fichiers SQL trouvés"
Write-Host ""

# ============================================================================
# 2. Confirmation de l'utilisateur
# ============================================================================

Write-Warning "⚠️  ATTENTION:"
Write-Host "   Ce script va modifier la base de données '$DB_NAME'"
Write-Host "   Une sauvegarde sera créée automatiquement"
Write-Host ""

$confirmation = Read-Host "Voulez-vous continuer? (O/N)"
if ($confirmation -ne "O" -and $confirmation -ne "o") {
    Write-Info "Installation annulée par l'utilisateur."
    exit 0
}

Write-Host ""

# ============================================================================
# 3. Sauvegarde de la base de données
# ============================================================================

Write-Info "2. Création d'une sauvegarde..."
Write-Host ""

$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$backup_file = Join-Path $SCRIPT_DIR "backup_avant_direction_generale_$timestamp.backup"

Write-Host "   Fichier de sauvegarde: $backup_file"
Write-Host "   Cela peut prendre quelques minutes..."
Write-Host ""

$pg_dump_path = $PSQL_PATH -replace "psql.exe", "pg_dump.exe"

try {
    & $pg_dump_path -U $DB_USER -d $DB_NAME -F c -f $backup_file 2>&1 | Out-Null
    
    if (Test-Path $backup_file) {
        $size = (Get-Item $backup_file).Length / 1MB
        Write-Success "   ✓ Sauvegarde créée avec succès ($([math]::Round($size, 2)) MB)"
    } else {
        throw "La sauvegarde n'a pas été créée"
    }
} catch {
    Write-Error-Custom "   ❌ Erreur lors de la sauvegarde: $_"
    Write-Host ""
    Write-Warning "Voulez-vous continuer sans sauvegarde? (O/N)"
    $confirm_no_backup = Read-Host
    if ($confirm_no_backup -ne "O" -and $confirm_no_backup -ne "o") {
        Write-Info "Installation annulée."
        exit 1
    }
}

Write-Host ""

# ============================================================================
# 4. Exécution du script de création
# ============================================================================

Write-Info "3. Installation de la table direction_generale..."
Write-Host ""

$create_script = Join-Path $SCRIPT_DIR "create_direction_generale.sql"

try {
    $env:PGPASSWORD = Read-Host -Prompt "   Mot de passe PostgreSQL pour l'utilisateur '$DB_USER'" -AsSecureString
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($env:PGPASSWORD)
    $env:PGPASSWORD = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
    
    Write-Host "   Exécution du script de création..."
    Write-Host ""
    
    $output = & $PSQL_PATH -U $DB_USER -d $DB_NAME -f $create_script 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "   ✓ Table direction_generale créée avec succès"
    } else {
        throw "Erreur lors de la création (Code: $LASTEXITCODE)"
    }
} catch {
    Write-Error-Custom "   ❌ Erreur lors de la création: $_"
    Write-Host ""
    Write-Host "   Sortie complète:"
    Write-Host $output
    Write-Host ""
    Write-Warning "Voulez-vous restaurer la sauvegarde? (O/N)"
    $restore = Read-Host
    if ($restore -eq "O" -or $restore -eq "o") {
        Write-Info "   Restauration en cours..."
        $pg_restore_path = $PSQL_PATH -replace "psql.exe", "pg_restore.exe"
        & $pg_restore_path -U $DB_USER -d $DB_NAME -c $backup_file
        Write-Info "   Restauration terminée"
    }
    exit 1
}

Write-Host ""

# ============================================================================
# 5. Vérification de l'installation
# ============================================================================

Write-Info "4. Vérification de l'installation..."
Write-Host ""

$verify_script = Join-Path $SCRIPT_DIR "verify_direction_generale.sql"

try {
    Write-Host "   Exécution des vérifications..."
    Write-Host ""
    
    $verify_output = & $PSQL_PATH -U $DB_USER -d $DB_NAME -f $verify_script 2>&1
    
    Write-Host $verify_output
    Write-Host ""
    
    if ($LASTEXITCODE -eq 0) {
        Write-Success "   ✓ Vérification réussie"
    } else {
        Write-Warning "   ⚠ Vérification terminée avec des avertissements"
    }
} catch {
    Write-Warning "   ⚠ Impossible d'exécuter la vérification: $_"
}

Write-Host ""

# ============================================================================
# 6. Installation des données de test (optionnel)
# ============================================================================

Write-Info "5. Données de test (optionnel)..."
Write-Host ""

$test_script = Join-Path $SCRIPT_DIR "test_data_direction_generale.sql"

if (Test-Path $test_script) {
    Write-Host "   Voulez-vous insérer des données de test? (O/N)"
    $install_test_data = Read-Host
    
    if ($install_test_data -eq "O" -or $install_test_data -eq "o") {
        try {
            Write-Host "   Insertion des données de test..."
            & $PSQL_PATH -U $DB_USER -d $DB_NAME -f $test_script 2>&1 | Out-Null
            Write-Success "   ✓ Données de test insérées"
        } catch {
            Write-Warning "   ⚠ Erreur lors de l'insertion des données de test: $_"
        }
    } else {
        Write-Info "   Données de test ignorées"
    }
} else {
    Write-Warning "   ⚠ Fichier de données de test non trouvé"
}

Write-Host ""

# ============================================================================
# 7. Résumé et prochaines étapes
# ============================================================================

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "  ✓ INSTALLATION TERMINÉE AVEC SUCCÈS      " -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""

Write-Info "📋 Résumé:"
Write-Host "   • Table direction_generale créée"
Write-Host "   • Colonne ajoutée dans la table directions"
Write-Host "   • Colonne ajoutée dans la table agents"
Write-Host "   • Index et contraintes créés"
Write-Host "   • Triggers configurés"
if (Test-Path $backup_file) {
    Write-Host "   • Sauvegarde: $backup_file"
}
Write-Host ""

Write-Info "📚 Documentation disponible:"
Write-Host "   • DIRECTION_GENERALE_README.md - Guide complet"
Write-Host "   • GUIDE_INSTALLATION_DIRECTION_GENERALE.md - Guide d'installation"
Write-Host "   • exemples_requetes_direction_generale.sql - Exemples SQL"
Write-Host "   • RECAPITULATIF_DIRECTION_GENERALE.md - Vue d'ensemble"
Write-Host ""

Write-Info "🔧 Prochaines étapes:"
Write-Host "   1. Intégrer les routes dans backend/server.js:"
Write-Host "      const directionGeneraleRoutes = require('./routes/directionGenerale');"
Write-Host "      app.use('/api/directions-generales', directionGeneraleRoutes);"
Write-Host ""
Write-Host "   2. Redémarrer le serveur backend:"
Write-Host "      cd ..\..  # Retour au dossier backend"
Write-Host "      npm restart"
Write-Host ""
Write-Host "   3. Tester l'API:"
Write-Host "      GET http://localhost:5000/api/directions-generales"
Write-Host ""

Write-Success "✨ Installation réussie! Bonne utilisation!"
Write-Host ""

# Nettoyer le mot de passe de l'environnement
Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue

# Demander si on ouvre la documentation
Write-Host "Voulez-vous ouvrir la documentation? (O/N)"
$open_doc = Read-Host

if ($open_doc -eq "O" -or $open_doc -eq "o") {
    $readme_path = Join-Path $SCRIPT_DIR "RECAPITULATIF_DIRECTION_GENERALE.md"
    if (Test-Path $readme_path) {
        Start-Process $readme_path
    }
}

Write-Host ""
Write-Host "Appuyez sur une touche pour quitter..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

