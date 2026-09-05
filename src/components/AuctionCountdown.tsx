"use client";

import { useEffect, useState } from "react";
import { formatRemain } from "@/lib/auction";

export function AuctionCountdown({
  endsAt,
  prefix = "",
  className = "",
}: {
  endsAt: string | Date;
  prefix?: string;
  className?: string;
}) {
  const [text, setText] = useState("——：——：——：——");

  useEffect(() => {
    function tick() {
      setText(formatRemain(new Date(endsAt)));
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  return (
    <span className={className}>
      {prefix}
      {text}
    </span>
  );
}
