# Verify gate: best-effort build/test/lint across common project types.
# - Cross-platform pwsh
# - Writes a markdown report
param(
  [string]$ProjectRoot = (Get-Location).Path,
  [switch]$Ci,
  [string]$ReportPath = (Join-Path (Join-Path (Get-Location).Path '.health') 'report.md')
)

$ErrorActionPreference = 'Stop'

function Write-ReportLine([string]$line) {
  $script:Report += $line
}

function InvokeStep([string]$name, [scriptblock]$fn) {
  $start = Get-Date
  try {
    & $fn
    $dur = [int]((Get-Date) - $start).TotalSeconds
    Write-ReportLine ("- **{0}**: PASS ({1}s)" -f $name, $dur)
    return $true
  } catch {
    $dur = [int]((Get-Date) - $start).TotalSeconds
    $msg = $_.Exception.Message
    Write-ReportLine ("- **{0}**: FAIL ({1}s)" -f $name, $dur)
    Write-ReportLine ("  - Error: {0}" -f ($msg -replace "`r?`n", ' '))
    return $false
  }
}

function Get-PackageScripts([string]$pkgPath) {
  try {
    $json = Get-Content $pkgPath -Raw | ConvertFrom-Json
    if ($null -eq $json.scripts) { return @{} }
    $map = @{}
    $json.scripts.PSObject.Properties | ForEach-Object { $map[$_.Name] = $_.Value }
    return $map
  } catch {
    return @{}
  }
}

function Get-DirsUpToDepth([string]$root, [int]$depth, [string[]]$excludeNames) {
  $dirs = @($root)
  if ($depth -lt 1) { return $dirs }
  $lvl1 = Get-ChildItem -Path $root -Directory -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -notin $excludeNames }
  foreach ($d1 in $lvl1) { $dirs += $d1.FullName }
  if ($depth -lt 2) { return ($dirs | Select-Object -Unique) }
  foreach ($d1 in $lvl1) {
    $lvl2 = Get-ChildItem -Path $d1.FullName -Directory -ErrorAction SilentlyContinue |
      Where-Object { $_.Name -notin $excludeNames }
    foreach ($d2 in $lvl2) { $dirs += $d2.FullName }
  }
  return ($dirs | Select-Object -Unique)
}

function Find-Files([string[]]$dirs, [string]$filter) {
  $files = @()
  foreach ($d in $dirs) {
    $files += Get-ChildItem -Path $d -Filter $filter -File -ErrorAction SilentlyContinue
  }
  return ($files | Select-Object -ExpandProperty FullName -Unique)
}

$root = (Resolve-Path $ProjectRoot).Path
Set-Location $root

$script:Report = @()
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $ReportPath) | Out-Null

Write-ReportLine "# Verification Report"
Write-ReportLine ""
Write-ReportLine ("- Time: {0}" -f (Get-Date).ToString('s'))
Write-ReportLine ("- Path: {0}" -f $root)
Write-ReportLine ("- CI mode: {0}" -f [bool]$Ci)
Write-ReportLine ""
Write-ReportLine "## Checks"

$allOk = $true
$anyChecks = $false

$exclude = @('node_modules','.git','.agent','Docs','docs','dist','build','.next','.health','.venv','venv','__pycache__')
$dirs2 = Get-DirsUpToDepth $root 2 $exclude
$dirs1 = Get-DirsUpToDepth $root 1 $exclude

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  Write-ReportLine "- **Node**: SKIP (npm not found)"
} else {
  $pkgFiles = Find-Files $dirs2 'package.json'

  # Only run in packages that actually have something to run (build/test/lint).
  $targets = @()
  foreach ($pkg in $pkgFiles) {
    $scripts = Get-PackageScripts $pkg
    if ($scripts.ContainsKey('build') -or $scripts.ContainsKey('test') -or $scripts.ContainsKey('lint')) {
      $targets += $pkg
    }
  }

  # Cap to avoid runaway repos.
  $targets = $targets | Select-Object -First 3

  if ($targets.Count -eq 0) {
    Write-ReportLine "- **Node**: SKIP (no build/test/lint scripts found)"
  } else {
    foreach ($pkg in $targets) {
      $anyChecks = $true
      $dir = Split-Path -Parent $pkg
      $scripts = Get-PackageScripts $pkg
      Write-ReportLine ""
      # Use single quotes so markdown backticks don't escape the terminating quote.
      Write-ReportLine (('### Node package: `{0}`' -f ($dir -replace [regex]::Escape($root), '.')))

      $installStep = if ($Ci) { 'npm ci' } else { 'npm install' }
      $installName = ("Install ({0})" -f $installStep)
      $allOk = (InvokeStep $installName { Push-Location $dir; if ($Ci) { npm ci } else { npm install }; Pop-Location }) -and $allOk

      if ($scripts.ContainsKey('lint')) {
        $allOk = (InvokeStep 'Lint (npm run lint)' { Push-Location $dir; npm run -s lint; Pop-Location }) -and $allOk
      } else {
        Write-ReportLine "- **Lint**: SKIP (no script)"
      }

      if ($scripts.ContainsKey('test')) {
        $allOk = (InvokeStep 'Test (npm run test)' { Push-Location $dir; npm run -s test; Pop-Location }) -and $allOk
      } else {
        Write-ReportLine "- **Test**: SKIP (no script)"
      }

      if ($scripts.ContainsKey('build')) {
        $allOk = (InvokeStep 'Build (npm run build)' { Push-Location $dir; npm run -s build; Pop-Location }) -and $allOk
      } else {
        Write-ReportLine "- **Build**: SKIP (no script)"
      }
    }
  }
}

# Python checks (best-effort).
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
  Write-ReportLine ""
  Write-ReportLine "- **Python**: SKIP (python not found)"
} else {
  function Get-VenvPython([string]$dir) {
    $win = Join-Path $dir '.venv\\Scripts\\python.exe'
    $nix = Join-Path $dir '.venv/bin/python'
    if (Test-Path $win) { return $win }
    if (Test-Path $nix) { return $nix }
    return $null
  }

  $pyMarkers = @('pyproject.toml','requirements.txt','setup.py','Pipfile')
  $pyFiles = @()
  # Limit discovery to depth 1 so we don't treat repo tooling folders as "projects".
  foreach ($m in $pyMarkers) { $pyFiles += Find-Files $dirs1 $m }
  $pyRoots = $pyFiles | ForEach-Object { Split-Path -Parent $_ } | Select-Object -Unique | Select-Object -First 3

  if ($pyRoots.Count -eq 0) {
    Write-ReportLine ""
    Write-ReportLine "- **Python**: SKIP (no pyproject/requirements found)"
  } else {
    foreach ($dir in $pyRoots) {
      $anyChecks = $true
      Write-ReportLine ""
      Write-ReportLine (('### Python package: `{0}`' -f ($dir -replace [regex]::Escape($root), '.')))

      $req = Join-Path $dir 'requirements.txt'
      $pyproject = Join-Path $dir 'pyproject.toml'
      $poetryLock = Join-Path $dir 'poetry.lock'

      if (Test-Path $req) {
        $allOk = (InvokeStep 'Install (venv + pip -r requirements.txt)' {
          Push-Location $dir
          if (-not (Test-Path (Join-Path $dir '.venv'))) { python -m venv .venv }
          $py = Get-VenvPython $dir
          if (-not $py) { throw "venv python not found" }
          & $py -m pip install -r requirements.txt
          Pop-Location
        }) -and $allOk
      } elseif ((Test-Path $pyproject) -and (Test-Path $poetryLock) -and (Get-Command poetry -ErrorAction SilentlyContinue)) {
        $allOk = (InvokeStep 'Install (poetry install)' { Push-Location $dir; poetry install --no-interaction; Pop-Location }) -and $allOk
      } else {
        Write-ReportLine "- **Install**: SKIP (no supported installer detected)"
      }

      $hasTests = (Test-Path (Join-Path $dir 'pytest.ini')) -or (Test-Path (Join-Path $dir 'tests'))
      if ($hasTests) {
        $allOk = (InvokeStep 'Test (pytest)' {
          Push-Location $dir
          $py = Get-VenvPython $dir
          if ($py) {
            & $py -m pytest -q
          } else {
            python -m pytest -q
          }
          Pop-Location
        }) -and $allOk
      } else {
        Write-ReportLine "- **Test**: SKIP (no tests detected)"
      }
    }
  }
}

# .NET checks (best-effort).
if (Get-Command dotnet -ErrorAction SilentlyContinue) {
  $slns = Find-Files $dirs2 '*.sln' | Select-Object -First 1
  $csprojs = Find-Files $dirs2 '*.csproj' | Select-Object -First 1
  $target = if ($slns) { $slns[0] } elseif ($csprojs) { $csprojs[0] } else { $null }
  if ($target) {
    $anyChecks = $true
    Write-ReportLine ""
    Write-ReportLine (('### .NET target: `{0}`' -f ($target -replace [regex]::Escape($root), '.')))
    $dir = Split-Path -Parent $target
    $allOk = (InvokeStep 'Build (dotnet build)' { Push-Location $dir; dotnet build -c Release; Pop-Location }) -and $allOk
    $allOk = (InvokeStep 'Test (dotnet test)' { Push-Location $dir; dotnet test -c Release --no-build; Pop-Location }) -and $allOk
  } else {
    Write-ReportLine ""
    Write-ReportLine "- **.NET**: SKIP (no .sln/.csproj found)"
  }
} else {
  Write-ReportLine ""
  Write-ReportLine "- **.NET**: SKIP (dotnet not found)"
}

# Go checks (best-effort).
if (Get-Command go -ErrorAction SilentlyContinue) {
  $goMod = Find-Files $dirs2 'go.mod' | Select-Object -First 1
  if ($goMod) {
    $anyChecks = $true
    $dir = Split-Path -Parent $goMod[0]
    Write-ReportLine ""
    Write-ReportLine (('### Go module: `{0}`' -f ($dir -replace [regex]::Escape($root), '.')))
    $allOk = (InvokeStep 'Test (go test ./...)' { Push-Location $dir; go test ./...; Pop-Location }) -and $allOk
  } else {
    Write-ReportLine ""
    Write-ReportLine "- **Go**: SKIP (no go.mod found)"
  }
} else {
  Write-ReportLine ""
  Write-ReportLine "- **Go**: SKIP (go not found)"
}

# Rust checks (best-effort).
if (Get-Command cargo -ErrorAction SilentlyContinue) {
  $cargoToml = Find-Files $dirs2 'Cargo.toml' | Select-Object -First 1
  if ($cargoToml) {
    $anyChecks = $true
    $dir = Split-Path -Parent $cargoToml[0]
    Write-ReportLine ""
    Write-ReportLine (('### Rust crate: `{0}`' -f ($dir -replace [regex]::Escape($root), '.')))
    $allOk = (InvokeStep 'Test (cargo test)' { Push-Location $dir; cargo test; Pop-Location }) -and $allOk
  } else {
    Write-ReportLine ""
    Write-ReportLine "- **Rust**: SKIP (no Cargo.toml found)"
  }
} else {
  Write-ReportLine ""
  Write-ReportLine "- **Rust**: SKIP (cargo not found)"
}

if (-not $anyChecks) {
  Write-ReportLine ""
  Write-ReportLine "No runnable checks were detected. Add build/test/lint (Node), tests (Python/.NET/Go/Rust), or extend verify.ps1 for your stack."
}

$script:Report | Set-Content -Path $ReportPath -Encoding UTF8

if ($allOk) { exit 0 }
exit 1
