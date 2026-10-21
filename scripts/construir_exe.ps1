# Construye dist\AuditorISO\AuditorISO.exe: backend + frontend + catalogo en un solo programa.
#
# Uso (desde la raiz del repositorio):
#     powershell -ExecutionPolicy Bypass -File scripts\construir_exe.ps1
#
# Requisitos: Python 3.11+ y Node.js 20+ en el PATH.
# El entorno virtual de construccion y los archivos temporales de PyInstaller viven en
# %TEMP%\auditor_iso_build, fuera del repositorio. Los datos del usuario (base SQLite y
# llave de cifrado) NO se guardan en dist: viven en %LOCALAPPDATA%\AuditorISO, asi que
# reconstruir el .exe no borra empresas ni ejecuciones.

$ErrorActionPreference = "Stop"

function Invocar {
    param([string]$Descripcion, [scriptblock]$Comando)
    Write-Host "==> $Descripcion" -ForegroundColor Cyan
    & $Comando
    if ($LASTEXITCODE -ne 0) { throw "Fallo: $Descripcion (codigo $LASTEXITCODE)" }
}

$repo = Split-Path $PSScriptRoot -Parent
$trabajo = Join-Path $env:TEMP "auditor_iso_build"
$venv = Join-Path $trabajo "venv"
$python = Join-Path $venv "Scripts\python.exe"

Push-Location (Join-Path $repo "frontend")
try {
    Invocar "Instalar dependencias del frontend" { npm install --no-audit --no-fund }
    Invocar "Compilar el frontend" { npm run build }
}
finally { Pop-Location }

if (-not (Test-Path $python)) {
    Invocar "Crear el entorno virtual de construccion" { python -m venv $venv }
}
Invocar "Instalar dependencias del backend y PyInstaller" {
    & $python -m pip install --quiet --upgrade pip
    & $python -m pip install --quiet -r (Join-Path $repo "backend\requirements.txt") pyinstaller
}

$backend = Join-Path $repo "backend"
$instrumento = Join-Path $repo "instrumento"
$frontendDist = Join-Path $repo "frontend\dist"
$laboratorio = Join-Path $repo "laboratorio"

Invocar "Empaquetar con PyInstaller" {
    & $python -m PyInstaller --noconfirm --clean --onedir --console --name AuditorISO `
        --paths $backend `
        --distpath (Join-Path $repo "dist") `
        --workpath (Join-Path $trabajo "work") `
        --specpath $trabajo `
        --add-data "$instrumento;instrumento" `
        --add-data "$laboratorio;laboratorio" `
        --add-data "$frontendDist;frontend\dist" `
        --collect-submodules uvicorn `
        --collect-submodules anyio `
        --collect-submodules cryptography `
        --collect-submodules oracledb `
        (Join-Path $backend "lanzador.py")
}

$exe = Join-Path $repo "dist\AuditorISO\AuditorISO.exe"

# El driver de Oracle esta compilado y PyInstaller no ve sus imports de cryptography:
# si el paquete quedo incompleto, el .exe arrancaria pero no podria conectarse a Oracle.
Invocar "Verificar el driver de Oracle dentro del paquete" { & $exe --verificar }
Write-Host ""
Write-Host "Listo: $exe" -ForegroundColor Green
Write-Host "Datos del usuario: $env:LOCALAPPDATA\AuditorISO"
