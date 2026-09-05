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
      where: {
        OR: [{ buyerId: userId }, { sellerId: userId }],
        status: { in: [TRADE_STATUS.RESERVED, TRADE_STATUS.COMPLETED] },
      },
      select: {
        buyerId: true,
        sellerId: true,
        status: true,
        conversationId: true,
        sellerShippedAt: true,
        buyerReceivedAt: true,
        reviews: { select: { fromUserId: true } },
      },
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

  const pendingCompleted = trades.filter(
    (t) => t.status === TRADE_STATUS.COMPLETED && !t.reviews.some((r) => r.fromUserId === userId) && t.conversationId,
  );
  const oldReviewConvos = pendingCompleted.length
    ? new Set(
        (
          await prisma.review.findMany({
            where: {
              fromUserId: userId,
              deal: { conversationId: { in: pendingCompleted.map((t) => t.conversationId as string) } },
            },
            select: { deal: { select: { conversationId: true } } },
          })
        )
          .map((r) => r.deal?.conversationId)
          .filter(Boolean),
      )
    : new Set<string>();

  const tradeAction = trades.filter((t) => {
    if (t.status === TRADE_STATUS.COMPLETED) {
      if (t.reviews.some((r) => r.fromUserId === userId)) return false;
      if (t.conversationId && oldReviewConvos.has(t.conversationId)) return false;
      return true;
    }
    if (t.sellerId === userId) return !t.sellerShippedAt;
    return Boolean(t.sellerShippedAt) && !t.buyerReceivedAt;
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
