# Script pour calculer les dates de retraite de tous les agents
# Usage: .\calculer-retraites.ps1

param(
    [string]$Token = "",
    [string]$BaseUrl = "https://tourisme.2ise-groupe.com/api"
)

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Calcul en masse des dates de retraite" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

if ($Token -eq "") {
    Write-Host "⚠️  Aucun token fourni. Si l'endpoint nécessite une authentification," -ForegroundColor Yellow
    Write-Host "    veuillez fournir un token JWT avec le paramètre -Token" -ForegroundColor Yellow
    Write-Host ""
    $response = Read-Host "Voulez-vous continuer sans token ? (O/N)"
    if ($response -ne "O" -and $response -ne "o") {
        Write-Host "Opération annulée." -ForegroundColor Red
        exit
    }
}

$url = "$BaseUrl/agents/batch-calculate-retirement"

Write-Host "🔄 Envoi de la requête à : $url" -ForegroundColor Yellow
Write-Host ""

try {
    $headers = @{
        "Content-Type" = "application/json"
    }
    
    if ($Token -ne "") {
        $headers["Authorization"] = "Bearer $Token"
    }
    
    $response = Invoke-RestMethod -Uri $url -Method Post -Headers $headers -TimeoutSec 300
    
    Write-Host "=========================================" -ForegroundColor Green
    Write-Host "✅ SUCCÈS - Calcul terminé" -ForegroundColor Green
    Write-Host "=========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 Résultats :" -ForegroundColor Cyan
    Write-Host "  - Total d'agents traités : $($response.data.total_agents)" -ForegroundColor White
    Write-Host "  - Agents mis à jour       : $($response.data.updated)" -ForegroundColor Green
    Write-Host "  - Erreurs                 : $($response.data.errors)" -ForegroundColor $(if ($response.data.errors -gt 0) { "Red" } else { "Green" })
    Write-Host ""
    
    if ($response.data.errors -gt 0 -and $response.data.error_details) {
        Write-Host "⚠️  Détails des erreurs :" -ForegroundColor Yellow
        foreach ($error in $response.data.error_details) {
            Write-Host "  - Agent $($error.matricule) (ID: $($error.agent_id)): $($error.error)" -ForegroundColor Red
        }
    }
    
    Write-Host ""
    Write-Host "✅ Vous pouvez maintenant consulter les projections de retraite !" -ForegroundColor Green
    
} catch {
    Write-Host "=========================================" -ForegroundColor Red
    Write-Host "❌ ERREUR" -ForegroundColor Red
    Write-Host "=========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    
    if ($_.ErrorDetails.Message) {
        $errorObj = $_.ErrorDetails.Message | ConvertFrom-Json
        Write-Host "Détails : $($errorObj.message)" -ForegroundColor Yellow
        if ($errorObj.error) {
            Write-Host "Erreur technique : $($errorObj.error)" -ForegroundColor Yellow
        }
    }
}

Write-Host ""
Write-Host "Appuyez sur une touche pour fermer..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")


















