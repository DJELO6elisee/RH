# Script pour résoudre l'erreur ChunkLoadError
# Exécutez ce script dans PowerShell depuis le dossier ministere-tourisme

Write-Host "🔧 Résolution de l'erreur ChunkLoadError..." -ForegroundColor Cyan

# Étape 1: Arrêter le serveur si en cours
Write-Host "`n1. Vérification du serveur..." -ForegroundColor Yellow
$processes = Get-Process | Where-Object {$_.ProcessName -like "*node*"}
if ($processes) {
    Write-Host "   ⚠️  Des processus Node.js sont en cours. Veuillez les arrêter manuellement (Ctrl+C dans le terminal du serveur)." -ForegroundColor Yellow
}

# Étape 2: Supprimer le cache
Write-Host "`n2. Suppression du cache..." -ForegroundColor Yellow
$cachePaths = @(
    "node_modules\.cache",
    "build",
    ".cache"
)

foreach ($path in $cachePaths) {
    if (Test-Path $path) {
        Remove-Item -Recurse -Force $path -ErrorAction SilentlyContinue
        Write-Host "   ✓ Cache supprimé: $path" -ForegroundColor Green
    } else {
        Write-Host "   - Pas de cache trouvé: $path" -ForegroundColor Gray
    }
}

# Étape 3: Vérifier les dépendances
Write-Host "`n3. Vérification des dépendances..." -ForegroundColor Yellow
if (Test-Path "package.json") {
    Write-Host "   ✓ package.json trouvé" -ForegroundColor Green
} else {
    Write-Host "   ✗ package.json non trouvé!" -ForegroundColor Red
    exit 1
}

# Étape 4: Instructions finales
Write-Host "`n✅ Nettoyage terminé!" -ForegroundColor Green
Write-Host "`n📋 Prochaines étapes:" -ForegroundColor Cyan
Write-Host "   1. Fermez complètement votre navigateur" -ForegroundColor White
Write-Host "   2. Redémarrez le serveur avec: npm start" -ForegroundColor White
Write-Host "   3. Ouvrez le navigateur en mode navigation privée (Ctrl+Shift+N)" -ForegroundColor White
Write-Host "   4. Accédez à http://localhost:3000" -ForegroundColor White
Write-Host "`n💡 Si le problème persiste, essayez:" -ForegroundColor Yellow
Write-Host "   - Vider le cache du navigateur (Ctrl+Shift+Delete)" -ForegroundColor White
Write-Host "   - Réinstaller les dépendances: npm install" -ForegroundColor White

