# gito standalone installer for Windows (PowerShell).
#
# Downloads a precompiled binary from GitHub Releases.
# No Bun, no build tools required.
#
#   irm https://raw.githubusercontent.com/cs0tony/gito/main/install.ps1 | iex
#
# Upgrade with `gito upgrade` (or just re-run this). To uninstall: remove
# the binary from your user PATH.
#
# Environment:
#   GITO_VERSION       release tag to install (default: latest)
#   GITO_INSTALL_DIR   install location (default: %USERPROFILE%\bin)

$ErrorActionPreference = 'Stop'
$repo = 'cs0tony/gito'
$binDir = if ($env:GITO_INSTALL_DIR) { $env:GITO_INSTALL_DIR } else { Join-Path $env:USERPROFILE '.gito\bin' }

# 1. Detect architecture -> target matching the release archives.
$arch = if ([System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture -eq 'Arm64') { 'arm64' } else { 'x64' }
$target = "windows-$arch"

if ($arch -eq 'arm64') {
  $confirm = Read-Host "当前系统架构为arm64，是否继续安装x64架构的程序？(y/n)"
  if ($confirm -ne 'y') {
    Write-Host "退出安装"
    exit
  } else {
    $arch = 'x64'
    $target = "windows-x64"
  }
}

# 2. Resolve the version (latest release unless pinned).
$version = $env:GITO_VERSION
if (-not $version) {
  try {
    $version = (Invoke-RestMethod "https://api.github.com/repos/$repo/releases/latest").tag_name
  } catch {
    # Fallback to web redirect if API fails
    $response = Invoke-WebRequest -Uri "https://github.com/$repo/releases/latest" -MaximumRedirection 0 -ErrorAction SilentlyContinue
    if ($response.Headers.Location) {
      $version = ($response.Headers.Location -split 'tag/')[-1]
    }
  }
}
if (-not $version) { throw "gito: could not resolve latest version; set GITO_VERSION." }

# 3. Download + extract the binary.
$url = "https://github.com/$repo/releases/download/$version/gito-$version-$target.zip"
Write-Host "Installing gito $version ($target)..."
$tmp = Join-Path $env:TEMP ("gito-" + [guid]::NewGuid().ToString())
New-Item -ItemType Directory -Force -Path $tmp | Out-Null
$zip = Join-Path $tmp 'gito.zip'
Invoke-WebRequest -Uri $url -OutFile $zip

# 4. Install the binary.
New-Item -ItemType Directory -Force -Path $binDir | Out-Null
Expand-Archive -Path $zip -DestinationPath $tmp -Force
# The archive contains: gito.exe, README.md, LICENSE
# Copy only the binary
Move-Item -Path (Join-Path $tmp 'gito.exe') -Destination $binDir -Force
Remove-Item -Recurse -Force $tmp

# 5. Put the bin dir on the user's PATH.
$userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
if (($userPath -split ';') -notcontains $binDir) {
  [Environment]::SetEnvironmentVariable('Path', "$binDir;$userPath", 'User')
  Write-Host "Added $binDir to your PATH (restart your terminal to pick it up)."
}

Write-Host "Installed to $binDir\gito.exe"
Write-Host "Run: gito --help"
