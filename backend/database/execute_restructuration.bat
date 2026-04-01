@echo off
REM ===============================================================================
REM Script d'execution automatique de la restructuration hierarchique
REM ===============================================================================
REM Ce script execute tous les scripts SQL necessaires pour restructurer
REM la hierarchie organisationnelle de l'application RH
REM ===============================================================================

echo.
echo ================================================================================
echo   RESTRUCTURATION DE LA HIERARCHIE ORGANISATIONNELLE
echo ================================================================================
echo.
echo Ce script va executer les operations suivantes:
echo   1. Creation de la structure de la hierarchie (tables)
echo   2. Importation des donnees DIR/SER
echo   3. Mise a jour des affectations des agents
echo.
echo ATTENTION: Assurez-vous d'avoir fait une sauvegarde de votre base de donnees !
echo.
pause

REM Configuration de la base de donnees
set PGUSER=postgres
set PGDATABASE=ma_rh_db
set PGHOST=localhost
set PGPORT=5432

echo.
echo Configuration:
echo   Utilisateur: %PGUSER%
echo   Base de donnees: %PGDATABASE%
echo   Hote: %PGHOST%
echo   Port: %PGPORT%
echo.

REM Demander le mot de passe
set /p PGPASSWORD="Entrez le mot de passe PostgreSQL: "
echo.

REM Exporter la variable d'environnement
set PGPASSWORD=%PGPASSWORD%

echo ================================================================================
echo ETAPE 1/3: Creation de la structure
echo ================================================================================
echo.

psql -U %PGUSER% -d %PGDATABASE% -h %PGHOST% -p %PGPORT% -f restructure_hierarchie_complete.sql

if errorlevel 1 (
    echo.
    echo [ERREUR] Echec de l'execution du script 1
    echo.
    pause
    exit /b 1
)

echo.
echo [OK] Structure creee avec succes
echo.
timeout /t 2 /nobreak >nul

echo ================================================================================
echo ETAPE 2/3: Importation des donnees DIR/SER
echo ================================================================================
echo.

psql -U %PGUSER% -d %PGDATABASE% -h %PGHOST% -p %PGPORT% -f import_hierarchie_from_csv.sql

if errorlevel 1 (
    echo.
    echo [ERREUR] Echec de l'execution du script 2
    echo.
    pause
    exit /b 1
)

echo.
echo [OK] Donnees importees avec succes
echo.
timeout /t 2 /nobreak >nul

echo ================================================================================
echo ETAPE 3/3: Mise a jour des affectations des agents
echo ================================================================================
echo.

psql -U %PGUSER% -d %PGDATABASE% -h %PGHOST% -p %PGPORT% -f update_agents_from_csv.sql

if errorlevel 1 (
    echo.
    echo [ERREUR] Echec de l'execution du script 3
    echo.
    pause
    exit /b 1
)

echo.
echo [OK] Affectations mises a jour avec succes
echo.
timeout /t 2 /nobreak >nul

echo.
echo ================================================================================
echo   RESTRUCTURATION TERMINEE AVEC SUCCES !
echo ================================================================================
echo.
echo Verification rapide:
echo.

psql -U %PGUSER% -d %PGDATABASE% -h %PGHOST% -p %PGPORT% -c "SELECT (SELECT COUNT(*) FROM direction_generale) as nb_dg, (SELECT COUNT(*) FROM directions) as nb_dir, (SELECT COUNT(*) FROM sous_directions) as nb_sd, (SELECT COUNT(*) FROM services) as nb_serv;"

echo.
echo Vous pouvez maintenant:
echo   - Consulter la vue: SELECT * FROM v_hierarchie_complete;
echo   - Utiliser les API pour gerer la hierarchie
echo   - Afficher l'organigramme dans l'application
echo.
echo Consultez le fichier GUIDE_RESTRUCTURATION_HIERARCHIE.md pour plus d'informations
echo.

REM Nettoyer la variable mot de passe
set PGPASSWORD=

pause




















