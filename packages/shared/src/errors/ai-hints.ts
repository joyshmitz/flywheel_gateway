import type { ErrorCode } from "./codes";
import { DEFAULT_ERROR_MESSAGES, ERROR_CODE_LIST } from "./codes";
import type { AIHint } from "./types";

const AI_HINT_OVERRIDES: Partial<Record<ErrorCode, AIHint>> = {
  AGENT_NOT_FOUND: {
    severity: "terminal",
    suggestedAction: "List active agents and use a valid agent ID.",
    alternativeApproach:
      "Spawn a new agent if the intended one was terminated.",
  },
  RATE_LIMIT_EXCEEDED: {
    severity: "retry",
    suggestedAction: "Wait before retrying the request.",
  },
  RATE_LIMITED: {
    severity: "retry",
    suggestedAction: "Slow down and retry after a brief delay.",
  },
  WS_RATE_LIMITED: {
    severity: "retry",
    suggestedAction: "Reduce message frequency and retry connection.",
  },
  SPAWN_QUOTA_EXCEEDED: {
    severity: "recoverable",
    suggestedAction: "Terminate unused agents before spawning new ones.",
    alternativeApproach:
      "Request additional quota if more agents are required.",
  },
  QUOTA_EXCEEDED: {
    severity: "recoverable",
    suggestedAction: "Reduce usage or free capacity before retrying.",
  },
  BYOA_REQUIRED: {
    severity: "recoverable",
    suggestedAction: "Link at least one account before retrying the request.",
  },
  EMAIL_NOT_VERIFIED: {
    severity: "recoverable",
    suggestedAction: "Verify the email address before retrying.",
  },
  APPROVAL_REQUIRED: {
    severity: "recoverable",
    suggestedAction: "Request approval and retry once it is granted.",
  },
  SWEEP_APPROVAL_REQUIRED: {
    severity: "recoverable",
    suggestedAction: "Request approval for the sweep and retry when approved.",
  },
};

function defaultHintForCode(code: ErrorCode): AIHint {
  if (code.endsWith("_NOT_FOUND")) {
    return {
      severity: "terminal",
      suggestedAction: "Verify the identifier and retry with a valid resource.",
    };
  }

  if (code.endsWith("_ALREADY_EXISTS") || code.endsWith("_ALREADY_RUNNING")) {
    return {
      severity: "recoverable",
      suggestedAction:
        "Reuse the existing resource or choose a different identifier.",
    };
  }

  if (code.endsWith("_IN_PROGRESS") || code === "AGENT_BUSY") {
    return {
      severity: "retry",
      suggestedAction: "Wait for the current operation to complete and retry.",
    };
  }

  if (code.endsWith("_TIMEOUT")) {
    return {
      severity: "retry",
      suggestedAction: "Retry the request or increase the timeout window.",
    };
  }

  if (code.includes("RATE_LIMIT") || code.includes("QUOTA")) {
    return {
      severity: "retry",
      suggestedAction: "Back off and retry after a delay.",
    };
  }

  if (code.startsWith("AUTH_")) {
    return {
      severity: "recoverable",
      suggestedAction: "Re-authenticate and retry with valid credentials.",
    };
  }

  if (code.includes("INVALID") || code.includes("MISSING")) {
    return {
      severity: "recoverable",
      suggestedAction: "Fix the request parameters and retry.",
    };
  }

  if (code.includes("UNAVAILABLE")) {
    return {
      severity: "retry",
      suggestedAction: "Retry once the dependency becomes available.",
    };
  }

  if (
    code.endsWith("_FAILED") ||
    code.includes("ERROR") ||
    code.includes("INTERNAL")
  ) {
    return {
      severity: "retry",
      suggestedAction:
        "Retry the request and check logs if the issue persists.",
    };
  }

  if (code.includes("SUSPENDED") || code.includes("DISABLED")) {
    return {
      severity: "terminal",
      suggestedAction:
        "Contact support or an administrator to resolve the account status.",
    };
  }

  return {
    severity: "recoverable",
    suggestedAction: `Resolve the issue described by: ${DEFAULT_ERROR_MESSAGES[code]}.`,
  };
}

export const AI_HINTS: Record<ErrorCode, AIHint> = ERROR_CODE_LIST.reduce(
  (acc, code) => {
    acc[code] = AI_HINT_OVERRIDES[code] ?? defaultHintForCode(code);
    return acc;
  },
  {} as Record<ErrorCode, AIHint>,
);
