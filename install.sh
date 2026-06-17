#!/bin/sh
#
# gito standalone installer.
#
# Downloads a precompiled binary from GitHub Releases.
# No Bun, no build tools, no npm required — ideal for a fresh system.
#
#   curl -fsSL https://raw.githubusercontent.com/cs0tony/gito/main/install.sh | sh
#
# Upgrade:   run `gito upgrade` (or just re-run the same command).
# Uninstall: curl -fsSL .../install.sh | sh -s -- --uninstall
#
# Environment:
#   GITO_VERSION       release tag to install (default: latest)
#   GITO_INSTALL_DIR   binary location   (default: ~/.local/bin)
set -eu

REPO="cs0tony/gito"
BIN_DIR="${GITO_INSTALL_DIR:-$HOME/.local/bin}"

if [ "${1:-}" = "--uninstall" ]; then
  rm -f "$BIN_DIR/gito"
  echo "gito uninstalled (removed $BIN_DIR/gito)."
  exit 0
fi

# 1. Detect platform → target triple matching the release archives.
os="$(uname -s)"
arch="$(uname -m)"
case "$os" in
  Darwin) os="macos" ;;
  Linux)  os="linux" ;;
  *) echo "gito: unsupported OS '$os'." >&2; exit 1 ;;
esac
case "$arch" in
  arm64|aarch64) arch="arm64" ;;
  x86_64|amd64)  arch="x64" ;;
  *) echo "gito: unsupported architecture '$arch'." >&2; exit 1 ;;
esac
target="${os}-${arch}"

# 2. Resolve the version (latest release unless pinned).
#
# Resolve "latest" from the releases/latest *web* redirect, not the GitHub API:
# the unauthenticated API is rate-limited to 60 requests/hour per IP and returns
# 403 once exhausted — routine on shared/cloud hosts and CI. The redirect has no
# such limit. Fall back to the API if the redirect can't be read.
version="${GITO_VERSION:-}"
if [ -z "$version" ]; then
  version="$(curl -fsSLI -o /dev/null -w '%{url_effective}' "https://github.com/$REPO/releases/latest" \
    | sed -n 's#.*/releases/tag/##p')"
fi
if [ -z "$version" ]; then
  version="$(curl -fsSL "https://api.github.com/repos/$REPO/releases/latest" \
    | sed -n 's/.*"tag_name": *"\([^"]*\)".*/\1/p' | head -n1)"
fi
[ -n "$version" ] || { echo "gito: could not resolve latest version; set GITO_VERSION (e.g. GITO_VERSION=v1.0.0)." >&2; exit 1; }
# Release tags are vX.Y.Z; accept a bare X.Y.Z in GITO_VERSION too.
case "$version" in v*) ;; *) version="v$version" ;; esac

# 3. Download + extract the binary.
url="https://github.com/$REPO/releases/download/$version/gito-${version}-${target}.tar.gz"
echo "Installing gito $version ($target)..."
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
curl -fsSL "$url" -o "$tmp/gito.tar.gz" || { echo "gito: download failed: $url" >&2; exit 1; }

# 4. Install the binary.
mkdir -p "$BIN_DIR"
tar -xzf "$tmp/gito.tar.gz" -C "$tmp"
# The archive contains: gito, README.md, LICENSE
# Copy only the binary
mv "$tmp/gito" "$BIN_DIR/gito"

echo "Installed to $BIN_DIR/gito"
case ":$PATH:" in
  *":$BIN_DIR:"*) ;;
  *)
    echo ""
    echo "$BIN_DIR is not on your PATH. Add it:"
    echo "  export PATH=\"$BIN_DIR:\$PATH\""
    ;;
esac
echo ""
echo "Done. Run: gito --help"
