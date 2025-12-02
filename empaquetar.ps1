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
New-Item -ItemType Directory -Path "$DIST_DIR\$APP_NAME\database" -Force | Out-Null
New-Item -ItemType Directory -Path "$DIST_DIR\$APP_NAME\data" -Force | Out-Null

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
Copy-Item "back\node_modules" "$DIST_DIR\$APP_NAME\backend\" -Recurse
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
$envContent = "JWT_SECRET=mining-checklist-jwt-secret-$random1`r`nCOOKIE_SECRET=mining-checklist-cookie-secret-$random2`r`nNODE_ENV=production`r`nPORT=3000`r`nHOST=127.0.0.1`r`nDATABASE_URL=postgresql://postgres:admin@localhost:5433/checklist_db"
$envContent | Out-File -FilePath "$DIST_DIR\$APP_NAME\backend\.env" -Encoding UTF8
Write-Host "Configuracion creada" -ForegroundColor Green

# 6. Crear scripts de inicio
Write-Host "`nCreando scripts de inicio..." -ForegroundColor Cyan

# Script principal de inicio
$iniciarScriptPath = "$DIST_DIR\$APP_NAME\Iniciar.ps1"
$iniciarContent = @"
`$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Mining Machinery Checklist          " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

`$APP_DIR = `$PSScriptRoot
`$PG_DIR = "`$APP_DIR\database\postgresql"
`$PG_DATA = "`$APP_DIR\data\pgdata"
`$PG_PORT = 5433

`$PRIMERA_VEZ = -not (Test-Path `$PG_DATA)

if (`$PRIMERA_VEZ) {
    Write-Host "Primera ejecucion detectada..." -ForegroundColor Yellow
    Write-Host "Inicializando base de datos..." -ForegroundColor Yellow
    
    New-Item -ItemType Directory -Path `$PG_DATA -Force | Out-Null
    
    # Crear archivo de contrasena temporal
    `$pwdFile = "`$APP_DIR\data\pwd.tmp"
    "admin" | Out-File -FilePath `$pwdFile -Encoding ASCII -NoNewline
    
    & "`$PG_DIR\bin\initdb.exe" -D "`$PG_DATA" -U postgres --pwfile=`$pwdFile -E UTF8
    Remove-Item `$pwdFile -Force
    
    if (`$LASTEXITCODE -eq 0) {
        Write-Host "Base de datos inicializada correctamente" -ForegroundColor Green
    } else {
        Write-Host "Error al inicializar la base de datos" -ForegroundColor Red
        exit 1
    }
}

Write-Host "`nIniciando PostgreSQL en puerto `$PG_PORT..." -ForegroundColor Cyan
& "`$PG_DIR\bin\pg_ctl.exe" start -D "`$PG_DATA" -l "`$APP_DIR\data\postgres.log" -o "-p `$PG_PORT"

Start-Sleep -Seconds 3

# Verificar si PostgreSQL inicio correctamente
`$pgRunning = Test-Path "`$PG_DATA\postmaster.pid"
if (`$pgRunning) {
    Write-Host "PostgreSQL iniciado correctamente" -ForegroundColor Green
} else {
    Write-Host "Error: PostgreSQL no inicio. Revisa data\postgres.log" -ForegroundColor Red
    exit 1
}

# Si es primera vez, crear la base de datos y ejecutar migraciones
if (`$PRIMERA_VEZ) {
    Write-Host "`nConfigurando base de datos de la aplicacion..." -ForegroundColor Cyan
    
    # Crear la base de datos
    Write-Host "Creando base de datos 'checklist_db'..." -ForegroundColor Gray
    & "`$PG_DIR\bin\createdb.exe" -h localhost -p `$PG_PORT -U postgres checklist_db
    
    if (`$LASTEXITCODE -eq 0) {
        Write-Host "Base de datos 'checklist_db' creada correctamente" -ForegroundColor Green
    } else {
        Write-Host "Error al crear la base de datos" -ForegroundColor Red
        & "`$PG_DIR\bin\pg_ctl.exe" stop -D "`$PG_DATA" -s
        exit 1
    }
    
    # Ejecutar migraciones de Prisma
    Write-Host "Ejecutando migraciones de base de datos..." -ForegroundColor Gray
    Set-Location "`$APP_DIR\backend"
    npx prisma migrate deploy
    
    if (`$LASTEXITCODE -eq 0) {
        Write-Host "Migraciones ejecutadas correctamente" -ForegroundColor Green
    } else {
        Write-Host "Error al ejecutar migraciones" -ForegroundColor Red
        & "`$PG_DIR\bin\pg_ctl.exe" stop -D "`$PG_DATA" -s
        exit 1
    }
    
    Write-Host "`nConfiguracion inicial completada!`n" -ForegroundColor Green
}

Write-Host "`nIniciando backend..." -ForegroundColor Cyan
Set-Location "`$APP_DIR\backend"
npm start

Write-Host "`nDeteniendo PostgreSQL..." -ForegroundColor Yellow
& "`$PG_DIR\bin\pg_ctl.exe" stop -D "`$PG_DATA" -s
"@
$iniciarContent | Out-File -FilePath $iniciarScriptPath -Encoding UTF8
Write-Host "Script de inicio creado" -ForegroundColor Green

# Script para setup inicial
$setupScriptPath = "$DIST_DIR\$APP_NAME\Setup.ps1"
$setupContent = @"
`$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Setup - Mining Machinery Checklist   " -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

`$APP_DIR = `$PSScriptRoot
`$PG_DIR = "`$APP_DIR\database\postgresql"
`$PG_DATA = "`$APP_DIR\data\pgdata"
`$PG_PORT = 5433

New-Item -ItemType Directory -Path `$PG_DATA -Force | Out-Null

Write-Host "Inicializando base de datos PostgreSQL..." -ForegroundColor Cyan

# Crear archivo de contrasena temporal
`$pwdFile = "`$APP_DIR\data\pwd.tmp"
"admin" | Out-File -FilePath `$pwdFile -Encoding ASCII -NoNewline

& "`$PG_DIR\bin\initdb.exe" -D "`$PG_DATA" -U postgres --pwfile=`$pwdFile -E UTF8
Remove-Item `$pwdFile -Force

if (`$LASTEXITCODE -eq 0) {
    Write-Host "Base de datos inicializada correctamente" -ForegroundColor Green
    
    Write-Host "`nInstalando dependencias..." -ForegroundColor Cyan
    Set-Location "`$APP_DIR\backend"
    npm install
    
    Write-Host "`nSetup completado exitosamente" -ForegroundColor Green
    Write-Host "`nProximo paso: Ejecuta Iniciar.ps1 para iniciar la aplicacion`n" -ForegroundColor White
} else {
    Write-Host "Error al inicializar la base de datos" -ForegroundColor Red
    exit 1
}
"@
$setupContent | Out-File -FilePath $setupScriptPath -Encoding UTF8
Write-Host "Script de setup creado" -ForegroundColor Green

# 7. Crear archivo README
Write-Host "`nCreando documentacion..." -ForegroundColor Cyan

$readmeContent = @"
# Mining Machinery Checklist

## Requisitos Previos
- Windows 10/11
- PowerShell 5.0 o superior
- Node.js instalado globalmente (para comandos npm)

## Instalacion

1. **Primer uso**: Ejecuta ``Setup.ps1`` en PowerShell (como administrador)
   - Inicializa PostgreSQL
   - Instala dependencias de Node.js
   
2. **Iniciar la aplicacion**: Ejecuta ``Iniciar.ps1``
   - Levanta PostgreSQL
   - Inicia el backend
   - Abre http://localhost:3000

## Puerto por defecto
- **Aplicacion**: http://localhost:3000
- **PostgreSQL**: localhost:5433

## Credenciales por defecto
- **Usuario PostgreSQL**: postgres
- **Contrasena**: admin (cambiar en produccion)
- **Base de datos**: checklist_db

## Notas
- Los datos se guardan en la carpeta ``data/``
- Los logs de PostgreSQL estan en ``data/postgres.log``
- Para detener la aplicacion: Presiona Ctrl+C en PowerShell

## Solucion de problemas

### PostgreSQL no inicia
- Verifica que no hay otra instancia en puerto 5433
- Revisa ``data/postgres.log`` para mas detalles

### Puerto 3000 en uso
- Modifica ``PORT`` en ``backend/.env``

## Desarrollo
Para trabajar en desarrollo:
``````
.\empaquetar.ps1 -dev
``````
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
Write-Host "`nProximos pasos:" -ForegroundColor Cyan
Write-Host "  1. cd $DIST_DIR\$APP_NAME" -ForegroundColor White
Write-Host "  2. .\Setup.ps1" -ForegroundColor White
Write-Host "  3. .\Iniciar.ps1`n" -ForegroundColor White

Write-Host "La aplicacion estara disponible en: http://localhost:3000" -ForegroundColor Cyan
