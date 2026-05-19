$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$Dist = Join-Path $ProjectRoot "dist"
$WebRoot = Join-Path $ProjectRoot "web"
$WebDist = Join-Path $WebRoot "dist"
$Version = "0.2.7"

New-Item -ItemType Directory -Force -Path $Dist | Out-Null

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

function New-ZipFromDirectory {
  param(
    [Parameter(Mandatory = $true)][string]$SourceDir,
    [Parameter(Mandatory = $true)][string]$DestinationZip
  )

  if (Test-Path $DestinationZip) {
    Remove-Item -Force $DestinationZip
  }

  $sourceRoot = (Resolve-Path $SourceDir).Path.TrimEnd("\", "/")
  $archive = [System.IO.Compression.ZipFile]::Open($DestinationZip, [System.IO.Compression.ZipArchiveMode]::Create)
  try {
    Get-ChildItem -LiteralPath $sourceRoot -Recurse -File | ForEach-Object {
      $relativePath = $_.FullName.Substring($sourceRoot.Length).TrimStart("\", "/") -replace "\\", "/"
      [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
        $archive,
        $_.FullName,
        $relativePath,
        [System.IO.Compression.CompressionLevel]::Optimal
      ) | Out-Null
    }
  }
  finally {
    $archive.Dispose()
  }
}

$SiteZip = Join-Path $Dist "demogo-site-preview.zip"
$ServerZip = Join-Path $Dist "demogo-server-v$Version.zip"
$OpsZip = Join-Path $Dist "demogo-ops-scripts-v$Version.zip"
$CliZip = Join-Path $Dist "demogo-cli-v$Version.zip"
$McpZip = Join-Path $Dist "demogo-mcp-v$Version.zip"
$CodexSkillZip = Join-Path $Dist "demogo-codex-skill-v$Version.zip"

Remove-Item -Force -ErrorAction SilentlyContinue $SiteZip, $ServerZip, $OpsZip, $CliZip, $McpZip, $CodexSkillZip

$PreviousLocation = Get-Location
try {
  Set-Location $WebRoot
  npm run build
}
finally {
  Set-Location $PreviousLocation
}

$SitePackageDir = Join-Path $Dist "site-preview"
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue $SitePackageDir
New-Item -ItemType Directory -Force -Path $SitePackageDir | Out-Null
Copy-Item -Recurse -Force (Join-Path $WebDist "*") $SitePackageDir
Copy-Item -Force (Join-Path $ProjectRoot "terms.html") $SitePackageDir
Copy-Item -Force (Join-Path $ProjectRoot "privacy.html") $SitePackageDir
Copy-Item -Force (Join-Path $ProjectRoot "content-policy.html") $SitePackageDir
if (Test-Path (Join-Path $ProjectRoot "assets")) {
  Copy-Item -Recurse -Force (Join-Path $ProjectRoot "assets") $SitePackageDir
}

New-ZipFromDirectory -SourceDir $SitePackageDir -DestinationZip $SiteZip

$ServerPackageDir = Join-Path $Dist "server-package"
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue $ServerPackageDir
New-Item -ItemType Directory -Force -Path $ServerPackageDir | Out-Null
Copy-Item -Force (Join-Path $ProjectRoot "server\package.json") $ServerPackageDir
Copy-Item -Force (Join-Path $ProjectRoot "server\package-lock.json") $ServerPackageDir
Copy-Item -Recurse -Force (Join-Path $ProjectRoot "server\src") $ServerPackageDir
New-ZipFromDirectory -SourceDir $ServerPackageDir -DestinationZip $ServerZip

$CliPackageDir = Join-Path $Dist "cli-package"
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue $CliPackageDir
New-Item -ItemType Directory -Force -Path $CliPackageDir | Out-Null
Copy-Item -Force (Join-Path $ProjectRoot "cli\package.json") $CliPackageDir
Copy-Item -Force (Join-Path $ProjectRoot "cli\README.md") $CliPackageDir
Copy-Item -Recurse -Force (Join-Path $ProjectRoot "cli\bin") $CliPackageDir
Copy-Item -Recurse -Force (Join-Path $ProjectRoot "cli\lib") $CliPackageDir
New-ZipFromDirectory -SourceDir $CliPackageDir -DestinationZip $CliZip

$McpPackageDir = Join-Path $Dist "mcp-package"
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue $McpPackageDir
New-Item -ItemType Directory -Force -Path $McpPackageDir | Out-Null
Copy-Item -Force (Join-Path $ProjectRoot "mcp\package.json") $McpPackageDir
Copy-Item -Recurse -Force (Join-Path $ProjectRoot "mcp\bin") $McpPackageDir
Copy-Item -Recurse -Force (Join-Path $ProjectRoot "mcp\lib") $McpPackageDir
New-ZipFromDirectory -SourceDir $McpPackageDir -DestinationZip $McpZip

$CodexSkillPackageDir = Join-Path $Dist "codex-skill-package"
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue $CodexSkillPackageDir
New-Item -ItemType Directory -Force -Path $CodexSkillPackageDir | Out-Null
Copy-Item -Recurse -Force (Join-Path $ProjectRoot "codex-skill\demogo-deploy") $CodexSkillPackageDir
New-ZipFromDirectory -SourceDir $CodexSkillPackageDir -DestinationZip $CodexSkillZip

$OpsPackageDir = Join-Path $Dist "ops-package"
Remove-Item -Recurse -Force -ErrorAction SilentlyContinue $OpsPackageDir
New-Item -ItemType Directory -Force -Path $OpsPackageDir | Out-Null
Copy-Item -Force (Join-Path $ProjectRoot "scripts\server-deploy-demogo-v$Version.sh") $OpsPackageDir
Copy-Item -Force (Join-Path $ProjectRoot "scripts\server-rollback-demogo-v$Version.sh") $OpsPackageDir
Copy-Item -Force (Join-Path $ProjectRoot "scripts\server-verify-demogo.sh") $OpsPackageDir
Copy-Item -Force (Join-Path $ProjectRoot "scripts\server-clean-demogo-data.sh") $OpsPackageDir
Copy-Item -Force (Join-Path $ProjectRoot "scripts\upload-demogo-packages.ps1") $OpsPackageDir
New-ZipFromDirectory -SourceDir $OpsPackageDir -DestinationZip $OpsZip

Remove-Item -Recurse -Force -ErrorAction SilentlyContinue $SitePackageDir, $ServerPackageDir, $CliPackageDir, $McpPackageDir, $CodexSkillPackageDir, $OpsPackageDir

Write-Host "Built packages:"
Write-Host $SiteZip
Write-Host $ServerZip
Write-Host $OpsZip
Write-Host $CliZip
Write-Host $McpZip
Write-Host $CodexSkillZip


