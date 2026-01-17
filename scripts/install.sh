#!/usr/bin/env bash
# Flywheel Gateway Installer
# Usage: curl -fsSL https://raw.githubusercontent.com/Dicklesworthstone/flywheel_gateway/main/scripts/install.sh | bash
#
# Options:
#   --easy-mode       Non-interactive installation with defaults
#   --verify          Verify installation after completion
#   --system          Install system-wide (/usr/local/bin) instead of user (~/.local/bin)
#   --no-path-modify  Don't modify shell profile to add to PATH
#   --version VER     Install specific version (default: latest)
#   --help            Show this help message

set -euo pipefail

# ============================================================================
# Configuration
# ============================================================================

readonly REPO="Dicklesworthstone/flywheel_gateway"
readonly GITHUB_API="https://api.github.com"
readonly GITHUB_RAW="https://raw.githubusercontent.com/${REPO}/main"
readonly INSTALL_NAME="flywheel"

# Colors (with fallback for non-interactive terminals)
if [[ -t 1 ]] && command -v tput &>/dev/null; then
  readonly RED=$(tput setaf 1)
  readonly GREEN=$(tput setaf 2)
  readonly YELLOW=$(tput setaf 3)
  readonly BLUE=$(tput setaf 4)
  readonly CYAN=$(tput setaf 6)
  readonly BOLD=$(tput bold)
  readonly RESET=$(tput sgr0)
else
  readonly RED="" GREEN="" YELLOW="" BLUE="" CYAN="" BOLD="" RESET=""
fi

# ============================================================================
# State
# ============================================================================

EASY_MODE=false
VERIFY_INSTALL=false
SYSTEM_INSTALL=false
MODIFY_PATH=true
INSTALL_VERSION="latest"
INSTALL_DIR=""
START_TIME=$(date +%s)

# ============================================================================
# Utilities
# ============================================================================

log_info() { echo "${BLUE}${BOLD}→${RESET} $*"; }
log_success() { echo "${GREEN}${BOLD}✓${RESET} $*"; }
log_warn() { echo "${YELLOW}${BOLD}⚠${RESET} $*" >&2; }
log_error() { echo "${RED}${BOLD}✗${RESET} $*" >&2; }
log_step() { echo "${CYAN}${BOLD}::${RESET} $*"; }

elapsed_time() {
  local end_time=$(date +%s)
  local duration=$((end_time - START_TIME))
  echo "${duration}s"
}

die() {
  log_error "$1"
  log_error "Installation failed after $(elapsed_time)"
  exit 1
}

has_gum() {
  command -v gum &>/dev/null
}

# Interactive confirmation with optional gum
confirm() {
  local prompt="$1"
  local default="${2:-y}"

  if [[ "$EASY_MODE" == "true" ]]; then
    return 0
  fi

  if has_gum; then
    gum confirm "$prompt" && return 0 || return 1
  fi

  if [[ "$default" == "y" ]]; then
    read -r -p "$prompt [Y/n] " response
    [[ -z "$response" || "$response" =~ ^[Yy] ]]
  else
    read -r -p "$prompt [y/N] " response
    [[ "$response" =~ ^[Yy] ]]
  fi
}

# Interactive selection with optional gum
select_option() {
  local prompt="$1"
  shift
  local options=("$@")

  if has_gum; then
    gum choose --header="$prompt" "${options[@]}"
    return
  fi

  echo "$prompt"
  select opt in "${options[@]}"; do
    if [[ -n "$opt" ]]; then
      echo "$opt"
      return
    fi
  done
}

# ============================================================================
# Self-refresh mechanism
# ============================================================================

# When piped, re-execute with a fresh copy to avoid stale CDN issues
self_refresh() {
  if [[ -t 0 ]]; then
    # Not piped, continue normally
    return 0
  fi

  log_info "Refreshing installer to ensure latest version..."

  local tmp_installer
  tmp_installer=$(mktemp)

  if curl -fsSL "${GITHUB_RAW}/scripts/install.sh" -o "$tmp_installer" 2>/dev/null; then
    # Mark as refreshed to prevent infinite loop
    export FLYWHEEL_INSTALLER_REFRESHED=1
    chmod +x "$tmp_installer"
    exec bash "$tmp_installer" "$@"
  fi

  # Refresh failed, continue with current copy
  log_warn "Could not refresh installer, continuing with current version"
}

# ============================================================================
# Platform detection
# ============================================================================

detect_platform() {
  local os arch

  case "$(uname -s)" in
    Linux*)   os="linux" ;;
    Darwin*)  os="darwin" ;;
    MINGW*|MSYS*|CYGWIN*) os="windows" ;;
    *)        die "Unsupported operating system: $(uname -s)" ;;
  esac

  case "$(uname -m)" in
    x86_64|amd64)   arch="amd64" ;;
    aarch64|arm64)  arch="arm64" ;;
    armv7l)         arch="armv7" ;;
    *)              die "Unsupported architecture: $(uname -m)" ;;
  esac

  echo "${os}-${arch}"
}

detect_shell_profile() {
  local shell_name
  shell_name=$(basename "$SHELL")

  case "$shell_name" in
    bash)
      if [[ -f "$HOME/.bashrc" ]]; then
        echo "$HOME/.bashrc"
      elif [[ -f "$HOME/.bash_profile" ]]; then
        echo "$HOME/.bash_profile"
      else
        echo "$HOME/.profile"
      fi
      ;;
    zsh)
      echo "$HOME/.zshrc"
      ;;
    fish)
      echo "$HOME/.config/fish/config.fish"
      ;;
    *)
      echo "$HOME/.profile"
      ;;
  esac
}

# ============================================================================
# Version management
# ============================================================================

get_latest_version() {
  local version
  version=$(curl -fsSL "${GITHUB_API}/repos/${REPO}/releases/latest" 2>/dev/null | grep '"tag_name"' | sed -E 's/.*"tag_name": *"([^"]+)".*/\1/')

  if [[ -z "$version" ]]; then
    die "Could not determine latest version. Check your internet connection."
  fi

  echo "$version"
}

get_release_asset_url() {
  local version="$1"
  local platform="$2"
  local asset_name="flywheel-${platform}"

  # Add .exe for Windows
  if [[ "$platform" == windows-* ]]; then
    asset_name="${asset_name}.exe"
  fi

  local url
  url=$(curl -fsSL "${GITHUB_API}/repos/${REPO}/releases/tags/${version}" 2>/dev/null | \
    grep -o "\"browser_download_url\": *\"[^\"]*${asset_name}\"" | \
    sed -E 's/"browser_download_url": *"([^"]+)"/\1/')

  if [[ -z "$url" ]]; then
    die "Could not find release asset for ${asset_name} in version ${version}"
  fi

  echo "$url"
}

get_checksum_url() {
  local version="$1"
  local url
  url=$(curl -fsSL "${GITHUB_API}/repos/${REPO}/releases/tags/${version}" 2>/dev/null | \
    grep -o "\"browser_download_url\": *\"[^\"]*checksums.txt\"" | \
    sed -E 's/"browser_download_url": *"([^"]+)"/\1/')

  echo "$url"
}

# ============================================================================
# Download and verification
# ============================================================================

download_with_progress() {
  local url="$1"
  local output="$2"

  if has_gum; then
    gum spin --spinner dot --title "Downloading..." -- curl -fsSL "$url" -o "$output"
  else
    log_info "Downloading from $url..."
    curl -fsSL --progress-bar "$url" -o "$output"
  fi
}

verify_checksum() {
  local file="$1"
  local checksum_url="$2"
  local asset_name="$3"

  if [[ -z "$checksum_url" ]]; then
    log_warn "No checksums.txt found for this release - skipping verification"
    return 0
  fi

  log_info "Verifying SHA256 checksum..."

  local checksums
  checksums=$(curl -fsSL "$checksum_url" 2>/dev/null) || {
    log_warn "Could not download checksums - skipping verification"
    return 0
  }

  local expected_checksum
  expected_checksum=$(echo "$checksums" | grep "$asset_name" | awk '{print $1}')

  if [[ -z "$expected_checksum" ]]; then
    log_warn "No checksum found for ${asset_name} - skipping verification"
    return 0
  fi

  local actual_checksum
  if command -v sha256sum &>/dev/null; then
    actual_checksum=$(sha256sum "$file" | awk '{print $1}')
  elif command -v shasum &>/dev/null; then
    actual_checksum=$(shasum -a 256 "$file" | awk '{print $1}')
  else
    log_warn "No sha256sum or shasum available - skipping verification"
    return 0
  fi

  if [[ "$expected_checksum" != "$actual_checksum" ]]; then
    die "Checksum verification failed!
Expected: $expected_checksum
Actual:   $actual_checksum
The downloaded file may be corrupted or tampered with."
  fi

  log_success "Checksum verified"
}

# ============================================================================
# Installation
# ============================================================================

determine_install_dir() {
  if [[ "$SYSTEM_INSTALL" == "true" ]]; then
    INSTALL_DIR="/usr/local/bin"
    if [[ ! -w "$INSTALL_DIR" ]]; then
      if [[ "$EASY_MODE" == "true" ]]; then
        # In easy mode with --system, we need sudo
        INSTALL_DIR="/usr/local/bin"
      else
        log_warn "Cannot write to $INSTALL_DIR - sudo may be required"
      fi
    fi
  else
    INSTALL_DIR="${HOME}/.local/bin"
    mkdir -p "$INSTALL_DIR"
  fi
}

add_to_path() {
  if [[ "$MODIFY_PATH" != "true" ]]; then
    return 0
  fi

  # Check if already in PATH
  if [[ ":$PATH:" == *":$INSTALL_DIR:"* ]]; then
    log_info "Install directory already in PATH"
    return 0
  fi

  local profile
  profile=$(detect_shell_profile)

  local shell_name
  shell_name=$(basename "$SHELL")

  local path_line
  if [[ "$shell_name" == "fish" ]]; then
    path_line="fish_add_path $INSTALL_DIR"
  else
    path_line="export PATH=\"\$PATH:$INSTALL_DIR\""
  fi

  # Check if already added to profile
  if grep -q "$INSTALL_DIR" "$profile" 2>/dev/null; then
    log_info "PATH modification already in $profile"
    return 0
  fi

  if confirm "Add $INSTALL_DIR to PATH in $profile?"; then
    echo "" >> "$profile"
    echo "# Added by Flywheel Gateway installer" >> "$profile"
    echo "$path_line" >> "$profile"
    log_success "Added to $profile"
    log_info "Run: source $profile (or restart your shell)"
  fi
}

install_binary() {
  local source="$1"
  local dest="${INSTALL_DIR}/${INSTALL_NAME}"

  # Check if overwriting existing installation
  if [[ -f "$dest" ]]; then
    if ! confirm "Overwrite existing installation at $dest?"; then
      die "Installation cancelled by user"
    fi
    log_info "Backing up existing installation..."
    mv "$dest" "${dest}.bak.$(date +%s)" 2>/dev/null || true
  fi

  log_info "Installing to $dest..."

  if [[ "$SYSTEM_INSTALL" == "true" ]] && [[ ! -w "$INSTALL_DIR" ]]; then
    sudo cp "$source" "$dest"
    sudo chmod +x "$dest"
  else
    cp "$source" "$dest"
    chmod +x "$dest"
  fi

  log_success "Installed to $dest"
}

verify_installation() {
  local bin="${INSTALL_DIR}/${INSTALL_NAME}"

  if [[ ! -x "$bin" ]]; then
    die "Installation verification failed: $bin is not executable"
  fi

  log_info "Verifying installation..."

  if "$bin" --help &>/dev/null; then
    log_success "Installation verified"
    "$bin" --help | head -5
  else
    log_warn "Could not verify installation - binary may require additional setup"
  fi
}

# ============================================================================
# Development mode installation
# ============================================================================

install_dev_mode() {
  log_step "Installing in development mode..."

  # Check if we're in the repo
  if [[ ! -f "package.json" ]] || ! grep -q '"name": "flywheel-gateway"' package.json 2>/dev/null; then
    die "Not in flywheel_gateway repository root. Run 'git clone' first."
  fi

  # Check for Bun
  if ! command -v bun &>/dev/null; then
    die "Bun is required for development mode. Install from https://bun.sh"
  fi

  log_info "Installing dependencies..."
  bun install

  log_info "Running database migrations..."
  bun db:migrate

  log_success "Development setup complete!"
  echo ""
  log_info "Start the development servers with: ${BOLD}bun dev${RESET}"
  log_info "Run doctor to verify setup: ${BOLD}bun flywheel doctor${RESET}"
}

# ============================================================================
# Main installation flow
# ============================================================================

show_help() {
  cat << 'EOF'
Flywheel Gateway Installer

Usage:
  curl -fsSL https://raw.githubusercontent.com/Dicklesworthstone/flywheel_gateway/main/scripts/install.sh | bash

  Or download and run:
  bash install.sh [options]

Options:
  --easy-mode       Non-interactive installation with defaults
  --verify          Verify installation after completion
  --system          Install system-wide (/usr/local/bin) instead of user (~/.local/bin)
  --no-path-modify  Don't modify shell profile to add to PATH
  --version VER     Install specific version (default: latest)
  --dev             Development mode: install deps and set up for local dev
  --help            Show this help message

Examples:
  # Standard installation
  curl -fsSL ... | bash

  # Non-interactive installation
  curl -fsSL ... | bash -s -- --easy-mode

  # Install specific version system-wide
  curl -fsSL ... | bash -s -- --system --version v1.0.0

  # Development setup in cloned repo
  ./scripts/install.sh --dev

EOF
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --easy-mode)
        EASY_MODE=true
        shift
        ;;
      --verify)
        VERIFY_INSTALL=true
        shift
        ;;
      --system)
        SYSTEM_INSTALL=true
        shift
        ;;
      --no-path-modify)
        MODIFY_PATH=false
        shift
        ;;
      --version)
        INSTALL_VERSION="$2"
        shift 2
        ;;
      --dev)
        install_dev_mode
        exit 0
        ;;
      --help|-h)
        show_help
        exit 0
        ;;
      *)
        die "Unknown option: $1"
        ;;
    esac
  done
}

print_summary() {
  echo ""
  echo "${BOLD}Installation Summary${RESET}"
  echo "────────────────────────────────"
  echo "  Binary:     ${INSTALL_DIR}/${INSTALL_NAME}"
  echo "  Version:    ${INSTALL_VERSION}"
  echo "  Duration:   $(elapsed_time)"
  echo ""

  if [[ ":$PATH:" != *":$INSTALL_DIR:"* ]]; then
    echo "${YELLOW}Note:${RESET} $INSTALL_DIR is not in your PATH."
    echo "      Run: export PATH=\"\$PATH:$INSTALL_DIR\""
    echo "      Or restart your shell after the profile update."
    echo ""
  fi

  echo "Next steps:"
  echo "  ${BOLD}flywheel doctor${RESET}   - Verify your setup"
  echo "  ${BOLD}flywheel status${RESET}   - Check service health"
  echo "  ${BOLD}flywheel --help${RESET}   - Show available commands"
  echo ""
}

main() {
  # Self-refresh when piped (unless already refreshed)
  if [[ -z "${FLYWHEEL_INSTALLER_REFRESHED:-}" ]]; then
    self_refresh "$@"
  fi

  parse_args "$@"

  echo ""
  echo "${BOLD}${CYAN}Flywheel Gateway Installer${RESET}"
  echo "────────────────────────────────"
  echo ""

  # Detect platform
  log_step "Detecting platform..."
  local platform
  platform=$(detect_platform)
  log_success "Platform: $platform"

  # Determine install directory
  determine_install_dir
  log_info "Install directory: $INSTALL_DIR"

  # Get version
  log_step "Resolving version..."
  if [[ "$INSTALL_VERSION" == "latest" ]]; then
    INSTALL_VERSION=$(get_latest_version)
  fi
  log_success "Version: $INSTALL_VERSION"

  # Create temp directory
  local tmp_dir
  tmp_dir=$(mktemp -d)
  trap "rm -rf $tmp_dir" EXIT

  # Download binary
  log_step "Downloading flywheel..."
  local asset_name="flywheel-${platform}"
  local download_url
  download_url=$(get_release_asset_url "$INSTALL_VERSION" "$platform")
  download_with_progress "$download_url" "${tmp_dir}/${asset_name}"

  # Verify checksum
  log_step "Verifying download..."
  local checksum_url
  checksum_url=$(get_checksum_url "$INSTALL_VERSION")
  verify_checksum "${tmp_dir}/${asset_name}" "$checksum_url" "$asset_name"

  # Install
  log_step "Installing..."
  install_binary "${tmp_dir}/${asset_name}"

  # Add to PATH
  add_to_path

  # Verify installation
  if [[ "$VERIFY_INSTALL" == "true" ]]; then
    verify_installation
  fi

  # Print summary
  print_summary

  log_success "Installation complete!"
}

main "$@"
