# ========================================
# Mining Machinery Checklist
# Script Unificado de Producción y Empaquetado
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

# Configuración
$APP_NAME = "MiningChecklistApp"
$DIST_DIR = "dist-release"
$POSTGRES_VERSION = "16.1-1"
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
    Write-Host "   Backend:  http://localhost:3000\n" -ForegroundColor White
    
    # Iniciar backend
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\back'; pnpm run dev"
    
    # Iniciar frontend
    Start-Sleep -Seconds 2
    Set-Location front
    npm start
    
    exit 0
}

# ========================================
# COMPILACIÓN
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

# 1. Compilar aplicación
Write-Host "`nCompilando aplicación..." -ForegroundColor Cyan

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

Write-Host "Aplicación compilada" -ForegroundColor Green

# Si solo se pidió compilar, terminar aquí
if ($build) {
    Write-Host "`nCompilación completada. Para iniciar en producción:" -ForegroundColor Green
    Write-Host "   cd back" -ForegroundColor White
    Write-Host "   pnpm run start:prod`n" -ForegroundColor White
    exit 0
}

# ========================================
# EMPAQUETADO PARA DISTRIBUCIÓN
# ========================================

Write-Host "`nCreando paquete de distribución..." -ForegroundColor Cyan

# Limpiar distribución anterior
if (Test-Path $DIST_DIR) {
    Write-Host "Limpiando distribución anterior..." -ForegroundColor Yellow
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
Copy-Item "back\package.json" "$DIST_DIR\$APP_NAME\backend\"
Copy-Item "back\prisma" "$DIST_DIR\$APP_NAME\backend\" -Recurse
Copy-Item "back\node_modules" "$DIST_DIR\$APP_NAME\backend\" -Recurse
Write-Host "Backend copiado" -ForegroundColor Green

# 3. Copiar frontend compilado
Write-Host "`nCopiando frontend..." -ForegroundColor Cyan
Copy-Item "front\dist\checklist\browser" "$DIST_DIR\$APP_NAME\backend\public" -Recurse
Write-Host "Frontend copiado" -ForegroundColor Green

# 4. Descargar PostgreSQL Portable
Write-Host "`nDescargando PostgreSQL Portable..." -ForegroundColor Cyan
$POSTGRES_ZIP = "$DIST_DIR\postgres.zip"

try {
    Invoke-WebRequest -Uri $POSTGRES_PORTABLE_URL -OutFile $POSTGRES_ZIP -UseBasicParsing
    Write-Host "PostgreSQL descargado" -ForegroundColor Green
} catch {
    Write-Host "No se pudo descargar automáticamente" -ForegroundColor Yellow
    Write-Host "   Descarga manualmente desde:" -ForegroundColor Yellow
    Write-Host "   $POSTGRES_PORTABLE_URL" -ForegroundColor White
    Write-Host "   Y colócalo en: $POSTGRES_ZIP" -ForegroundColor White
    $response = Read-Host "`n¿Continuar sin PostgreSQL? (S/N)"
    if ($response -ne "S" -and $response -ne "s") {
        exit 1
    }
}

# 5. Extraer PostgreSQL
if (Test-Path $POSTGRES_ZIP) {
    Write-Host "`n📂 Extrayendo PostgreSQL..." -ForegroundColor Cyan
    Expand-Archive -Path $POSTGRES_ZIP -DestinationPath "$DIST_DIR\$APP_NAME\database\postgresql" -Force
    Remove-Item $POSTGRES_ZIP
    Write-Host "PostgreSQL extraído" -ForegroundColor Green
}

# 6. Crear archivo .env de producción
Write-Host "`nCreando configuración..." -ForegroundColor Cyan
$envContent = @"
JWT_SECRET=mining-checklist-jwt-secret-$(Get-Random -Minimum 10000000 -Maximum 99999999)
COOKIE_SECRET=mining-checklist-cookie-secret-$(Get-Random -Minimum 10000000 -Maximum 99999999)
NODE_ENV=production
PORT=3000
HOST=127.0.0.1
DATABASE_URL="postgresql://postgres:admin@localhost:5433/checklist_db"
"@
$envContent | Out-File -FilePath "$DIST_DIR\$APP_NAME\backend\.env" -Encoding UTF8
Write-Host "Configuración creada" -ForegroundColor Green

# 7. Crear scripts de inicio
Write-Host "`nCreando scripts de inicio..." -ForegroundColor Cyan

# Script principal de inicio
$iniciarScript = @'
# Mining Machinery Checklist - Inicio Automático
$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Mining Machinery Checklist          " -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$APP_DIR = $PSScriptRoot
$PG_DIR = "$APP_DIR\database\postgresql\pgsql"
$PG_DATA = "$APP_DIR\data\pgdata"
$PG_PORT = 5433

# Verificar si es primera ejecución
$PRIMERA_VEZ = -not (Test-Path $PG_DATA)

if ($PRIMERA_VEZ) {
    Write-Host "🎉 Primera ejecución - Configurando..." -ForegroundColor Yellow
    
    # Crear directorio de datos
    New-Item -ItemType Directory -Path $PG_DATA -Force | Out-Null
    
    # Inicializar PostgreSQL
    Write-Host "Inicializando base de datos..." -ForegroundColor Cyan
    & "$PG_DIR\bin\initdb.exe" -D $PG_DATA -U postgres -A trust --locale=C --encoding=UTF8
    
    # Configurar PostgreSQL para usar puerto 5433
    $pgConf = "$PG_DATA\postgresql.conf"
    (Get-Content $pgConf) -replace '#port = 5432', "port = $PG_PORT" | Set-Content $pgConf
    (Get-Content $pgConf) -replace '#listen_addresses = ''localhost''', "listen_addresses = 'localhost'" | Set-Content $pgConf
    
    Write-Host "Base de datos inicializada" -ForegroundColor Green
}

# Iniciar PostgreSQL
Write-Host "`nIniciando PostgreSQL..." -ForegroundColor Cyan
$pgProcess = Start-Process -FilePath "$PG_DIR\bin\pg_ctl.exe" `
    -ArgumentList "-D `"$PG_DATA`" -l `"$APP_DIR\data\postgres.log`" start" `
    -PassThru -WindowStyle Hidden

Start-Sleep -Seconds 3

# Verificar que PostgreSQL esté corriendo
$pgRunning = $false
for ($i = 0; $i -lt 10; $i++) {
    try {
        $connection = Test-NetConnection -ComputerName localhost -Port $PG_PORT -WarningAction SilentlyContinue -ErrorAction SilentlyContinue
        if ($connection.TcpTestSucceeded) {
            $pgRunning = $true
            break
        }
    } catch {}
    Start-Sleep -Seconds 1
}

if (-not $pgRunning) {
    Write-Host "Error: PostgreSQL no pudo iniciarse" -ForegroundColor Red
    Write-Host "   Revisa el log en: $APP_DIR\data\postgres.log" -ForegroundColor Yellow
    exit 1
}

Write-Host "PostgreSQL iniciado en puerto $PG_PORT" -ForegroundColor Green

if ($PRIMERA_VEZ) {
    Write-Host "`nCreando base de datos..." -ForegroundColor Cyan
    & "$PG_DIR\bin\psql.exe" -U postgres -p $PG_PORT -c "CREATE DATABASE checklist_db;"
    
    Write-Host "Aplicando migraciones..." -ForegroundColor Cyan
    Set-Location "$APP_DIR\backend"
    $env:DATABASE_URL = "postgresql://postgres:admin@localhost:$PG_PORT/checklist_db"
    node node_modules\.bin\prisma migrate deploy
    
    Write-Host "Poblando datos iniciales..." -ForegroundColor Cyan
    node node_modules\.bin\tsx prisma/seed.ts
    
    Set-Location $APP_DIR
    Write-Host "Base de datos configurada" -ForegroundColor Green
}

# Iniciar aplicación
Write-Host "`nIniciando aplicación..." -ForegroundColor Cyan
Set-Location "$APP_DIR\backend"
$appProcess = Start-Process -FilePath "node" -ArgumentList "dist/server.js" -PassThru -WindowStyle Hidden

Start-Sleep -Seconds 2

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  Aplicación Iniciada                " -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "`nAbre tu navegador en:" -ForegroundColor Cyan
Write-Host "   http://localhost:3000`n" -ForegroundColor White

Write-Host "Credenciales de acceso:" -ForegroundColor Cyan
Write-Host "   Usuario: admin@normet.com" -ForegroundColor White
Write-Host "   Contraseña: password123`n" -ForegroundColor White

Write-Host "Para detener la aplicación, cierra esta ventana`n" -ForegroundColor Yellow

# Esperar y monitorear
try {
    while ($true) {
        Start-Sleep -Seconds 5
        if ($appProcess.HasExited) {
            Write-Host "`nLa aplicación se detuvo inesperadamente" -ForegroundColor Red
            break
        }
    }
} finally {
    # Cleanup al cerrar
    Write-Host "`n🛑 Deteniendo servicios..." -ForegroundColor Yellow
    
    if (-not $appProcess.HasExited) {
        Stop-Process -Id $appProcess.Id -Force -ErrorAction SilentlyContinue
    }
    
    & "$PG_DIR\bin\pg_ctl.exe" -D $PG_DATA stop
    
    Write-Host "Aplicación detenida" -ForegroundColor Green
}
'@

$iniciarScript | Out-File -FilePath "$DIST_DIR\$APP_NAME\INICIAR.ps1" -Encoding UTF8

# Script de desinstalación
$desinstalarScript = @'
Write-Host "Deteniendo servicios..." -ForegroundColor Yellow

$APP_DIR = $PSScriptRoot
$PG_DATA = "$APP_DIR\data\pgdata"
$PG_DIR = "$APP_DIR\database\postgresql\pgsql"

if (Test-Path $PG_DATA) {
    & "$PG_DIR\bin\pg_ctl.exe" -D $PG_DATA stop -m fast
}

Write-Host "`n¿Deseas eliminar TODOS los datos de la aplicación?" -ForegroundColor Yellow
Write-Host "   Esto incluye la base de datos y no se puede deshacer." -ForegroundColor Red
$response = Read-Host "Escribe 'ELIMINAR' para confirmar"

if ($response -eq "ELIMINAR") {
    Remove-Item "$APP_DIR\data" -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "Datos eliminados" -ForegroundColor Green
} else {
    Write-Host "Cancelado" -ForegroundColor Yellow
}
'@

$desinstalarScript | Out-File -FilePath "$DIST_DIR\$APP_NAME\DESINSTALAR.ps1" -Encoding UTF8

Write-Host "Scripts creados" -ForegroundColor Green

# 8. Crear README
Write-Host "`nCreando documentación..." -ForegroundColor Cyan
$readmeContent = @"
# Mining Machinery Checklist

## Instalación

1. Extrae esta carpeta donde desees
2. Haz doble clic en: INICIAR.ps1
3. La primera vez tomará unos minutos configurando la base de datos
4. Se abrirá automáticamente tu navegador en http://localhost:3000

## Credenciales de Acceso

- Usuario: admin@normet.com
- Contraseña: password123

IMPORTANTE: Cambia la contraseña después del primer inicio de sesión

## Uso Diario

- Para iniciar: Doble clic en INICIAR.ps1
- Para detener: Cierra la ventana de PowerShell
- Los datos se guardan automáticamente

## Desinstalación

- Ejecuta: DESINSTALAR.ps1
- Esto detendrá los servicios
- Opcionalmente puedes eliminar todos los datos

## Soporte

Ubicación de logs: data\postgres.log
Ubicación de datos: data\pgdata

---
Versión: 1.0.0
"@

$readmeContent | Out-File -FilePath "$DIST_DIR\$APP_NAME\LEEME.txt" -Encoding UTF8
Write-Host "Documentación creada" -ForegroundColor Green

# 9. Crear acceso directo (opcional)
Write-Host "`nCreando acceso directo..." -ForegroundColor Cyan
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("$DIST_DIR\$APP_NAME\Iniciar Mining Checklist.lnk")
$Shortcut.TargetPath = "powershell.exe"
$Shortcut.Arguments = "-ExecutionPolicy Bypass -File `"$APP_DIR\INICIAR.ps1`""
$Shortcut.WorkingDirectory = "$DIST_DIR\$APP_NAME"
$Shortcut.WindowStyle = 1
$Shortcut.Description = "Iniciar Mining Machinery Checklist"
$Shortcut.Save()
Write-Host "Acceso directo creado" -ForegroundColor Green

# 10. Crear archivo ZIP final
Write-Host "`nComprimiendo paquete final..." -ForegroundColor Cyan
$zipName = "MiningChecklistApp-v1.0.0.zip"
Compress-Archive -Path "$DIST_DIR\$APP_NAME" -DestinationPath "$DIST_DIR\$zipName" -Force
Write-Host "Paquete comprimido: $zipName" -ForegroundColor Green

# Resumen
Write-Host "`n========================================" -ForegroundColor Green
Write-Host "  Empaquetado Completo               " -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green

$packageSize = (Get-Item "$DIST_DIR\$zipName").Length / 1MB
Write-Host "`nPaquete generado:" -ForegroundColor Cyan
Write-Host "   Ubicación: $DIST_DIR\$zipName" -ForegroundColor White
Write-Host "   Tamaño: $([math]::Round($packageSize, 2)) MB`n" -ForegroundColor White

Write-Host "Instrucciones para el cliente:" -ForegroundColor Cyan
Write-Host "   1. Extraer el archivo ZIP" -ForegroundColor White
Write-Host "   2. Doble clic en 'Iniciar Mining Checklist.lnk'" -ForegroundColor White
Write-Host "   3. Esperar que se configure (solo primera vez)" -ForegroundColor White
Write-Host "   4. Acceder a http://localhost:3000`n" -ForegroundColor White

Write-Host "¡Listo para distribuir!" -ForegroundColor Green
