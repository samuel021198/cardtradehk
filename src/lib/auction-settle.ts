import { prisma } from "@/lib/prisma";
import { TRADE_SOURCE, TRADE_STATUS } from "@/lib/constants";
import { WINNER_RESPOND_HOURS } from "@/lib/auction";
import { NOTIFICATION_TYPE, notifyUser } from "@/lib/notify";

export async function settleEndedAuction(auctionId: string) {
  const auction = await prisma.auction.findUnique({
    where: { id: auctionId },
    include: {
      seller: true,
      bids: { include: { bidder: true }, orderBy: { amountHkd: "desc" } },
      trades: true,
    },
  });
  if (!auction) return null;
  const ended = auction.endsAt.getTime() <= Date.now();
  if (!ended) return auction;
  if (auction.status === "LIVE") {
    await prisma.auction.update({ where: { id: auctionId }, data: { status: "ENDED" } });
  }

  const winner = auction.bids[0];
  if (!winner) return auction;
  const existing = auction.trades.find((t) => t.status !== TRADE_STATUS.CANCELLED);
  if (existing) return auction;

  const conversation = await prisma.conversation.upsert({
    where: { auctionId_buyerId: { auctionId, buyerId: winner.bidderId } },
    update: {},
    create: { auctionId, buyerId: winner.bidderId, sellerId: auction.sellerId },
  });

  const respondBy = new Date(Date.now() + WINNER_RESPOND_HOURS * 60 * 60 * 1000);
  await prisma.trade.create({
    data: {
      auctionId,
      buyerId: winner.bidderId,
      sellerId: auction.sellerId,
      conversationId: conversation.id,
      amountHkd: winner.amountHkd,
      source: TRADE_SOURCE.AUCTION,
      status: TRADE_STATUS.RESERVED,
      respondBy,
    },
  });

  await prisma.message.createMany({
    data: [
      {
        conversationId: conversation.id,
        senderId: auction.sellerId,
        body: `恭喜你以$${winner.amountHkd}拍得「${auction.title}」。請喺 48 小時內去「交易中」確認得標。棄單會記低，兩次或以上會限制再出價。`,
      },
      {
        conversationId: conversation.id,
        senderId: auction.sellerId,
        body: `交收方式：${auction.seller.deliveryNote?.trim() || "（賣家未設定預設交收）"}\n付款方法：${auction.seller.paymentNote?.trim() || "（賣家未設定預設付款）"}`,
      },
    ],
  });

  await notifyUser(winner.bidderId, {
    type: NOTIFICATION_TYPE.TRADE,
    title: "你拍到喇",
    body: `「${auction.title}」以 HK$${winner.amountHkd} 得標，請 48 小時內確認。`,
    href: "/trades",
    shopId: auction.sellerId,
  });
  await notifyUser(auction.sellerId, {
    type: NOTIFICATION_TYPE.TRADE,
    title: "拍賣已結束",
    body: `「${auction.title}」得標者：${winner.bidder.displayName} · HK$${winner.amountHkd}`,
    href: `/auctions/${auction.id}`,
    shopId: auction.sellerId,
  });

  return prisma.auction.findUnique({ where: { id: auctionId } });
}
