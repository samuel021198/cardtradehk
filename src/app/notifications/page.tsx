import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MarkNotificationsRead } from "@/components/MarkNotificationsRead";

export const dynamic = "force-dynamic";

function typeLabel(type: string) {
  if (type === "PRICE_DROP") return "減價";
  if (type === "SOLD") return "已出售";
  if (type === "NEW_LISTING") return "商店新貨";
  if (type === "NEW_AUCTION") return "商店拍賣";
  if (type === "RESERVED") return "已保留";
  if (type === "OFFER") return "出價";
  if (type === "TRADE") return "交易";
  if (type === "REPORT") return "檢舉";
  return "動態";
}

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/notifications");

  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 80,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black tracking-tight">消息</h1>
          <p className="mt-2 text-[var(--muted)]">你收藏嘅商品、關注嘅商店有減價、出售或者上新貨，都會喺度出通知。</p>
        </div>
        {notifications.some((n) => !n.readAt) && <MarkNotificationsRead />}
      </div>
      {notifications.length === 0 ? (
        <p className="py-12 text-center text-[var(--muted)]">暫時未有消息。收藏帖或者關注商店之後就會收到動態。</p>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <Link
              key={n.id}
              href={`/notifications/${n.id}`}
              className={`card block p-4 ${n.readAt ? "opacity-70" : ""}`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-bold text-[var(--accent)]">{typeLabel(n.type)}</span>
                <span className="text-xs text-[var(--muted)]">{n.createdAt.toLocaleString("zh-HK")}</span>
              </div>
              <div className="mt-1 font-black">{n.title}</div>
              <p className="mt-1 text-sm text-[var(--muted)]">{n.body}</p>
              {!n.readAt && <div className="mt-2 text-xs font-bold text-[var(--accent)]">未讀</div>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
