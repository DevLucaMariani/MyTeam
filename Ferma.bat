@echo off
REM ============================================================
REM  Client Configurator - Stop
REM ============================================================
cd /d "%~dp0"

echo.
echo  Arresto di Client Configurator...
echo  (i dati restano salvati nel database locale)
echo.

docker compose down

echo.
echo  Fatto. Per ripartire: doppio clic su Avvia.bat
echo.
pause
