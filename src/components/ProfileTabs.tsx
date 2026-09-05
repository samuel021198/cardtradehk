import Link from "next/link";

const TABS = [
  { value: "featured", label: "精選", icon: "▦" },
  { value: "selling", label: "售賣", icon: "▣" },
  { value: "auctions", label: "拍賣", icon: "◈" },
  { value: "sold", label: "已售", icon: "✓" },
] as const;

export function ProfileTabs({ userId, tab }: { userId: string; tab: string }) {
  return (
    <div className="grid grid-cols-4 border-t border-[var(--line)]">
      {TABS.map((item) => {
        const on = tab === item.value;
        return (
          <Link
            key={item.value}
            href={`/users/${userId}?tab=${item.value}`}
            className={`flex flex-col items-center gap-1 py-3 text-xs font-bold ${on ? "border-t-2 border-white text-white" : "text-[var(--muted)]"}`}
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}
