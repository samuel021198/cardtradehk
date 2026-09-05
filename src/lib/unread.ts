import { prisma } from "@/lib/prisma";
import { OFFER_STATUS, TRADE_STATUS } from "@/lib/constants";

export async function getNavBadges(userId: string) {
  const [notifications, offers, trades, conversations] = await Promise.all([
    prisma.notification.count({ where: { userId, readAt: null } }),
    prisma.offer.count({
      where: {
        status: OFFER_STATUS.PENDING,
        proposedById: { not: userId },
        OR: [{ buyerId: userId }, { sellerId: userId }],
      },
    }),
    prisma.trade.findMany({
      where: { status: TRADE_STATUS.RESERVED, OR: [{ buyerId: userId }, { sellerId: userId }] },
      select: { buyerId: true, sellerId: true, sellerShippedAt: true, buyerReceivedAt: true },
    }),
    prisma.conversation.findMany({
      where: { OR: [{ buyerId: userId }, { sellerId: userId }] },
      select: {
        buyerId: true,
        sellerId: true,
        buyerLastReadAt: true,
        sellerLastReadAt: true,
        messages: { orderBy: { createdAt: "desc" }, take: 1, select: { senderId: true, createdAt: true } },
      },
    }),
  ]);

  const tradeAction = trades.filter((t) => {
    if (t.sellerId === userId) return !t.sellerShippedAt;
    return !t.buyerReceivedAt;
  }).length;

  const chatUnread = conversations.filter((c) => {
    const last = c.messages[0];
    if (!last || last.senderId === userId) return false;
    const lastRead = c.buyerId === userId ? c.buyerLastReadAt : c.sellerLastReadAt;
    if (!lastRead) return true;
    return last.createdAt.getTime() > lastRead.getTime();
  }).length;

  return {
    notifications,
    trades: offers + tradeAction,
    chats: chatUnread,
  };
}
