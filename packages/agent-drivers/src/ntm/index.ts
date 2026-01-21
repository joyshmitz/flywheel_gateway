/**
 * NTM Driver exports.
 *
 * The NTM driver provides integration with Named Tmux Manager:
 * - Session management via NTM robot commands
 * - Real-time output streaming via tail/snapshot
 * - Terminal attach capability for debugging
 * - Multi-agent coordination via NTM orchestration
 */

export {
  type NtmDriverOptions,
  NtmDriver,
  createNtmDriver,
} from "./ntm-driver";
