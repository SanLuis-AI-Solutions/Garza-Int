$ErrorActionPreference = 'Continue'
$servers = @('desktop-commander','git','wix')
foreach ($s in $servers) {
  docker mcp server disable $s | Out-Null
}
Write-Host "Disabled MCP_DOCKER servers: $($servers -join ', ')"
