@echo off
REM Se place automatiquement dans le dossier ou se trouve ce fichier
cd /d "%~dp0"

echo ============================================
echo   G.E.C. - Lancement du site en local
echo ============================================
echo.

if not exist "node_modules" (
    echo Premiere utilisation detectee : installation des dependances...
    call npm install
    echo.
)

echo Demarrage du site... Laissez cette fenetre ouverte.
echo Des qu'un lien "Local: http://localhost..." apparait ci-dessous, cliquez dessus (ou copiez-le dans votre navigateur).
echo Pour arreter le site : fermez cette fenetre, ou appuyez sur Ctrl+C.
echo.
call npm run dev

pause
