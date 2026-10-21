@echo off
rem ===========================================================================
rem  Levanta el instrumento completo con doble clic: compila el frontend, prepara
rem  el backend y abre el navegador en http://127.0.0.1:8000 (o el siguiente
rem  puerto libre). Un solo servidor: el backend sirve tambien el frontend.
rem
rem  Uso:  iniciar.cmd                  (doble clic)
rem        iniciar.cmd --puerto 9000
rem        iniciar.cmd --sin-navegador
rem
rem  Requisitos: Python 3.11+ y Node.js 20+ en el PATH.
rem  Los datos (empresas, ejecuciones y la llave de cifrado) viven en
rem  %LOCALAPPDATA%\AuditorISO, los mismos que usa AuditorISO.exe. El entorno
rem  virtual de Python tambien vive ahi, fuera del repositorio y de OneDrive.
rem  La primera vez tarda unos minutos (instala dependencias); despues, segundos.
rem ===========================================================================
setlocal
title Auditor ISO 27001
cd /d "%~dp0"

rem Carpeta de datos: la del .exe, salvo que AUDITORIA_DATOS_DIR ya venga definida.
if defined AUDITORIA_DATOS_DIR (set "DATOS=%AUDITORIA_DATOS_DIR%") else (set "DATOS=%LOCALAPPDATA%\AuditorISO")
set "VENV=%DATOS%\venv"
set "PY=%VENV%\Scripts\python.exe"
set "MARCAS=%DATOS%\marcas"
if not exist "%MARCAS%" mkdir "%MARCAS%"

rem --- Requisitos ------------------------------------------------------------
where python >nul 2>&1 || (echo [ERROR] No se encontro Python en el PATH. Instale Python 3.11 o superior. & goto :error)
python -c "import sys; sys.exit(sys.version_info < (3, 11))" || (echo [ERROR] Se necesita Python 3.11 o superior. & goto :error)
where npm >nul 2>&1 || (echo [ERROR] No se encontro Node.js en el PATH. Instale Node.js 20 o superior. & goto :error)

rem --- Frontend: dependencias solo si cambio package-lock.json; compilar siempre
fc /b "frontend\package-lock.json" "%MARCAS%\package-lock.json" >nul 2>&1
if errorlevel 1 (
    echo ==^> Instalando dependencias del frontend...
    pushd frontend
    call npm install --no-audit --no-fund || (popd & goto :error)
    popd
    copy /y "frontend\package-lock.json" "%MARCAS%\package-lock.json" >nul
)
if not exist "frontend\node_modules" (
    del "%MARCAS%\package-lock.json" >nul 2>&1
    echo [ERROR] Falta frontend\node_modules. Vuelva a ejecutar iniciar.cmd.
    goto :error
)
echo ==^> Compilando el frontend...
pushd frontend
call npm run build --silent || (popd & goto :error)
popd

rem --- Backend: entorno virtual y dependencias solo si cambio requirements.txt
if not exist "%PY%" (
    echo ==^> Creando el entorno virtual de Python en %VENV%...
    python -m venv "%VENV%" || goto :error
    del "%MARCAS%\requirements.txt" >nul 2>&1
)
fc /b "backend\requirements.txt" "%MARCAS%\requirements.txt" >nul 2>&1
if errorlevel 1 (
    echo ==^> Instalando dependencias del backend...
    "%PY%" -m pip install --quiet --upgrade pip || goto :error
    "%PY%" -m pip install --quiet -r "backend\requirements.txt" || goto :error
    copy /y "backend\requirements.txt" "%MARCAS%\requirements.txt" >nul
)

rem --- Arrancar ---------------------------------------------------------------
echo.
set "AUDITORIA_DATOS_DIR=%DATOS%"
cd /d "%~dp0backend"
"%PY%" lanzador.py %*
if errorlevel 1 goto :error
endlocal
exit /b 0

:error
echo.
echo No se pudo iniciar el instrumento. Revise el mensaje de arriba.
pause
endlocal
exit /b 1
