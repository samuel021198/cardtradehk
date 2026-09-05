import { prisma } from "@/lib/prisma";
import { LISTING_STATUS, OFFER_STATUS, TRADE_SOURCE, TRADE_STATUS } from "@/lib/constants";
import { NOTIFICATION_TYPE, notifyListingReserved, notifyUser } from "@/lib/notify";

export async function ensureListingConversation(listingId: string, buyerId: string, sellerId: string) {
  return prisma.conversation.upsert({
    where: { listingId_buyerId: { listingId, buyerId } },
    update: {},
    create: { listingId, buyerId, sellerId },
  });
}

export async function findOpenTrade(listingId: string) {
  return prisma.trade.findFirst({
    where: { listingId, status: TRADE_STATUS.RESERVED },
  });
}

export async function reserveListing(opts: {
  listing: { id: string; title: string; sellerId: string; status: string; priceHkd: number };
  buyerId: string;
  amountHkd: number;
  offerId?: string | null;
  source: string;
  actorId: string;
}) {
  const open = await findOpenTrade(opts.listing.id);
  if (open) throw new Error("呢件商品已經保留緊");
  if (opts.listing.status !== LISTING_STATUS.ACTIVE) throw new Error("只有放售中嘅商品先可以保留");
  if (opts.buyerId === opts.listing.sellerId) throw new Error("唔可以保留俾自己");

  const conversation = await ensureListingConversation(opts.listing.id, opts.buyerId, opts.listing.sellerId);
  const trade = await prisma.trade.create({
    data: {
      listingId: opts.listing.id,
      buyerId: opts.buyerId,
      sellerId: opts.listing.sellerId,
      offerId: opts.offerId ?? null,
      conversationId: conversation.id,
      amountHkd: opts.amountHkd,
      source: opts.source,
      status: TRADE_STATUS.RESERVED,
    },
  });

  await prisma.listing.update({
    where: { id: opts.listing.id },
    data: { status: LISTING_STATUS.RESERVED },
  });

  if (opts.offerId) {
    await prisma.offer.update({ where: { id: opts.offerId }, data: { status: OFFER_STATUS.ACCEPTED, amountHkd: opts.amountHkd } });
  }
  await prisma.offer.updateMany({
    where: {
      listingId: opts.listing.id,
      status: OFFER_STATUS.PENDING,
      ...(opts.offerId ? { id: { not: opts.offerId } } : {}),
    },
    data: { status: OFFER_STATUS.DECLINED },
  });

  const sourceText = opts.source === TRADE_SOURCE.OFFER ? `雙方同意 HK$${opts.amountHkd}` : `賣家人手保留，成交價 HK$${opts.amountHkd}`;
  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderId: opts.actorId,
      body: `商品已保留。${sourceText}。流程：賣家先確認發貨，買家再確認收貨，完成後去「交易中」互評。`,
    },
  });

  const otherId = opts.actorId === opts.listing.sellerId ? opts.buyerId : opts.listing.sellerId;
  await notifyUser(otherId, {
    type: NOTIFICATION_TYPE.TRADE,
    title: "商品已保留",
    body: `「${opts.listing.title}」已保留，成交 HK$${opts.amountHkd}`,
    href: "/trades",
    listingId: opts.listing.id,
    shopId: opts.listing.sellerId,
  });
  await notifyListingReserved(opts.listing, opts.buyerId);
  return trade;
}

export async function completeTrade(tradeId: string) {
  const trade = await prisma.trade.update({
    where: { id: tradeId },
    data: { status: TRADE_STATUS.COMPLETED, completedAt: new Date() },
    include: { listing: true, auction: true },
  });
  if (trade.listingId) {
    await prisma.listing.update({
      where: { id: trade.listingId },
      data: { status: LISTING_STATUS.SOLD },
    });
  }
  const title = trade.listing?.title ?? trade.auction?.title ?? "交易";
  await Promise.all([
    notifyUser(trade.buyerId, {
      type: NOTIFICATION_TYPE.TRADE,
      title: "交易完成，請評分",
      body: `「${title}」買家已確認收貨。去「交易中」評價對方。`,
      href: "/trades",
      listingId: trade.listingId,
      shopId: trade.sellerId,
    }),
    notifyUser(trade.sellerId, {
      type: NOTIFICATION_TYPE.TRADE,
      title: "交易完成，請評分",
      body: `「${title}」已完成。去「交易中」評價買家。`,
      href: "/trades",
      listingId: trade.listingId,
      shopId: trade.sellerId,
    }),
  ]);
  return trade;
}
