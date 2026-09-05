import { prisma } from "@/lib/prisma";

export function isUnreadChat(
  convo: {
    buyerId: string;
    sellerId: string;
    buyerLastReadAt?: Date | null;
    sellerLastReadAt?: Date | null;
    messages: { senderId: string; createdAt: Date }[];
  },
  userId: string,
) {
  const last = convo.messages[0];
  if (!last || last.senderId === userId) return false;
  const lastRead = convo.buyerId === userId ? convo.buyerLastReadAt : convo.sellerLastReadAt;
  if (!lastRead) return true;
  return last.createdAt.getTime() > lastRead.getTime();
}

export function chatLastReadAt(
  convo: { buyerId: string; buyerLastReadAt?: Date | null; sellerLastReadAt?: Date | null },
  userId: string,
) {
  return convo.buyerId === userId ? convo.buyerLastReadAt : convo.sellerLastReadAt;
}

export async function getNavBadges(userId: string) {
  const [notifications, conversations] = await Promise.all([
    prisma.notification.count({ where: { userId, readAt: null } }),
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

  const chats = conversations.filter((c) => isUnreadChat(c, userId)).length;

  return { notifications, chats };
}
