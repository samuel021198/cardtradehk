import Link from "next/link";

const COLORS = ["#f5d000", "#7dd3fc", "#f9a8d4", "#86efac", "#fdba74", "#c4b5fd", "#fca5a5"];

export function Avatar({
  name,
  src,
  href,
  size = 36,
}: {
  name: string;
  src?: string | null;
  href?: string;
  size?: number;
}) {
  const initial = (name.trim()[0] || "?").toUpperCase();
  const color = COLORS[Math.abs(hash(name)) % COLORS.length];
  const node = (
    <span
      className="inline-grid shrink-0 place-items-center overflow-hidden rounded-full border border-[var(--line)] bg-[var(--chip)] font-black text-black"
      style={{ width: size, height: size, fontSize: Math.max(12, Math.round(size * 0.42)) }}
      title={name}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span className="grid h-full w-full place-items-center" style={{ background: color }}>
          {initial}
        </span>
      )}
    </span>
  );
  if (href) {
    return (
      <Link href={href} className="shrink-0" aria-label={name}>
        {node}
      </Link>
    );
  }
  return node;
}

function hash(value: string) {
  let n = 0;
  for (let i = 0; i < value.length; i += 1) n = (n * 31 + value.charCodeAt(i)) | 0;
  return n;
}
