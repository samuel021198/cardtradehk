import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { UserAvatar } from "@/components/UserAvatar";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const conversations = await prisma.conversation.findMany({
    where: { OR: [{ buyerId: session.user.id }, { sellerId: session.user.id }] },
    include: {
      listing: true,
      auction: true,
      buyer: { select: { displayName: true, avatarUrl: true } },
      seller: { select: { displayName: true, avatarUrl: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-black">傾偈</h1>
      {conversations.length === 0 ? (
        <p className="text-[var(--muted)]">未有對話。去帖文撳「站內傾偈」就會出現喺度。</p>
      ) : (
        <div className="space-y-2">
          {conversations.map((c) => {
            const other = c.buyerId === session.user.id ? c.seller : c.buyer;
            const last = c.messages[0];
            const title = c.listing?.title ?? c.auction?.title ?? other.displayName;
            const price = c.listing?.priceHkd;
            return (
              <Link key={c.id} href={`/messages/${c.id}`} className="card flex items-center gap-4 p-4">
                <UserAvatar name={other.displayName} src={other.avatarUrl} />
                <div className="min-w-0 flex-1">
                  <div className="font-black">{title}</div>
                  <div className="text-sm text-[var(--muted)]">
                    {other.displayName}
                    {c.auctionId ? " · 拍賣得標" : ""}
                  </div>
                  <div className="truncate text-sm">{last?.body ?? "未有訊息"}</div>
                </div>
                {price != null && <div className="text-sm font-black text-[var(--accent)]">HK${price}</div>}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
