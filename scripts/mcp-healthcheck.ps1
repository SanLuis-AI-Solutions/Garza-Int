$ErrorActionPreference = 'Stop'
$timestamp = Get-Date -Format o
Write-Host "MCP health check - $timestamp"

$envOverlay = Join-Path $env:USERPROFILE '.codex\env\.env.local'
if (Test-Path $envOverlay) {
  foreach ($line in Get-Content $envOverlay) {
    $t = $line.Trim()
    if (-not $t) { continue }
    if ($t.StartsWith('#')) { continue }
    if ($t -match '^(?<k>[A-Za-z_][A-Za-z0-9_]*)=(?<v>.*)$') {
      $k = $matches.k
      $v = $matches.v.Trim()
      if ($v.StartsWith('"') -and $v.EndsWith('"')) {
        $v = $v.Substring(1, $v.Length - 2)
      }
      Set-Item -Path "env:$k" -Value $v
    }
  }
  Write-Host "Loaded env overlay: $envOverlay"
} else {
  Write-Host "Env overlay not found (ok): $envOverlay"
}

$config = Join-Path $env:USERPROFILE '.codex\config.toml'
if (-not (Test-Path $config)) {
  Write-Warning "Config not found: $config"
  exit 1
}

Write-Host "Config: $config"
$configText = Get-Content -Raw -Path $config

$dockerMcpServers = @()
$dockerMcpByName = @{}
if (Get-Command docker -ErrorAction SilentlyContinue) {
  try {
    $dockerMcpServers = (docker mcp server ls --json | ConvertFrom-Json)
    foreach ($s in $dockerMcpServers) {
      if ($s.name) { $dockerMcpByName[$s.name] = $s }
    }
  } catch {
    Write-Warning "Unable to read Docker MCP server list (docker mcp server ls --json)."
  }
} else {
  Write-Warning 'Docker is not installed or not on PATH.'
}

function Get-McpSection {
  param([string]$Name)
  $escaped = [regex]::Escape($Name)
  $pattern = "(?s)\[mcp_servers\.$escaped\](.*?)(?=\r?\n\[mcp_servers\.|\r?\n\[security\]|\z)"
  if ($configText -match $pattern) { return $Matches[1] }
  $pattern = '(?s)\[mcp_servers\."{0}"\](.*?)(?=\r?\n\[mcp_servers\.|\r?\n\[security\]|\z)' -f $escaped
  if ($configText -match $pattern) { return $Matches[1] }
  return $null
}

function Get-McpEnvSection {
  param([string]$Name)
  $escaped = [regex]::Escape($Name)
  $pattern = "(?s)\[mcp_servers\.$escaped\.env\](.*?)(?=\r?\n\[mcp_servers\.|\r?\n\[security\]|\z)"
  if ($configText -match $pattern) { return $Matches[1] }
  $pattern = '(?s)\[mcp_servers\."{0}"\.env\](.*?)(?=\r?\n\[mcp_servers\.|\r?\n\[security\]|\z)' -f $escaped
  if ($configText -match $pattern) { return $Matches[1] }
  return $null
}

$aggregatedServers = $null
$aggregatorConfigPath = $null
$masterSection = Get-McpSection -Name 'master-aggregator'
if ($masterSection) {
  $envSection = Get-McpEnvSection -Name 'master-aggregator'
  $searchText = if ($envSection) { $envSection } else { $masterSection }
  if ($searchText -match 'MCP_CONFIG\s*=\s*''([^'']+)''') {
    $aggregatorConfigPath = $Matches[1]
  } elseif ($searchText -match 'MCP_CONFIG\s*=\s*"([^"]+)"') {
    $aggregatorConfigPath = $Matches[1]
  }
  if ($aggregatorConfigPath) {
    $resolved = $aggregatorConfigPath -replace '^~', $env:USERPROFILE
    if (Test-Path $resolved) {
      try {
        $aggregatedServers = (Get-Content -Raw -Path $resolved | ConvertFrom-Json).mcpServers
      } catch {
        Write-Warning "Unable to parse aggregator config: $resolved"
      }
    } else {
      Write-Warning "Aggregator config not found: $resolved"
    }
  }
  if (-not $aggregatedServers) {
    $defaultPath = Join-Path $env:USERPROFILE '.mcp-master-config.json'
    if (Test-Path $defaultPath) {
      try {
        $aggregatedServers = (Get-Content -Raw -Path $defaultPath | ConvertFrom-Json).mcpServers
      } catch {
        Write-Warning "Unable to parse aggregator config: $defaultPath"
      }
    }
  }
  if (-not $aggregatedServers) {
    if ($masterSection -match "-v'\\s*,\\s*'([^']+)'") {
      $volume = $Matches[1]
      $lastColon = $volume.LastIndexOf(':')
      if ($lastColon -gt 0) {
        $hostPath = $volume.Substring(0, $lastColon)
        if (Test-Path $hostPath) {
          try {
            $aggregatedServers = (Get-Content -Raw -Path $hostPath | ConvertFrom-Json).mcpServers
          } catch {
            Write-Warning "Unable to parse aggregator config: $hostPath"
          }
        } else {
          Write-Warning "Aggregator config not found: $hostPath"
        }
      }
    }
  }
}

function Get-AggregatedServer {
  param([string]$Name)
  if (-not $aggregatedServers) { return $null }
  $prop = $aggregatedServers.PSObject.Properties[$Name]
  if ($prop) { return $prop.Value }
  return $null
}

function Get-AggregatedEnv {
  param([string]$Name)
  $server = Get-AggregatedServer -Name $Name
  if ($server -and $server.env) { return $server.env }
  return $null
}

$criticalServers = @(
  'MCP_DOCKER',
  'github',
  'supabase',
  'vercel'
)

$envRequirements = @{
  'github' = @('GITHUB_PERSONAL_ACCESS_TOKEN')
  'supabase' = @('SUPABASE_ACCESS_TOKEN')
  'vercel' = @('VERCEL_OIDC_TOKEN','VERCEL_TOKEN')
}

Write-Host "Critical MCPs:"
foreach ($name in $criticalServers) {
  if ($aggregatedServers) {
    $server = Get-AggregatedServer -Name $name
    if (-not $server) {
      Write-Warning ("- {0}: missing from aggregator config" -f $name)
      continue
    }
    if ($server.enabled -eq $false) {
      Write-Warning ("- {0}: disabled" -f $name)
      continue
    }
    Write-Host ("- {0}: configured (aggregated)" -f $name)
  } else {
    $section = Get-McpSection -Name $name
    if (-not $section) {
      Write-Warning ("- {0}: missing from config" -f $name)
      continue
    }
    if ($section -match 'enabled\s*=\s*false') {
      Write-Warning ("- {0}: disabled" -f $name)
      continue
    }
    Write-Host ("- {0}: configured" -f $name)
  }
}

if ($dockerMcpByName.Count -gt 0) {
  $recommendedDockerServers = @('fetch','puppeteer','context7','google-maps','sequentialthinking','github')
  Write-Host "Docker MCP servers (recommended):"
  foreach ($name in $recommendedDockerServers) {
    $s = $dockerMcpByName[$name]
    if (-not $s) {
      Write-Warning ("- {0}: missing from docker mcp server ls" -f $name)
      continue
    }
    if ($s.enabled -eq $false) {
      Write-Warning ("- {0}: disabled in Docker MCP Toolkit" -f $name)
      continue
    }
    Write-Host ("- {0}: enabled" -f $name)
  }
}

Write-Host "Env checks:"
foreach ($pair in $envRequirements.GetEnumerator()) {
  foreach ($key in $pair.Value) {
    $present = $false
    if ($key -eq 'VERCEL_OIDC_TOKEN' -or $key -eq 'VERCEL_TOKEN') {
      if ($env:VERCEL_OIDC_TOKEN -or $env:VERCEL_TOKEN) { $present = $true }
    } else {
      $val = (Get-Item -Path ("env:{0}" -f $key) -ErrorAction SilentlyContinue).Value
      if ($val) { $present = $true }
    }

    if ($present) {
      Write-Host ("- {0}: present" -f $key)
    } else {
      Write-Warning ("- {0}: missing" -f $key)
    }
  }
}

Write-Host "Optional MCPs:"
foreach ($name in @('context7','puppeteer','google-maps','sequentialthinking','stitch','google-workspace','chrome_devtools','google_cloud','cloudrun')) {
  $section = Get-McpSection -Name $name
  if ($section) {
    if ($section -match 'enabled\s*=\s*false') {
      $enabled = 'disabled'
    } else {
      $enabled = 'enabled'
    }
    Write-Host ("- {0}: {1}" -f $name, $enabled)
  } else {
    Write-Host ("- {0}: not configured" -f $name)
  }
}

if (Get-Command docker -ErrorAction SilentlyContinue) {
  Write-Host "Docker MCP servers:"
  docker mcp server ls
}
