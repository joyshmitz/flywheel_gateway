import type { ReactNode } from "react";

type Tone = "positive" | "warning" | "danger" | "muted";

interface StatusPillProps {
  tone?: Tone;
  children: ReactNode;
}

export function StatusPill({ tone = "muted", children }: StatusPillProps) {
  return <span className={`status-pill status-pill--${tone}`}>{children}</span>;
}
