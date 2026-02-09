# Lightweight project status snapshot (cross-platform pwsh).
param(
  [string]$ProjectRoot = (Get-Location).Path
)

$ErrorActionPreference = 'Stop'

function Try-Run([string]$cmd) {
  try {
    return (Invoke-Expression $cmd 2>$null)
  } catch {
    return $null
  }
}

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

$root = (Resolve-Path $ProjectRoot).Path
Set-Location $root

$now = (Get-Date).ToString('s')
Write-Host "== Project Status =="
Write-Host "Time: $now"
Write-Host "Path: $root"

if (Get-Command git -ErrorAction SilentlyContinue) {
  $gitRoot = Try-Run 'git rev-parse --show-toplevel'
  if ($gitRoot) {
    $branch = Try-Run 'git rev-parse --abbrev-ref HEAD'
    $sha = Try-Run 'git rev-parse --short HEAD'
    $dirty = Try-Run 'git status --porcelain'
    $remote = Try-Run 'git remote get-url origin'

    Write-Host ""
    Write-Host "Git:"
    Write-Host "  Root: $gitRoot"
    Write-Host "  Branch: $branch"
    Write-Host "  Commit: $sha"
    Write-Host ("  Dirty: " + ([bool]$dirty))
    if ($remote) { Write-Host "  Origin: $remote" }
  } else {
    Write-Host ""
    Write-Host "Git: not a repo"
  }
} else {
  Write-Host ""
  Write-Host "Git: not installed"
}

$envExample = Join-Path $root '.env.example'
$envLocal = Join-Path $root '.env.local'

Write-Host ""
Write-Host "Env:"
Write-Host ("  .env.example: " + (Test-Path $envExample))
Write-Host ("  .env.local: " + (Test-Path $envLocal))

if ((Test-Path $envExample) -and (Test-Path $envLocal)) {
  $required = Get-EnvKeys $envExample
  $localMap = Get-EnvMap $envLocal
  $missing = @()
  foreach ($k in $required) {
    if (-not $localMap.ContainsKey($k)) { $missing += $k; continue }
    if ($localMap[$k].Trim().Trim('"') -eq '') { $missing += $k }
  }
  if ($missing.Count -gt 0) {
    Write-Host ("  Missing/empty: " + ($missing -join ', '))
  } else {
    Write-Host "  Missing/empty: none"
  }
}

Write-Host ""
Write-Host "Node:"
if (Get-Command node -ErrorAction SilentlyContinue) {
  $nodeV = Try-Run 'node -v'
  $npmV = Try-Run 'npm -v'
  Write-Host "  node: $nodeV"
  Write-Host "  npm:  $npmV"
} else {
  Write-Host "  node: not installed"
}

# Python
Write-Host ""
Write-Host "Python:"
if (Get-Command python -ErrorAction SilentlyContinue) {
  $pyV = Try-Run 'python --version'
  Write-Host "  python: $pyV"
} else {
  Write-Host "  python: not installed"
}

# .NET
Write-Host ""
Write-Host ".NET:"
if (Get-Command dotnet -ErrorAction SilentlyContinue) {
  $dnV = Try-Run 'dotnet --version'
  Write-Host "  dotnet: $dnV"
} else {
  Write-Host "  dotnet: not installed"
}

# Go
Write-Host ""
Write-Host "Go:"
if (Get-Command go -ErrorAction SilentlyContinue) {
  $goV = Try-Run 'go version'
  Write-Host "  go: $goV"
} else {
  Write-Host "  go: not installed"
}

# Rust
Write-Host ""
Write-Host "Rust:"
if (Get-Command cargo -ErrorAction SilentlyContinue) {
  $rsV = Try-Run 'cargo --version'
  Write-Host "  cargo: $rsV"
} else {
  Write-Host "  cargo: not installed"
}

# Avoid Get-ChildItem -Depth (PS7-only). Collect package.json up to depth 2.
$pkgs = @()
$pkgs += Get-ChildItem -Path $root -Filter package.json -File -ErrorAction SilentlyContinue
$lvl1 = Get-ChildItem -Path $root -Directory -ErrorAction SilentlyContinue |
  Where-Object { $_.Name -notin @('node_modules','.git','.agent','Docs','docs','dist','build','.next') }
foreach ($d1 in $lvl1) {
  $pkgs += Get-ChildItem -Path $d1.FullName -Filter package.json -File -ErrorAction SilentlyContinue
  $lvl2 = Get-ChildItem -Path $d1.FullName -Directory -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -notin @('node_modules','.git','dist','build','.next') }
  foreach ($d2 in $lvl2) {
    $pkgs += Get-ChildItem -Path $d2.FullName -Filter package.json -File -ErrorAction SilentlyContinue
  }
}
$pkgs = $pkgs | Select-Object -ExpandProperty FullName -Unique
if ($pkgs.Count -gt 0) {
  Write-Host ("  package.json found: " + $pkgs.Count)
  foreach ($p in ($pkgs | Select-Object -First 5)) {
    Write-Host ("    - " + (Resolve-Path $p).Path)
  }
  if ($pkgs.Count -gt 5) { Write-Host "    - (more...)" }
} else {
  Write-Host "  package.json found: 0"
}

Write-Host ""
Write-Host "Docs:"
$docsDir = Join-Path $root 'Docs'
Write-Host ("  Docs/: " + (Test-Path $docsDir))
foreach ($f in @('PROJECT_BRIEF.md','DECISIONS.md','ROADMAP.md','REQS.md','RELEASE.md')) {
  Write-Host ("  " + $f + ": " + (Test-Path (Join-Path $root $f)))
}
foreach ($f in @('HANDOFF.md','CHANGELOG.md','STATUS.md','RESTART.md')) {
  Write-Host ("  Docs/" + $f + ": " + (Test-Path (Join-Path $docsDir $f)))
}
