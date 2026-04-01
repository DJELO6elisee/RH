# Script de déploiement des fichiers manquants vers le serveur de production
# Usage: .\deploy-missing-files.ps1 user@server
# Exemple: .\deploy-missing-files.ps1 root@tourisme.2ise-groupe.com

param(
    [Parameter(Mandatory=$true)]
    [string]$Server
)

$RemotePath = "/home/isegroup/tourisme"
$BackendPath = "C:\Users\HP\Desktop\All Folder\RH\backend"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Déploiement des fichiers vers $Server" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Fichiers à déployer
$Files = @(
    "routes\agents.js",
    "routes\agentAuth.js",
    "controllers\AgentsController.js",
    "controllers\AgentAuthController.js",
    "services\authCodeService.js",
    "services\emailService.js"
)

foreach ($file in $Files) {
    $localFile = Join-Path $BackendPath $file
    $remoteFile = $file -replace '\\', '/'
    
    Write-Host "Transfert de $file..." -ForegroundColor Yellow
    
    # Utiliser SCP (nécessite OpenSSH ou PuTTY)
    $scpCommand = "scp `"$localFile`" ${Server}:${RemotePath}/$remoteFile"
    
    try {
        Invoke-Expression $scpCommand
        Write-Host "✓ $file transféré avec succès" -ForegroundColor Green
    }
    catch {
        Write-Host "✗ Erreur lors du transfert de $file" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Redémarrage de l'application..." -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Redémarrer l'application
$sshCommand = "ssh $Server `"cd $RemotePath && pm2 restart tourisme`""

try {
    Invoke-Expression $sshCommand
    Write-Host "✓ Application redémarrée avec succès" -ForegroundColor Green
}
catch {
    Write-Host "✗ Erreur lors du redémarrage" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

Write-Host ""
Write-Host "Déploiement terminé !" -ForegroundColor Green

