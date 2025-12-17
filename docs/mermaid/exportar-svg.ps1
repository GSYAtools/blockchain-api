# Script para exportar todos los diagramas Mermaid a SVG
# Uso: .\exportar-svg.ps1

Write-Host "`nExportador de Diagramas Mermaid a SVG`n" -ForegroundColor Cyan

# Verificar si mmdc está instalado
$mmdcExists = Get-Command mmdc -ErrorAction SilentlyContinue

if (-not $mmdcExists) {
    Write-Host "[ERROR] mermaid-cli (mmdc) no esta instalado" -ForegroundColor Red
    Write-Host "`nInstalacion:`n" -ForegroundColor Yellow
    Write-Host "  npm install -g @mermaid-js/mermaid-cli`n" -ForegroundColor White
    Write-Host "Despues de instalar, vuelve a ejecutar este script.`n" -ForegroundColor Yellow
    exit 1
}

# Crear carpeta de salida
$outputDir = "..\images"
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Force -Path $outputDir | Out-Null
    Write-Host "[OK] Carpeta creada: $outputDir`n" -ForegroundColor Green
}

# Contador
$total = 0
$exitosos = 0
$fallidos = 0

# Obtener todos los archivos .mmd
$archivos = Get-ChildItem -Filter "*.mmd"

if ($archivos.Count -eq 0) {
    Write-Host "[ERROR] No se encontraron archivos .mmd en esta carpeta" -ForegroundColor Red
    exit 1
}

Write-Host "Archivos encontrados: $($archivos.Count)`n" -ForegroundColor Cyan

# Exportar cada archivo
foreach ($archivo in $archivos) {
    $total++
    $inputFile = $archivo.Name
    $outputFile = Join-Path $outputDir ($archivo.BaseName + ".svg")
    
    Write-Host "[$total/$($archivos.Count)] Exportando: $inputFile" -ForegroundColor Yellow -NoNewline
    
    try {
        # Ejecutar mmdc para SVG (vectorial, mejor calidad)
        $result = mmdc -i $inputFile -o $outputFile 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host " [OK]" -ForegroundColor Green
            $exitosos++
        } else {
            Write-Host " [ERROR]" -ForegroundColor Red
            Write-Host "  Error: $result" -ForegroundColor Red
            $fallidos++
        }
    } catch {
        Write-Host " [ERROR]" -ForegroundColor Red
        Write-Host "  Error: $_" -ForegroundColor Red
        $fallidos++
    }
}

# Resumen
Write-Host "`n" + ("=" * 60) -ForegroundColor Cyan
Write-Host "RESUMEN DE EXPORTACION SVG" -ForegroundColor Cyan
Write-Host ("=" * 60) -ForegroundColor Cyan
Write-Host "Total de archivos:  $total" -ForegroundColor White
Write-Host "Exitosos:           $exitosos" -ForegroundColor Green
Write-Host "Fallidos:           $fallidos" -ForegroundColor $(if ($fallidos -gt 0) { "Red" } else { "White" })
Write-Host "Carpeta de salida:  $outputDir" -ForegroundColor White
Write-Host "Formato:            SVG (vectorial)" -ForegroundColor Cyan
Write-Host ("=" * 60) -ForegroundColor Cyan

if ($exitosos -gt 0) {
    Write-Host "`n[OK] Exportacion SVG completada!" -ForegroundColor Green
    Write-Host "[INFO] Los archivos SVG son vectoriales y mantienen calidad al escalar" -ForegroundColor Cyan
    
    # Abrir carpeta de imagenes
    $respuesta = Read-Host "`nQuieres abrir la carpeta de imagenes? (S/N)"
    if ($respuesta -eq "S" -or $respuesta -eq "s") {
        Invoke-Item (Resolve-Path $outputDir)
    }
} else {
    Write-Host "`n[ERROR] No se pudo exportar ningun archivo. Revisa los errores arriba." -ForegroundColor Red
}

Write-Host ""
