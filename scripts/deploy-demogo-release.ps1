$ErrorActionPreference = "Stop"

$Server = $env:DEMOGO_UPLOAD_SERVER
if (!$Server) {
  $Server = "root@demogo.cn"
}

$SshKey = $env:DEMOGO_SSH_KEY
if (!$SshKey) {
  $DefaultKey = Join-Path $env:USERPROFILE ".ssh\demogo_deploy_ed25519"
  if (Test-Path $DefaultKey) {
    $SshKey = $DefaultKey
  }
}

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$Version = (Get-Content -Raw -Path (Join-Path $ProjectRoot "VERSION")).Trim()

$SiteZip = Join-Path $ProjectRoot "dist\demogo-site-preview.zip"
$ServerZip = Join-Path $ProjectRoot "dist\demogo-server-v$Version.zip"
$OpsZip = Join-Path $ProjectRoot "dist\demogo-ops-scripts-v$Version.zip"
$CliZip = Join-Path $ProjectRoot "dist\demogo-cli-v$Version.zip"
$McpZip = Join-Path $ProjectRoot "dist\demogo-mcp-v$Version.zip"
$CodexSkillZip = Join-Path $ProjectRoot "dist\demogo-codex-skill-v$Version.zip"
$CodexPluginZip = Join-Path $ProjectRoot "dist\demogo-codex-plugin-v$Version.zip"
$ClaudeCodePluginZip = Join-Path $ProjectRoot "dist\demogo-claude-code-plugin-v$Version.zip"

$Packages = @(
  @{ Name = "site"; Path = $SiteZip },
  @{ Name = "server"; Path = $ServerZip },
  @{ Name = "ops"; Path = $OpsZip },
  @{ Name = "CLI"; Path = $CliZip },
  @{ Name = "MCP"; Path = $McpZip },
  @{ Name = "Codex Skill"; Path = $CodexSkillZip },
  @{ Name = "Codex Plugin"; Path = $CodexPluginZip },
  @{ Name = "Claude Code Plugin"; Path = $ClaudeCodePluginZip }
)

foreach ($Package in $Packages) {
  if (!(Test-Path $Package.Path)) {
    throw "Cannot find $($Package.Name) package: $($Package.Path)"
  }
}

Write-Host "Uploading DemoGo v$Version packages to $Server ..."
$PackagePaths = $Packages | ForEach-Object { $_.Path }
if ($SshKey) {
  & scp -i $SshKey @PackagePaths "${Server}:/tmp/"
} else {
  & scp @PackagePaths "${Server}:/tmp/"
}

Write-Host "Running remote deployment ..."
$RemoteCommand = @(
  "cd /tmp",
  "unzip -o demogo-ops-scripts-v$Version.zip",
  "sed -i 's/\r$//' server-deploy-demogo-v$Version.sh server-rollback-demogo-v$Version.sh server-verify-demogo.sh server-clean-demogo-data.sh",
  "chmod +x server-deploy-demogo-v$Version.sh server-rollback-demogo-v$Version.sh server-verify-demogo.sh server-clean-demogo-data.sh",
  "./server-deploy-demogo-v$Version.sh 2>&1 | tee /tmp/demogo-v$Version-deploy.log",
  "./server-verify-demogo.sh"
) -join " && "

if ($SshKey) {
  & ssh -i $SshKey $Server $RemoteCommand
} else {
  & ssh $Server $RemoteCommand
}

Write-Host "DemoGo v$Version deployment command finished."

