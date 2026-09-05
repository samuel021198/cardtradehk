export const BUY_SECTIONS = [
  { type: "", label: "精選", href: "/" },
  { type: "GRADED", label: "鑑定卡", href: "/?type=GRADED" },
  { type: "RAW", label: "Raw卡", href: "/?type=RAW" },
  { type: "SEALED", label: "未開封產品", href: "/?type=SEALED" },
] as const;

export function buySectionLabel(type: string) {
  return BUY_SECTIONS.find((s) => s.type === type)?.label ?? "精選";
}

export const AUCTION_SECTIONS = [
  { type: "", label: "精選", href: "/auctions" },
  { type: "GRADED", label: "鑑定卡", href: "/auctions?type=GRADED" },
  { type: "RAW", label: "Raw卡", href: "/auctions?type=RAW" },
  { type: "SEALED", label: "未開封產品", href: "/auctions?type=SEALED" },
] as const;

export const MAX_AUCTION_DAYS = 7;
export const AUCTION_DURATIONS = [
  { hours: 24, label: "1 日" },
  { hours: 72, label: "3 日" },
  { hours: 120, label: "5 日" },
  { hours: 168, label: "7 日（最長）" },
] as const;
