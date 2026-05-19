$ErrorActionPreference = "Stop"

$Server = $env:DEMOGO_UPLOAD_SERVER
if (!$Server) {
  $Server = "root@demogo.cn"
}

$ProjectRoot = Split-Path -Parent $PSScriptRoot

$SiteZip = Join-Path $ProjectRoot "dist\demogo-site-preview.zip"
$ServerZip = Join-Path $ProjectRoot "dist\demogo-server-v0.2.4.zip"
$OpsZip = Join-Path $ProjectRoot "dist\demogo-ops-scripts-v0.2.4.zip"
$CliZip = Join-Path $ProjectRoot "dist\demogo-cli-v0.2.4.zip"
$McpZip = Join-Path $ProjectRoot "dist\demogo-mcp-v0.2.4.zip"
$CodexSkillZip = Join-Path $ProjectRoot "dist\demogo-codex-skill-v0.2.4.zip"

if (!(Test-Path $SiteZip)) {
  throw "Cannot find site package: $SiteZip"
}

if (!(Test-Path $ServerZip)) {
  throw "Cannot find server package: $ServerZip"
}

if (!(Test-Path $OpsZip)) {
  throw "Cannot find ops package: $OpsZip"
}

if (!(Test-Path $CliZip)) {
  throw "Cannot find CLI package: $CliZip"
}

if (!(Test-Path $McpZip)) {
  throw "Cannot find MCP package: $McpZip"
}

if (!(Test-Path $CodexSkillZip)) {
  throw "Cannot find Codex Skill package: $CodexSkillZip"
}

scp $SiteZip "${Server}:/tmp/"
scp $ServerZip "${Server}:/tmp/"
scp $OpsZip "${Server}:/tmp/"
scp $CliZip "${Server}:/tmp/"
scp $McpZip "${Server}:/tmp/"
scp $CodexSkillZip "${Server}:/tmp/"

Write-Host "Uploaded DemoGo packages to /tmp on $Server"


