# DemoGo v0.9.30 - Version sync script
# Reads VERSION file and syncs all package.json files

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$version = (Get-Content (Join-Path $root "VERSION") -Raw).Trim()

$packages = @(
    "server\package.json",
    "web\package.json",
    "cli\package.json",
    "mcp\package.json"
)

$updated = 0
foreach ($pkgPath in $packages) {
    $fullPath = Join-Path $root $pkgPath
    if (-not (Test-Path $fullPath)) {
        Write-Host "SKIP: $pkgPath (not found)"
        continue
    }
    $pkg = Get-Content $fullPath -Raw | ConvertFrom-Json
    if ($pkg.version -ne $version) {
        $old = $pkg.version
        $content = Get-Content $fullPath -Raw
        $content = $content -replace "`"version`":\s*`"$old`"", "`"version`": `"$version`""
        Set-Content $fullPath $content -NoNewline
        Write-Host "SYNC: $pkgPath  $old -> $version"
        $updated++
    } else {
        Write-Host "OK:   $pkgPath = $version"
    }
}

Write-Host ""
if ($updated -eq 0) {
    Write-Host "All package.json files match VERSION ($version)."
} else {
    Write-Host "Updated $updated package.json file(s) to version $version."
}
