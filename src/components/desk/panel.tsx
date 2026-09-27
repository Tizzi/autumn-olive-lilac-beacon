import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Panel({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl bg-surface p-4 shadow-[var(--shadow-border)] md:p-5",
        className,
      )}
    >
      {children}
    </section>
  );
}

export function PanelTitle({
  kicker,
  title,
  action,
}: {
  kicker?: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        {kicker ? (
          <p className="mb-1 text-[11px] font-medium tracking-[0.14em] text-dim uppercase">
            {kicker}
          </p>
        ) : null}
        <h2 className="font-display text-lg leading-tight text-fg md:text-xl">{title}</h2>
      </div>
      {action}
    </div>
  );
}
