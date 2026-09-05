import type { ReactNode } from "react";
import Link from "next/link";

export function CatalogSection({
  kicker,
  title,
  hint,
  href,
  hrefLabel,
  children,
}: {
  kicker: string;
  title: string;
  hint?: string;
  href?: string;
  hrefLabel?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-[var(--accent)]">{kicker}</p>
          <h2 className="text-xl font-black tracking-tight md:text-2xl">{title}</h2>
          {hint && <p className="mt-1 text-sm text-[var(--muted)]">{hint}</p>}
        </div>
        {href && (
          <Link href={href} className="shrink-0 text-sm font-bold text-[var(--accent)]">
            {hrefLabel ?? "查看全部"}
          </Link>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">{children}</div>
    </section>
  );
}
