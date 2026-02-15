#!/usr/bin/env pwsh
# CSV Encoding Fixer - Converts any CSV to proper UTF-8 encoding
# Usage: .\fix-csv-encoding.ps1

param(
    [Parameter(Mandatory=$false)]
    [string]$FilePath = $(if ($args) { $args[0] } else { "./APPSC_Group2_Practice_Test_150Q.csv" })
)

# Color codes for output
$Green = [System.ConsoleColor]::Green
$Red = [System.ConsoleColor]::Red
$Yellow = [System.ConsoleColor]::Yellow
$White = [System.ConsoleColor]::White

Write-Host "`n╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║          CSV ENCODING FIXER - UTF-8 Converter            ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# Check if file exists
if (-not (Test-Path $FilePath)) {
    Write-Host "❌ ERROR: File not found: $FilePath" -ForegroundColor $Red
    Write-Host "`nUsage: .\fix-csv-encoding.ps1 -FilePath './your-file.csv'" -ForegroundColor $Yellow
    exit 1
}

$FileName = Split-Path $FilePath -Leaf
$FileDir = Split-Path $FilePath -Parent
if ([string]::IsNullOrEmpty($FileDir)) { $FileDir = "." }
$BackupPath = Join-Path $FileDir "$($FileName).backup"

Write-Host "📂 File: $FileName" -ForegroundColor White
Write-Host "📍 Location: $(Resolve-Path $FilePath)" -ForegroundColor White

# Step 1: Detect current encoding
Write-Host "`n[1/4] Detecting current encoding..." -ForegroundColor Cyan

$rawBytes = [System.IO.File]::ReadAllBytes($FilePath)
$encoding = "Unknown"

# Check for BOM
if ($rawBytes.Count -ge 3) {
    if ($rawBytes[0] -eq 0xEF -and $rawBytes[1] -eq 0xBB -and $rawBytes[2] -eq 0xBF) {
        $encoding = "UTF-8 with BOM"
    } elseif ($rawBytes[0] -eq 0xFF -and $rawBytes[1] -eq 0xFE) {
        $encoding = "UTF-16 LE"
    } elseif ($rawBytes[0] -eq 0xFE -and $rawBytes[1] -eq 0xFF) {
        $encoding = "UTF-16 BE"
    } else {
        # Try to detect by checking for valid UTF-8 sequences
        $validUTF8 = $true
        for ($i = 0; $i -lt [Math]::Min($rawBytes.Count, 1000); $i++) {
            $b = $rawBytes[$i]
            if ($b -ge 0x80) {
                # Multi-byte UTF-8 character
                if (($b -band 0xE0) -eq 0xC0) {
                    # 2-byte sequence: should be followed by 10xxxxxx
                    if ($i + 1 -lt $rawBytes.Count -and (($rawBytes[$i+1] -band 0xC0) -ne 0x80)) {
                        $validUTF8 = $false
                        break
                    }
                }
            }
        }
        if ($validUTF8) {
            $encoding = "UTF-8 (no BOM)"
        } else {
            $encoding = "Likely CP-1252 or mixed encoding"
        }
    }
}

Write-Host "  Current Encoding: $encoding" -ForegroundColor Yellow

# Step 2: Read file content (try multiple encodings)
Write-Host "`n[2/4] Reading file content..." -ForegroundColor Cyan

$content = $null
$usedEncoding = $null

# Try UTF-8 first (most likely for our use case)
try {
    $content = [System.IO.File]::ReadAllText($FilePath, [System.Text.Encoding]::UTF8)
    $usedEncoding = "UTF-8"
    Write-Host "  ✓ Read as UTF-8" -ForegroundColor $Green
} catch {
    # Try ISO-8859-1 (often comes from Excel ANSI save)
    try {
        $content = [System.IO.File]::ReadAllText($FilePath, [System.Text.Encoding]::GetEncoding("ISO-8859-1"))
        $usedEncoding = "ISO-8859-1"
        Write-Host "  ✓ Read as ISO-8859-1 (Excel ANSI)" -ForegroundColor Yellow
    } catch {
        # Try default
        $content = Get-Content $FilePath -Raw -Encoding Default
        $usedEncoding = "Default"
        Write-Host "  ✓ Read as Default encoding" -ForegroundColor Yellow
    }
}

# Step 3: Create backup
Write-Host "`n[3/4] Creating backup..." -ForegroundColor Cyan
Copy-Item $FilePath $BackupPath -Force | Out-Null
Write-Host "  ✓ Backup created: $($FileName).backup" -ForegroundColor $Green

# Step 4: Save in UTF-8 (no BOM)
Write-Host "`n[4/4] Writing file in UTF-8 (no BOM)..." -ForegroundColor Cyan

$UTF8NoBOM = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($FilePath, $content, $UTF8NoBOM)

Write-Host "  ✓ File saved in UTF-8 encoding (no BOM)" -ForegroundColor $Green

# Verification
Write-Host "`n🔍 Verification:" -ForegroundColor Cyan

$newBytes = [System.IO.File]::ReadAllBytes($FilePath)

# Check new encoding
if ($newBytes.Count -ge 3 -and $newBytes[0] -eq 0xEF -and $newBytes[1] -eq 0xBB -and $newBytes[2] -eq 0xBF) {
    Write-Host "  ⚠️  WARNING: File has UTF-8 BOM (should be removed)" -ForegroundColor Yellow
    Write-Host "     Use: Get-Content file.csv | Out-File file.csv -Encoding UTF8NoBOM" -ForegroundColor Yellow
} else {
    Write-Host "  ✓ File has no BOM (correct!)" -ForegroundColor $Green
}

# Preview first 2 rows
Write-Host "`n📄 Preview (first 2 rows):" -ForegroundColor Cyan
$firstTwoLines = $content -split "`n" | Select-Object -First 2
foreach ($line in $firstTwoLines) {
    if ($line.Length -gt 100) {
        Write-Host "  $($line.Substring(0, 100))..." -ForegroundColor White
    } else {
        Write-Host "  $line" -ForegroundColor White
    }
}

# Line count
$lineCount = @($content -split "`n").Count
Write-Host "`n📊 File Statistics:" -ForegroundColor Cyan
Write-Host "  Total lines: $lineCount" -ForegroundColor White
Write-Host "  Encoding: UTF-8 (no BOM)" -ForegroundColor $Green
Write-Host "  File size: $([Math]::Round([System.IO.File]::ReadAllBytes($FilePath).Count / 1KB, 2)) KB" -ForegroundColor White

Write-Host "`n✅ SUCCESS! Your CSV is now properly encoded in UTF-8." -ForegroundColor $Green
Write-Host "📤 You can now upload this file to your platform." -ForegroundColor Cyan
Write-Host "`n💾 Backup saved to: $BackupPath" -ForegroundColor White
Write-Host "🔄 If something goes wrong, restore from backup." -ForegroundColor White

Write-Host "`n════════════════════════════════════════════════════════════`n" -ForegroundColor Cyan
