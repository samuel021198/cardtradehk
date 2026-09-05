"use client";

import { useState } from "react";

export function CoverImage({
  src,
  alt,
  className,
  priority = false,
}: {
  src?: string | null;
  alt: string;
  className?: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className={`grid h-full w-full place-items-center px-4 text-center text-sm font-bold text-[var(--muted)] ${className ?? ""}`}>
        {alt}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className ?? "h-full w-full object-cover"}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : "low"}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}
