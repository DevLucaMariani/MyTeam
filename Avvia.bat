@echo off
REM ============================================================
REM  Client Configurator - Avvio (tutto in locale, niente rete)
REM ============================================================
cd /d "%~dp0"

echo.
echo  Avvio di Client Configurator...
echo  (la prima volta Docker scarica MariaDB e Node: puo' richiedere qualche minuto)
echo.

docker compose up -d --build
if errorlevel 1 (
  echo.
  echo  ERRORE: Docker non e' partito. Assicurati che Docker Desktop sia avviato.
  echo.
  pause
  exit /b 1
)

echo.
echo  Attendo che il database sia pronto...
REM Diamo tempo al backend di creare lo schema e i dati demo.
timeout /t 8 /nobreak >nul

echo.
echo  Pronto! Apro l'interfaccia nel browser: http://localhost:8137
start "" "http://localhost:8137"

echo.
echo  Per fermare tutto: doppio clic su Ferma.bat
echo.
pause
