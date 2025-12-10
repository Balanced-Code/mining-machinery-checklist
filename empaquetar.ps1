# ========================================
# Mining Machinery Checklist
# Script Unificado de Produccion y Empaquetado
# ========================================
# 
# Modos de uso:
#   .\empaquetar.ps1              -> Crea paquete completo para distribuir
#   .\empaquetar.ps1 -dev         -> Inicia en modo desarrollo
#   .\empaquetar.ps1 -build       -> Solo compila sin empaquetar

param(
    [switch]$dev,
    [switch]$build
)

# Configuracion
$APP_NAME = "MiningChecklistApp"
$DIST_DIR = "dist-release"
# Mejor descargar directamente desde "https://www.enterprisedb.com/download-postgresql-binaries"
# Luego guardar en .cache para evitar descargas repetidas
# .cache\postgresql-18.1-1-windows-x64-binaries.zip o .cache\postgresql-extracted\lo_que_contenga (paso 5)
$POSTGRES_VERSION = "18.1-1"
$POSTGRES_PORTABLE_URL = "https://get.enterprisedb.com/postgresql/postgresql-$POSTGRES_VERSION-windows-x64-binaries.zip"

# ========================================
# MODO DESARROLLO
# ========================================
if ($dev) {
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "  Modo Desarrollo                      " -ForegroundColor Cyan
    Write-Host "========================================`n" -ForegroundColor Cyan
    
    # Verificar dependencias backend
    if (-not (Test-Path "back\node_modules")) {
        Write-Host "Instalando dependencias backend..." -ForegroundColor Yellow
        Set-Location back
        pnpm install
        Set-Location ..
    }
    
    # Verificar dependencias frontend
    if (-not (Test-Path "front\node_modules")) {
        Write-Host "Instalando dependencias frontend..." -ForegroundColor Yellow
        Set-Location front
        npm install
        Set-Location ..
    }
    
    Write-Host "Iniciando en modo desarrollo..." -ForegroundColor Green
    Write-Host "   Frontend: http://localhost:4200" -ForegroundColor White
    Write-Host "   Backend:  http://localhost:3000`n" -ForegroundColor White
    
    # Iniciar backend
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\back'; pnpm run dev"
    
    # Iniciar frontend
    Start-Sleep -Seconds 2
    Set-Location front
    npm start
    
    exit 0
}

# ========================================
# COMPILACIoN
# ========================================

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Empaquetador - Mining Machinery App  " -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Verificar dependencias
Write-Host "Verificando dependencias..." -ForegroundColor Cyan
if (-not (Test-Path "back\node_modules")) {
    Write-Host "Instalando dependencias backend..." -ForegroundColor Yellow
    Set-Location back
    pnpm install
    if ($LASTEXITCODE -ne 0) { exit 1 }
    Set-Location ..
}

if (-not (Test-Path "front\node_modules")) {
    Write-Host "Instalando dependencias frontend..." -ForegroundColor Yellow
    Set-Location front
    npm install
    if ($LASTEXITCODE -ne 0) { exit 1 }
    Set-Location ..
}

# 1. Compilar aplicacion
Write-Host "`nCompilando aplicacion..." -ForegroundColor Cyan

# Compilar frontend
Write-Host "  Compilando frontend..." -ForegroundColor Gray
Set-Location front
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error compilando frontend" -ForegroundColor Red
    exit 1
}
Set-Location ..

# Compilar backend
Write-Host "  Compilando backend..." -ForegroundColor Gray
Set-Location back
pnpm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error compilando backend" -ForegroundColor Red
    exit 1
}
Set-Location ..

Write-Host "Aplicacion compilada" -ForegroundColor Green

# Si solo se pidio compilar, terminar aqui
if ($build) {
    Write-Host "`nCompilacion completada. Para iniciar en produccion:" -ForegroundColor Green
    Write-Host "   cd back" -ForegroundColor White
    Write-Host "   pnpm run start:prod`n" -ForegroundColor White
    exit 0
}

# ========================================
# EMPAQUETADO PARA DISTRIBUCIoN
# ========================================

Write-Host "`nCreando paquete de distribucion..." -ForegroundColor Cyan

# Limpiar distribucion anterior
if (Test-Path $DIST_DIR) {
    Write-Host "Limpiando distribucion anterior..." -ForegroundColor Yellow
    Remove-Item $DIST_DIR -Recurse -Force
}

# Crear estructura
Write-Host "Creando estructura de carpetas..." -ForegroundColor Cyan
New-Item -ItemType Directory -Path "$DIST_DIR\$APP_NAME" -Force | Out-Null
New-Item -ItemType Directory -Path "$DIST_DIR\$APP_NAME\backend" -Force | Out-Null
New-Item -ItemType Directory -Path "$DIST_DIR\$APP_NAME\backend\uploads\imagen" -Force | Out-Null
New-Item -ItemType Directory -Path "$DIST_DIR\$APP_NAME\backend\uploads\pdf" -Force | Out-Null
New-Item -ItemType Directory -Path "$DIST_DIR\$APP_NAME\database" -Force | Out-Null
New-Item -ItemType Directory -Path "$DIST_DIR\$APP_NAME\data" -Force | Out-Null
New-Item -ItemType Directory -Path "$DIST_DIR\$APP_NAME\_internal" -Force | Out-Null

# 2. Copiar archivos del backend
Write-Host "`nCopiando backend..." -ForegroundColor Cyan
Copy-Item "back\dist" "$DIST_DIR\$APP_NAME\backend\" -Recurse
Copy-Item "back\src\generated" "$DIST_DIR\$APP_NAME\backend\dist\" -Recurse -Force
Copy-Item "back\package.json" "$DIST_DIR\$APP_NAME\backend\"

# Agregar "type": "module" al package.json
$packageJson = Get-Content "$DIST_DIR\$APP_NAME\backend\package.json" | ConvertFrom-Json
$packageJson | Add-Member -NotePropertyName "type" -NotePropertyValue "module" -Force
$packageJson | ConvertTo-Json -Depth 10 | Set-Content "$DIST_DIR\$APP_NAME\backend\package.json"

Copy-Item "back\prisma" "$DIST_DIR\$APP_NAME\backend\" -Recurse

# Modificar schema.prisma para produccion (usar ubicacion por defecto de Prisma Client)
$schemaPath = "$DIST_DIR\$APP_NAME\backend\prisma\schema.prisma"
$schemaContent = Get-Content $schemaPath -Raw
$schemaContent = $schemaContent -replace 'output\s*=\s*"\.\.\/src\/generated\/prisma"', ''
$schemaContent | Set-Content $schemaPath

# Copiar .env de ejemplo si no existe
if (-not (Test-Path "$DIST_DIR\$APP_NAME\backend\.env")) {
    Copy-Item "back\.env.example" "$DIST_DIR\$APP_NAME\backend\.env" -ErrorAction SilentlyContinue
}

# Instalar dependencias de produccion + prisma CLI
Write-Host "Instalando dependencias de produccion..." -ForegroundColor Cyan
Set-Location "$DIST_DIR\$APP_NAME\backend"
npm install --omit=dev
npm install prisma --save-dev
Set-Location "..\..\..\"
Write-Host "Backend copiado" -ForegroundColor Green

# 3. Copiar frontend compilado
Write-Host "`nCopiando frontend..." -ForegroundColor Cyan
Copy-Item "front\dist\checklist\browser" "$DIST_DIR\$APP_NAME\backend\public" -Recurse
Write-Host "Frontend copiado" -ForegroundColor Green

# 4. Copiar PostgreSQL
Write-Host "`nPreparando PostgreSQL..." -ForegroundColor Cyan

# Prioridad 1: Copiar desde carpeta pre-extraida (mas rapido)
if (Test-Path ".cache\postgresql-extracted") {
    Write-Host "Copiando PostgreSQL pre-extraido..." -ForegroundColor Cyan
    Copy-Item ".cache\postgresql-extracted\*" "$DIST_DIR\$APP_NAME\database\postgresql\" -Recurse -Force
    Write-Host "PostgreSQL copiado (rapido)" -ForegroundColor Green
}
# Prioridad 2: Usar ZIP en cache
elseif (Test-Path ".cache\postgresql-$POSTGRES_VERSION-windows-x64-binaries.zip") {
    Write-Host "Extrayendo PostgreSQL desde cache..." -ForegroundColor Cyan
    Expand-Archive -Path ".cache\postgresql-$POSTGRES_VERSION-windows-x64-binaries.zip" -DestinationPath "$DIST_DIR\$APP_NAME\database\postgresql" -Force
    Write-Host "PostgreSQL extraido correctamente" -ForegroundColor Green
}
# Prioridad 3: Descargar y extraer
else {
    try {
        Write-Host "Descargando PostgreSQL (esto puede tomar varios minutos)..." -ForegroundColor Yellow
        New-Item -ItemType Directory -Path ".cache" -Force | Out-Null
        $POSTGRES_CACHE = ".cache\postgresql-$POSTGRES_VERSION-windows-x64-binaries.zip"
        Invoke-WebRequest -Uri $POSTGRES_PORTABLE_URL -OutFile $POSTGRES_CACHE -UseBasicParsing
        Write-Host "PostgreSQL descargado y guardado en cache" -ForegroundColor Green
        
        Write-Host "Extrayendo PostgreSQL..." -ForegroundColor Cyan
        Expand-Archive -Path $POSTGRES_CACHE -DestinationPath "$DIST_DIR\$APP_NAME\database\postgresql" -Force
        Write-Host "PostgreSQL extraido correctamente" -ForegroundColor Green
    } catch {
        Write-Host "No se pudo descargar automaticamente" -ForegroundColor Yellow
        Write-Host "   Descarga manualmente desde:" -ForegroundColor Yellow
        Write-Host "   $POSTGRES_PORTABLE_URL" -ForegroundColor White
        Write-Host "   Y guardalo en: .cache\postgresql-$POSTGRES_VERSION-windows-x64-binaries.zip" -ForegroundColor White
        Write-Host "   O extrae PostgreSQL a: .cache\postgresql-extracted\" -ForegroundColor White
        $response = Read-Host "`n¿Continuar sin PostgreSQL? (S/N)"
        if ($response -ne "S" -and $response -ne "s") {
            exit 1
        }
    }
}

# 5. Crear archivo .env de produccion
Write-Host "`nCreando configuracion..." -ForegroundColor Cyan
$random1 = Get-Random -Minimum 10000000 -Maximum 99999999
$random2 = Get-Random -Minimum 10000000 -Maximum 99999999
$envContent = "JWT_SECRET=mining-checklist-jwt-secret-$random1`r`nCOOKIE_SECRET=mining-checklist-cookie-secret-$random2`r`nNODE_ENV=production`r`nPORT=4200`r`nHOST=0.0.0.0`r`nDATABASE_URL=postgresql://postgres:admin@localhost:5433/checklist_db"
$envContent | Out-File -FilePath "$DIST_DIR\$APP_NAME\backend\.env" -Encoding UTF8
Write-Host "Configuracion creada" -ForegroundColor Green

# 6. Crear scripts de inicio
Write-Host "`nCreando scripts de inicio..." -ForegroundColor Cyan

# Script principal de inicio (PowerShell) - en carpeta _internal
$iniciarScriptPath = "$DIST_DIR\$APP_NAME\_internal\Iniciar.ps1"
$iniciarContent = @"
`$ErrorActionPreference = "Stop"
`$Host.UI.RawUI.WindowTitle = "Mining Machinery Checklist"

Write-Host ""
Write-Host "  ========================================" -ForegroundColor Cyan
Write-Host "    Mining Machinery Checklist" -ForegroundColor Cyan
Write-Host "  ========================================" -ForegroundColor Cyan
Write-Host ""

`$APP_DIR = Split-Path `$PSScriptRoot -Parent
`$PG_DIR = "`$APP_DIR\database\postgresql"
`$PG_DATA = "`$APP_DIR\data\pgdata"
`$PG_PORT = 5433
`$APP_PORT = 4200
`$APP_URL = "http://localhost:`$APP_PORT"
`$FIREWALL_RULE_NAME = "Mining Checklist App"

# Verificar si ya hay una instancia corriendo
if (Test-Path "`$PG_DATA\postmaster.pid") {
    Write-Host "  [!] Ya existe una instancia en ejecucion" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  Para iniciar de nuevo, primero debes detener" -ForegroundColor White
    Write-Host "  PostgreSQL y la instancia anterior." -ForegroundColor White
    Write-Host ""
    Write-Host "  Ejecuta Detener.bat y vuelve a intentar." -ForegroundColor Cyan
    Write-Host ""
    Read-Host "  Presiona Enter para cerrar"
    exit 0
}

# Configurar regla de firewall si no existe
`$firewallRule = Get-NetFirewallRule -DisplayName `$FIREWALL_RULE_NAME -ErrorAction SilentlyContinue
if (-not `$firewallRule) {
    Write-Host "  Configurando firewall..." -ForegroundColor Yellow
    try {
        New-NetFirewallRule -DisplayName `$FIREWALL_RULE_NAME -Direction Inbound -Protocol TCP -LocalPort `$APP_PORT -Action Allow | Out-Null
        Write-Host "  [OK] Firewall configurado" -ForegroundColor Green
    } catch {
        Write-Host "  [!] No se pudo configurar el firewall" -ForegroundColor Yellow
    }
}

# Funcion para limpiar al cerrar
function Cleanup {
    Write-Host "``n" -NoNewline
    Write-Host "  Cerrando aplicacion..." -ForegroundColor Yellow
    if (Test-Path "`$PG_DATA\postmaster.pid") {
        Write-Host "  Deteniendo PostgreSQL..." -ForegroundColor Yellow
        & "`$PG_DIR\bin\pg_ctl.exe" stop -D "`$PG_DATA" -m fast -s 2>`$null
        Write-Host "  PostgreSQL detenido." -ForegroundColor Green
    }
    Write-Host ""
}

# Registrar limpieza al cerrar
`$null = Register-EngineEvent -SourceIdentifier PowerShell.Exiting -Action { Cleanup }

`$PRIMERA_VEZ = -not (Test-Path `$PG_DATA)

# Asegurar que existen las carpetas de uploads
if (-not (Test-Path "`$APP_DIR\backend\uploads\imagen")) {
    New-Item -ItemType Directory -Path "`$APP_DIR\backend\uploads\imagen" -Force | Out-Null
}
if (-not (Test-Path "`$APP_DIR\backend\uploads\pdf")) {
    New-Item -ItemType Directory -Path "`$APP_DIR\backend\uploads\pdf" -Force | Out-Null
}

if (`$PRIMERA_VEZ) {
    Write-Host "  [!] Primera ejecucion detectada" -ForegroundColor Yellow
    Write-Host "  Inicializando base de datos..." -ForegroundColor Yellow
    Write-Host ""
    
    New-Item -ItemType Directory -Path `$PG_DATA -Force | Out-Null
    
    `$pwdFile = "`$APP_DIR\data\pwd.tmp"
    "admin" | Out-File -FilePath `$pwdFile -Encoding ASCII -NoNewline
    
    & "`$PG_DIR\bin\initdb.exe" -D "`$PG_DATA" -U postgres --pwfile=`$pwdFile -E UTF8
    Remove-Item `$pwdFile -Force
    
    if (`$LASTEXITCODE -eq 0) {
        Write-Host "  [OK] Base de datos inicializada" -ForegroundColor Green
    } else {
        Write-Host "  [X] Error al inicializar la base de datos" -ForegroundColor Red
        Read-Host "  Presiona Enter para cerrar"
        exit 1
    }
}

Write-Host "  Iniciando PostgreSQL (puerto `$PG_PORT)..." -ForegroundColor Cyan
& "`$PG_DIR\bin\pg_ctl.exe" start -D "`$PG_DATA" -l "`$APP_DIR\data\postgres.log" -o "-p `$PG_PORT"

Start-Sleep -Seconds 3

`$pgRunning = Test-Path "`$PG_DATA\postmaster.pid"
if (`$pgRunning) {
    Write-Host "  [OK] PostgreSQL iniciado" -ForegroundColor Green
} else {
    Write-Host "  [X] Error: PostgreSQL no inicio" -ForegroundColor Red
    Write-Host "      Revisa: data\postgres.log" -ForegroundColor Gray
    Read-Host "  Presiona Enter para cerrar"
    exit 1
}

Write-Host "  Verificando base de datos..." -ForegroundColor Cyan
`$dbExists = & "`$PG_DIR\bin\psql.exe" -h localhost -p `$PG_PORT -U postgres -lqt 2>`$null | Select-String -Pattern "checklist_db" -Quiet

if (-not `$dbExists) {
    Write-Host "  Creando base de datos 'checklist_db'..." -ForegroundColor Yellow
    & "`$PG_DIR\bin\createdb.exe" -h localhost -p `$PG_PORT -U postgres checklist_db 2>`$null
    
    if (`$LASTEXITCODE -eq 0) {
        Write-Host "  [OK] Base de datos creada" -ForegroundColor Green
        
        Set-Location "`$APP_DIR\backend"
        
        Write-Host "  Generando Prisma Client..." -ForegroundColor Gray
        # Ejecutar con ErrorAction Continue para no detener por warnings
        `$ErrorActionPreference = "Continue"
        npx prisma generate *>&1 | Out-Null
        `$generateExitCode = `$LASTEXITCODE
        `$ErrorActionPreference = "Stop"
        
        if (`$generateExitCode -ne 0) {
            Write-Host "  [X] Error al generar Prisma Client" -ForegroundColor Red
            Cleanup
            Read-Host "  Presiona Enter para cerrar"
            exit 1
        }
        Write-Host "  [OK] Prisma Client generado" -ForegroundColor Green
        
        Write-Host "  Ejecutando migraciones..." -ForegroundColor Gray
        `$ErrorActionPreference = "Continue"
        npx prisma migrate deploy *>&1 | Out-Null
        `$migrateExitCode = `$LASTEXITCODE
        `$ErrorActionPreference = "Stop"
        
        if (`$migrateExitCode -eq 0) {
            Write-Host "  [OK] Migraciones ejecutadas" -ForegroundColor Green
            
            Write-Host "  Creando datos iniciales..." -ForegroundColor Gray
            `$ErrorActionPreference = "Continue"
            npm run db:seed *>&1 | Out-Null
            `$seedExitCode = `$LASTEXITCODE
            `$ErrorActionPreference = "Stop"
            
            if (`$seedExitCode -eq 0) {
                Write-Host "  [OK] Datos iniciales creados" -ForegroundColor Green
            } else {
                Write-Host "  [!] Advertencia: Error al crear datos iniciales" -ForegroundColor Yellow
            }
        } else {
            Write-Host "  [X] Error al ejecutar migraciones" -ForegroundColor Red
            Cleanup
            Read-Host "  Presiona Enter para cerrar"
            exit 1
        }
    } else {
        Write-Host "  [X] Error al crear la base de datos" -ForegroundColor Red
        Cleanup
        Read-Host "  Presiona Enter para cerrar"
        exit 1
    }
} else {
    Write-Host "  [OK] Base de datos encontrada" -ForegroundColor Green
}

Write-Host ""
Write-Host "  ----------------------------------------" -ForegroundColor DarkGray
Write-Host "  Iniciando servidor..." -ForegroundColor Cyan
Write-Host "  ----------------------------------------" -ForegroundColor DarkGray
Write-Host ""

# Obtener IP local para acceso en red
`$LOCAL_IP = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { `$_.IPAddress -notlike "127.*" -and `$_.IPAddress -notlike "169.254.*" } | Select-Object -First 1).IPAddress

Write-Host "  La aplicacion estara disponible en:" -ForegroundColor White
Write-Host ""
Write-Host "    Local:    `$APP_URL" -ForegroundColor Green
if (`$LOCAL_IP) {
    Write-Host "    Red:      http://`${LOCAL_IP}:`$APP_PORT" -ForegroundColor Cyan
}
Write-Host ""
Write-Host "  ----------------------------------------" -ForegroundColor DarkGray
Write-Host "  Para cerrar correctamente:" -ForegroundColor White
Write-Host "    - Presiona Ctrl+C en esta ventana" -ForegroundColor Gray
Write-Host "    - O ejecuta Detener.bat" -ForegroundColor Gray
Write-Host "  ----------------------------------------" -ForegroundColor DarkGray
Write-Host ""
Write-Host "  Abriendo navegador en 3 segundos..." -ForegroundColor Gray
Write-Host ""

# Abrir navegador despues de un delay
Start-Job -ScriptBlock {
    param(`$url)
    Start-Sleep -Seconds 3
    Start-Process `$url
} -ArgumentList `$APP_URL | Out-Null

Set-Location "`$APP_DIR\backend"

try {
    npm start
} finally {
    Cleanup
}
"@
$iniciarContent | Out-File -FilePath $iniciarScriptPath -Encoding UTF8
Write-Host "Script Iniciar.ps1 creado" -ForegroundColor Green

# Script BAT para doble clic
$iniciarBatPath = "$DIST_DIR\$APP_NAME\Iniciar.bat"
$iniciarBatContent = @"
@echo off
title Mining Machinery Checklist
color 0B

:: Verificar si es administrador
net session >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ========================================
    echo   Mining Machinery Checklist
    echo ========================================
    echo.
    echo   Se requieren permisos de administrador
    echo   para configurar el firewall.
    echo.
    echo   Solicitando permisos...
    echo.
    
    :: Relanzar como administrador
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit /b
)

echo.
echo ========================================
echo   Mining Machinery Checklist
echo   Iniciando aplicacion...
echo ========================================
echo.

:: Ejecutar el script de PowerShell
powershell -ExecutionPolicy Bypass -File "%~dp0_internal\Iniciar.ps1"

:: Mantener la ventana abierta si hubo error
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Ocurrio un error. Presiona cualquier tecla para cerrar...
    pause >nul
)
"@
$iniciarBatContent | Out-File -FilePath $iniciarBatPath -Encoding ASCII
Write-Host "Script Iniciar.bat creado" -ForegroundColor Green

# Script BAT para detener PostgreSQL
$detenerBatPath = "$DIST_DIR\$APP_NAME\Detener.bat"
$detenerBatContent = @"
@echo off
title Mining Machinery Checklist - Detener
color 0E

echo.
echo ========================================
echo   Deteniendo Mining Machinery Checklist
echo ========================================
echo.

set "APP_DIR=%~dp0"
set "PG_DIR=%APP_DIR%database\postgresql"
set "PG_DATA=%APP_DIR%data\pgdata"

:: Verificar si PostgreSQL esta corriendo
if exist "%PG_DATA%\postmaster.pid" (
    echo Deteniendo PostgreSQL...
    "%PG_DIR%\bin\pg_ctl.exe" stop -D "%PG_DATA%" -m fast
    if %ERRORLEVEL% EQU 0 (
        echo PostgreSQL detenido correctamente.
    ) else (
        echo Error al detener PostgreSQL.
    )
) else (
    echo PostgreSQL no esta corriendo.
)

echo.
echo Presiona cualquier tecla para cerrar...
pause >nul
"@
$detenerBatContent | Out-File -FilePath $detenerBatPath -Encoding ASCII
Write-Host "Script Detener.bat creado" -ForegroundColor Green

# 7. Crear archivo README
Write-Host "`nCreando documentacion..." -ForegroundColor Cyan

$readmeContent = @"
# Mining Machinery Checklist

## Requisitos Previos
- Windows 10/11
- Node.js instalado globalmente (para comandos npm)

## Iniciar la Aplicacion

**Doble clic en ``Iniciar.bat``**

Esto hara lo siguiente automaticamente:
- Primera vez: Inicializa la base de datos y configura todo
- Inicia PostgreSQL
- Inicia el servidor
- Abre el navegador en http://localhost:4200

## Archivos

- **Iniciar.bat** - Inicia la aplicacion (doble clic)
- **Detener.bat** - Detiene PostgreSQL si quedo corriendo
- **Iniciar.ps1** - Script PowerShell (usado internamente)

## Puerto por defecto
- **Aplicacion**: http://localhost:4200
- **PostgreSQL**: localhost:5433

## Credenciales por defecto
- **Usuario PostgreSQL**: postgres
- **Contrasena**: admin
- **Base de datos**: checklist_db

## Notas
- Los datos se guardan en la carpeta ``data/``
- Los logs de PostgreSQL estan en ``data/postgres.log``
- Para detener: Cierra la ventana o presiona Ctrl+C

## Solucion de problemas

### PostgreSQL no inicia
- Ejecuta ``Detener.bat`` y luego ``Iniciar.bat`` nuevamente
- Revisa ``data/postgres.log`` para mas detalles

### Puerto 4200 en uso
- Modifica ``PORT`` en ``backend/.env``
"@

$readmeContent | Out-File -FilePath "$DIST_DIR\$APP_NAME\README.md" -Encoding UTF8
Write-Host "Documentacion creada" -ForegroundColor Green

# ========================================
# FINALIZACION
# ========================================

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  Empaquetado completado              " -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Green

Write-Host "Ubicacion: $DIST_DIR\$APP_NAME\" -ForegroundColor White
Write-Host "`nPara iniciar la aplicacion:" -ForegroundColor Cyan
Write-Host "  Doble clic en Iniciar.bat`n" -ForegroundColor White

Write-Host "La aplicacion estara disponible en: http://localhost:4200" -ForegroundColor Cyan

