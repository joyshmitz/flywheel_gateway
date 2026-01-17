/**
 * Update System Types
 *
 * Types for the auto-update system including release info, checksums,
 * and update check results.
 */

// ============================================================================
// Release Types
// ============================================================================

/**
 * Individual release asset with checksum information.
 */
export interface ReleaseAsset {
  /** Asset filename (e.g., "flywheel-gateway-1.0.0-linux-x64.tar.gz") */
  name: string;
  /** Direct download URL */
  downloadUrl: string;
  /** File size in bytes */
  size: number;
  /** SHA256 checksum (hex string) */
  sha256: string;
  /** SHA512 checksum (hex string, optional) */
  sha512?: string;
  /** Content type (e.g., "application/gzip") */
  contentType?: string;
}

/**
 * Release information from GitHub.
 */
export interface ReleaseInfo {
  /** Semantic version without 'v' prefix (e.g., "1.0.0") */
  version: string;
  /** Full tag name (e.g., "v1.0.0") */
  tagName: string;
  /** ISO 8601 timestamp when published */
  publishedAt: string;
  /** Release title/name */
  name: string;
  /** Release notes/changelog in Markdown */
  changelog: string;
  /** Whether this is a prerelease */
  prerelease: boolean;
  /** Whether this is a draft */
  draft: boolean;
  /** Available assets */
  assets: ReleaseAsset[];
  /** HTML URL to the release page */
  htmlUrl: string;
}

// ============================================================================
// Update Check Types
// ============================================================================

/**
 * Result of checking for updates.
 */
export interface UpdateCheckResult {
  /** Current installed version */
  currentVersion: string;
  /** Latest available version */
  latestVersion: string;
  /** Whether an update is available */
  updateAvailable: boolean;
  /** Release info if an update is available */
  release?: ReleaseInfo;
  /** Timestamp of this check */
  checkedAt: string;
  /** Whether this result came from cache */
  fromCache: boolean;
}

/**
 * Cached update check result.
 */
export interface UpdateCheckCache {
  /** The cached result */
  result: UpdateCheckResult;
  /** When this cache entry expires (ISO 8601) */
  expiresAt: string;
}

// ============================================================================
// Download Types
// ============================================================================

/**
 * Progress callback for downloads.
 */
export type DownloadProgressCallback = (progress: DownloadProgress) => void;

/**
 * Download progress information.
 */
export interface DownloadProgress {
  /** Bytes downloaded so far */
  downloaded: number;
  /** Total bytes to download (may be 0 if unknown) */
  total: number;
  /** Download percentage (0-100, may be null if total unknown) */
  percentage: number | null;
  /** Current download speed in bytes/second */
  speed: number;
  /** Estimated time remaining in seconds (may be null) */
  eta: number | null;
}

/**
 * Result of a download operation.
 */
export interface DownloadResult {
  /** Path to the downloaded file */
  filePath: string;
  /** Actual SHA256 checksum of downloaded file */
  actualChecksum: string;
  /** Expected SHA256 checksum */
  expectedChecksum: string;
  /** Whether checksums match */
  verified: boolean;
  /** File size in bytes */
  size: number;
  /** Download duration in milliseconds */
  durationMs: number;
}

// ============================================================================
// Checksum Manifest Types
// ============================================================================

/**
 * Entry in the checksums.json manifest.
 */
export interface ChecksumEntry {
  /** Filename */
  filename: string;
  /** SHA256 checksum */
  sha256: string;
  /** SHA512 checksum */
  sha512: string;
  /** File size in bytes */
  size: number;
  /** When checksum was generated */
  createdAt?: string;
}

/**
 * The checksums.json manifest format.
 */
export interface ChecksumManifest {
  /** Release version */
  version: string;
  /** When checksums were generated */
  generated: string;
  /** Generator identifier */
  generator: string;
  /** File entries with checksums */
  files: ChecksumEntry[];
}

// ============================================================================
// Service Types
// ============================================================================

/**
 * Configuration for the update checker service.
 */
export interface UpdateCheckerConfig {
  /** GitHub repository owner */
  owner: string;
  /** GitHub repository name */
  repo: string;
  /** Current installed version */
  currentVersion: string;
  /** Cache time-to-live in milliseconds (default: 24 hours) */
  cacheTtlMs?: number;
  /** Path to cache file (default: .update-cache.json) */
  cacheFile?: string;
  /** Whether to check prereleases (default: false) */
  includePrereleases?: boolean;
  /** User agent for GitHub API requests */
  userAgent?: string;
}

/**
 * Update checker service interface.
 */
export interface UpdateCheckerService {
  /** Check for available updates */
  checkForUpdates(): Promise<UpdateCheckResult>;
  /** Download and verify a release asset */
  downloadAndVerify(
    asset: ReleaseAsset,
    destPath: string,
    onProgress?: DownloadProgressCallback,
  ): Promise<DownloadResult>;
  /** Clear the update check cache */
  clearCache(): Promise<void>;
  /** Get cache status */
  getCacheStatus(): Promise<{
    cached: boolean;
    expiresIn?: number;
    lastCheck?: string;
  }>;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Error codes for update operations.
 */
export enum UpdateErrorCode {
  /** Network error during fetch */
  NETWORK_ERROR = "NETWORK_ERROR",
  /** GitHub API rate limited */
  RATE_LIMITED = "RATE_LIMITED",
  /** Release not found */
  RELEASE_NOT_FOUND = "RELEASE_NOT_FOUND",
  /** Asset not found for platform */
  ASSET_NOT_FOUND = "ASSET_NOT_FOUND",
  /** Checksum verification failed */
  CHECKSUM_MISMATCH = "CHECKSUM_MISMATCH",
  /** Download failed */
  DOWNLOAD_FAILED = "DOWNLOAD_FAILED",
  /** File system error */
  FILE_SYSTEM_ERROR = "FILE_SYSTEM_ERROR",
  /** Invalid response from GitHub */
  INVALID_RESPONSE = "INVALID_RESPONSE",
}

/**
 * Error thrown by update operations.
 */
export class UpdateError extends Error {
  public readonly code: UpdateErrorCode;

  constructor(message: string, code: UpdateErrorCode, cause?: Error) {
    super(message, { cause });
    this.name = "UpdateError";
    this.code = code;
  }
}
