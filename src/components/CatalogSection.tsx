import type { ReactNode } from "react";
import Link from "next/link";

export function CatalogSection({
  kicker,
  title,
  hint,
  moreHref,
  children,
}: {
  kicker: string;
  title: string;
  hint?: string;
  moreHref?: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <p className="text-sm font-bold text-[var(--accent)]">{kicker}</p>
        <h2 className="text-xl font-black tracking-tight md:text-2xl">{title}</h2>
        {hint && <p className="mt-1 text-sm text-[var(--muted)]">{hint}</p>}
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">{children}</div>
      {moreHref && (
        <div className="flex justify-end">
          <Link href={moreHref} className="text-sm font-bold text-[var(--accent)]">
            查看更多
          </Link>
        </div>
      )}
    </section>
  );
}
