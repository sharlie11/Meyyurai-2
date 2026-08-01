import type { ReactNode } from "react";

export function ScreenHeader({
  eyebrow,
  title,
  description,
  right,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  right?: ReactNode;
}) {
  return (
    <header className="safe-top px-5 pt-6 pb-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          {eyebrow ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="font-display mt-1 text-[34px] leading-[1.05] text-foreground">{title}</h1>
          {description ? (
            <p className="mt-2 max-w-[22rem] text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {right}
      </div>
    </header>
  );
}
