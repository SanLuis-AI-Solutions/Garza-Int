# Preflight: quick readiness report (docs + env + tooling). Cross-platform pwsh.
param(
  [string]$ProjectRoot = (Get-Location).Path,
  [switch]$Strict
)

$ErrorActionPreference = 'Stop'

function Get-EnvKeys([string]$path) {
  $keys = @()
  foreach ($line in (Get-Content $path -ErrorAction SilentlyContinue)) {
    if ($line -match '^[A-Za-z_][A-Za-z0-9_]*=') {
      $keys += $line.Split('=', 2)[0]
    }
  }
  return $keys | Select-Object -Unique
}

function Get-EnvMap([string]$path) {
  $map = @{}
  foreach ($line in (Get-Content $path -ErrorAction SilentlyContinue)) {
    if ($line -match '^[A-Za-z_][A-Za-z0-9_]*=') {
      $parts = $line.Split('=', 2)
      $map[$parts[0]] = $parts[1]
    }
  }
  return $map
}

function Check([string]$label, [bool]$ok, [string]$hint = '') {
  $status = if ($ok) { 'PASS' } else { 'FAIL' }
  Write-Host ("- {0}: {1}" -f $label, $status)
  if (-not $ok -and $hint) {
    Write-Host ("    " + $hint)
  }
  return $ok
}

$root = (Resolve-Path $ProjectRoot).Path
Set-Location $root

Write-Host "== Preflight =="
Write-Host ("Path: " + $root)

$okAll = $true

$okAll = (Check 'AGENTS.md present' (Test-Path (Join-Path $root 'AGENTS.md')) 'Run installall to seed baseline docs/workflows.') -and $okAll
$okAll = (Check '.agent/ARCHITECTURE.md present' (Test-Path (Join-Path $root '.agent/ARCHITECTURE.md')) 'Run installall to seed agent system.') -and $okAll

$envExample = Join-Path $root '.env.example'
$envLocal = Join-Path $root '.env.local'

$hasExample = Test-Path $envExample
$hasLocal = Test-Path $envLocal
$okAll = (Check '.env.example present' $hasExample 'Add .env.example (keys only) so missing vars can be detected.') -and $okAll
$okAll = (Check '.env.local present' $hasLocal 'Create .env.local from .env.example (do not commit secrets).') -and $okAll

if ($hasExample -and $hasLocal) {
  $required = Get-EnvKeys $envExample
  $localMap = Get-EnvMap $envLocal
  $missing = @()
  foreach ($k in $required) {
    if (-not $localMap.ContainsKey($k)) { $missing += $k; continue }
    if ($localMap[$k].Trim().Trim('"') -eq '') { $missing += $k }
  }
  if ($missing.Count -gt 0) {
    Write-Host ("- Env missing/empty keys: FAIL")
    Write-Host ("    " + ($missing -join ', '))
    if ($Strict) { $okAll = $false }
  } else {
    Write-Host "- Env missing/empty keys: PASS"
  }
}

# Project doc baselines (recommended; not hard-fail unless Strict).
$recommended = @(
  'PROJECT_BRIEF.md',
  'DECISIONS.md',
  'ROADMAP.md',
  'REQS.md',
  'RELEASE.md'
)

$missingDocs = @()
foreach ($f in $recommended) {
  if (-not (Test-Path (Join-Path $root $f))) { $missingDocs += $f }
}

if ($missingDocs.Count -gt 0) {
  Write-Host "- Baseline docs (recommended): WARN"
  Write-Host ("    Missing: " + ($missingDocs -join ', '))
  if ($Strict) {
    $okAll = $false
  }
} else {
  Write-Host "- Baseline docs (recommended): PASS"
}

$docsDir = Join-Path $root 'Docs'
if (Test-Path $docsDir) {
  $okAll = (Check 'Docs/HANDOFF.md present' (Test-Path (Join-Path $docsDir 'HANDOFF.md')) 'Seed Docs/HANDOFF.md for session transitions.') -and $okAll
  $okAll = (Check 'Docs/CHANGELOG.md present' (Test-Path (Join-Path $docsDir 'CHANGELOG.md')) 'Seed Docs/CHANGELOG.md for production-impacting changes.') -and $okAll
} else {
  Write-Host "- Docs/ folder: WARN"
  if ($Strict) { $okAll = $false }
}

Write-Host ""
Write-Host "Tooling:"
Write-Host ("- git: " + [bool](Get-Command git -ErrorAction SilentlyContinue))
Write-Host ("- node: " + [bool](Get-Command node -ErrorAction SilentlyContinue))
Write-Host ("- npm: " + [bool](Get-Command npm -ErrorAction SilentlyContinue))

Write-Host ""
if ($okAll) {
  Write-Host "Preflight result: PASS"
  exit 0
}

Write-Host "Preflight result: FAIL"
exit 1

