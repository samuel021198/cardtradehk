import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { UserAvatar } from "@/components/UserAvatar";
import { MarkNotificationsRead } from "@/components/MarkNotificationsRead";
import { chatLastReadAt, isUnreadChat } from "@/lib/unread";

export const dynamic = "force-dynamic";

function typeLabel(type: string) {
  if (type === "PRICE_DROP") return "減價";
  if (type === "OUTBID") return "被超價";
  if (type === "SOLD") return "已出售";
  if (type === "NEW_LISTING") return "商店新貨";
  if (type === "NEW_AUCTION") return "商店拍賣";
  if (type === "RESERVED") return "已保留";
  if (type === "OFFER") return "出價";
  if (type === "TRADE") return "交易";
  if (type === "REPORT") return "檢舉";
  return "動態";
}

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/messages");
  const { tab = "inbox" } = await searchParams;
  const alerts = tab === "alerts";

  const [conversations, notifications] = await Promise.all([
    prisma.conversation.findMany({
      where: { OR: [{ buyerId: session.user.id }, { sellerId: session.user.id }] },
      include: {
        listing: true,
        auction: true,
        buyer: { select: { displayName: true, avatarUrl: true } },
        seller: { select: { displayName: true, avatarUrl: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 80,
    }),
  ]);

  const unreadNotes = notifications.filter((n) => !n.readAt).length;
  const incoming = conversations.length
    ? await prisma.message.findMany({
        where: {
          conversationId: { in: conversations.map((c) => c.id) },
          senderId: { not: session.user.id },
        },
        select: { conversationId: true, createdAt: true },
      })
    : [];
  const unreadByConvo = new Map<string, number>();
  for (const c of conversations) {
    if (!isUnreadChat(c, session.user.id)) continue;
    const lastRead = chatLastReadAt(c, session.user.id);
    const count = incoming.filter(
      (m) => m.conversationId === c.id && (!lastRead || m.createdAt.getTime() > lastRead.getTime()),
    ).length;
    unreadByConvo.set(c.id, Math.max(count, 1));
  }
  const unreadChats = unreadByConvo.size;
  const inboxRows = [...conversations].sort((a, b) => {
    const au = unreadByConvo.has(a.id) ? 1 : 0;
    const bu = unreadByConvo.has(b.id) ? 1 : 0;
    if (au !== bu) return bu - au;
    return b.updatedAt.getTime() - a.updatedAt.getTime();
  });
  const alertRows = [...notifications].sort((a, b) => {
    const au = a.readAt ? 0 : 1;
    const bu = b.readAt ? 0 : 1;
    if (au !== bu) return bu - au;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-black tracking-tight">訊息</h1>
        <p className="mt-2 text-[var(--muted)]">對話與系統通知集中於此。</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Link
          href="/messages"
          className={`rounded-full px-4 py-2 text-sm font-bold ${!alerts ? "bg-[var(--accent)] text-black" : "bg-[var(--chip)]"}`}
        >
          對話{unreadChats > 0 ? ` · ${unreadChats}` : ""}
        </Link>
        <Link
          href="/messages?tab=alerts"
          className={`rounded-full px-4 py-2 text-sm font-bold ${alerts ? "bg-[var(--accent)] text-black" : "bg-[var(--chip)]"}`}
        >
          通知{unreadNotes > 0 ? ` · ${unreadNotes}` : ""}
        </Link>
      </div>

      {!alerts && (
        conversations.length === 0 ? (
          <p className="text-[var(--muted)]">尚未有對話。於商品頁選擇「站內訊息」後，對話會顯示於此。</p>
        ) : (
          <div className="space-y-2">
            {inboxRows.map((c) => {
              const other = c.buyerId === session.user.id ? c.seller : c.buyer;
              const last = c.messages[0];
              const title = c.listing?.title ?? c.auction?.title ?? other.displayName;
              const price = c.listing?.priceHkd;
              const unreadCount = unreadByConvo.get(c.id) ?? 0;
              const unread = unreadCount > 0;
              return (
                <Link
                  key={c.id}
                  href={`/messages/${c.id}`}
                  className={`card flex items-center gap-4 p-4 ${unread ? "border-[var(--accent)] bg-[var(--accent)]/10" : "opacity-75"}`}
                >
                  <div className="relative">
                    <UserAvatar name={other.displayName} src={other.avatarUrl} />
                    {unread && (
                      <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[var(--accent)] px-1 text-[10px] font-black text-black">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <div className="truncate font-black">{title}</div>
                      {unread && (
                        <span className="shrink-0 rounded-full bg-[var(--accent)] px-2 py-0.5 text-[10px] font-black text-black">
                          未讀
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-[var(--muted)]">
                      {other.displayName}
                      {c.auctionId ? " · 拍賣得標" : ""}
                    </div>
                    <div className={`truncate text-sm ${unread ? "font-bold" : "text-[var(--muted)]"}`}>
                      {last?.body ?? "未有訊息"}
                    </div>
                  </div>
                  {price != null && <div className="text-sm font-black text-[var(--accent)]">HK${price}</div>}
                </Link>
              );
            })}
          </div>
        )
      )}

      {alerts && (
        <>
          <div className="flex justify-end">
            {unreadNotes > 0 && <MarkNotificationsRead />}
          </div>
          {notifications.length === 0 ? (
            <p className="py-12 text-center text-[var(--muted)]">暫時未有通知。收藏商品或關注商店後即可接收動態。</p>
          ) : (
            <div className="space-y-2">
              {alertRows.map((n) => (
                <Link
                  key={n.id}
                  href={`/notifications/${n.id}`}
                  className={`card block p-4 ${n.readAt ? "opacity-70" : "border-[var(--accent)] bg-[var(--accent)]/10"}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-bold text-[var(--accent)]">{typeLabel(n.type)}</span>
                    <div className="flex items-center gap-2">
                      {!n.readAt && (
                        <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-[10px] font-black text-black">
                          未讀
                        </span>
                      )}
                      <span className="text-xs text-[var(--muted)]">{n.createdAt.toLocaleString("zh-HK")}</span>
                    </div>
                  </div>
                  <div className="mt-1 font-black">{n.title}</div>
                  <p className="mt-1 text-sm text-[var(--muted)]">{n.body}</p>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
