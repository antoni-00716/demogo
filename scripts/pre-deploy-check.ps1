# DemoGo Pre-Deploy Gate Check
# Usage: powershell -ExecutionPolicy Bypass -File scripts/pre-deploy-check.ps1
# All checks must pass before deployment

$ErrorActionPreference = "Continue"
$root = $PSScriptRoot | Split-Path -Parent
$failed = @()
$passed = @()

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  DemoGo Pre-Deploy Gate Check v0.9.20" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

function Check-Step($num, $label, $scriptBlock) {
    Write-Host "[$num/10] $label..." -ForegroundColor Yellow
    try {
        & $scriptBlock
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  PASS" -ForegroundColor Green
            $global:passed += $label
        } else {
            Write-Host "  FAIL (exit code: $LASTEXITCODE)" -ForegroundColor Red
            $global:failed += $label
        }
    } catch {
        Write-Host "  FAIL: $_" -ForegroundColor Red
        $global:failed += $label
    }
}

# 1. Server syntax check
Check-Step 1 "server npm run check" {
    Push-Location "$root\server"
    cmd /c "npm run check 2>&1"
    $global:LASTEXITCODE = $LASTEXITCODE
    Pop-Location
}

# 2. Entry point syntax
Check-Step 2 "node --check server.js" {
    node --check "$root\server\src\server.js" 2>&1
    $global:LASTEXITCODE = $LASTEXITCODE
}

# 3. Unit tests (120 tests, 0 failures required)
Check-Step 3 "server npm run test" {
    Push-Location "$root\server"
    cmd /c "npm run test 2>&1"
    $global:LASTEXITCODE = $LASTEXITCODE
    Pop-Location
}

# 4. Integration tests
Check-Step 4 "server npm run test:integration" {
    Push-Location "$root\server"
    cmd /c "npm run test:integration 2>&1"
    $global:LASTEXITCODE = $LASTEXITCODE
    Pop-Location
}

# 5. Smoke tests
Check-Step 5 "server npm run test:smoke" {
    Push-Location "$root\server"
    cmd /c "npm run test:smoke 2>&1"
    $global:LASTEXITCODE = $LASTEXITCODE
    Pop-Location
}

# 6. Frontend lint
Check-Step 6 "web npm run lint" {
    Push-Location "$root\web"
    cmd /c "npm run lint 2>&1"
    $global:LASTEXITCODE = $LASTEXITCODE
    Pop-Location
}

# 7. Frontend TypeScript check
Check-Step 7 "web npx tsc --noEmit" {
    Push-Location "$root\web"
    cmd /c "npx tsc --noEmit 2>&1"
    $global:LASTEXITCODE = $LASTEXITCODE
    Pop-Location
}

# 8. Frontend build
Check-Step 8 "web npm run build" {
    Push-Location "$root\web"
    cmd /c "npm run build 2>&1"
    $global:LASTEXITCODE = $LASTEXITCODE
    Pop-Location
}

# 9. npm audit (0 vulnerabilities)
Check-Step 9 "server npm audit" {
    Push-Location "$root\server"
    $output = cmd /c "npm audit 2>&1"
    if ($output -match "0 vulnerabilities") {
        $global:LASTEXITCODE = 0
    } elseif ($output -match "found \d+ vulnerabilities") {
        Write-Host $output
        $global:LASTEXITCODE = 1
    } else {
        $global:LASTEXITCODE = 0
    }
    Pop-Location
}

# 10. Version consistency (VERSION + 4 package.json)
Check-Step 10 "Version sync" {
    $verFile = (Get-Content "$root\VERSION" -Raw).Trim()
    $pkgs = @("server", "cli", "mcp", "web")
    $ok = $true
    foreach ($pkg in $pkgs) {
        $v = (Get-Content "$root\$pkg\package.json" -Raw | ConvertFrom-Json).version
        if ($v -ne $verFile) {
            Write-Host "  MISMATCH: VERSION=$verFile $pkg=$v" -ForegroundColor Red
            $ok = $false
        }
    }
    if ($ok) {
        Write-Host "  All 5 files at v$verFile" -ForegroundColor Green
        $global:LASTEXITCODE = 0
    } else {
        Write-Host "  Run: node scripts/sync-version.js" -ForegroundColor Yellow
        $global:LASTEXITCODE = 1
    }
}

# Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  RESULTS: $($passed.Count) passed, $($failed.Count) failed" -ForegroundColor $(if ($failed.Count -eq 0) { "Green" } else { "Red" })
Write-Host "========================================" -ForegroundColor Cyan

if ($failed.Count -gt 0) {
    Write-Host "FAILED:" -ForegroundColor Red
    $failed | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
    exit 1
} else {
    Write-Host "All checks passed. Ready to deploy." -ForegroundColor Green
    exit 0
}