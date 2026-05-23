import type { ReactNode } from "react";

interface PanelCardProps {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}

/**
 * Admin dashboard panel card — premium HUXZAIN black/gold style.
 * Renders a titled card with an optional action button in the header.
 */
export function PanelCard({ title, action, children }: PanelCardProps) {
  return (
    <div className="rounded-2xl border border-border bg-surface/60 overflow-hidden">
      {/* Card header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/60 bg-surface-elevated/40">
        <h2 className="font-display text-lg font-semibold text-foreground">{title}</h2>
        {action && <div>{action}</div>}
      </div>

      {/* Card body */}
      <div className="px-6 py-6">{children}</div>
    </div>
  );
}
