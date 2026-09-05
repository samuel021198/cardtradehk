import { prisma } from "@/lib/prisma";

export const NOTIFICATION_TYPE = {
  PRICE_DROP: "PRICE_DROP",
  SOLD: "SOLD",
  RESERVED: "RESERVED",
  NEW_LISTING: "NEW_LISTING",
  NEW_AUCTION: "NEW_AUCTION",
  OFFER: "OFFER",
  TRADE: "TRADE",
  REPORT: "REPORT",
} as const;

async function notifyUsers(
  userIds: string[],
  data: {
    type: string;
    title: string;
    body: string;
    href: string;
    listingId?: string | null;
    auctionId?: string | null;
    shopId?: string | null;
  },
) {
  const ids = [...new Set(userIds)].filter(Boolean);
  if (ids.length === 0) return;
  await prisma.notification.createMany({
    data: ids.map((userId) => ({
      userId,
      type: data.type,
      title: data.title,
      body: data.body,
      href: data.href,
      listingId: data.listingId ?? null,
      auctionId: data.auctionId ?? null,
      shopId: data.shopId ?? null,
    })),
  });
}

export async function listingWatcherIds(listingId: string, sellerId: string) {
  const [favorites, follows] = await Promise.all([
    prisma.favorite.findMany({ where: { listingId }, select: { userId: true } }),
    prisma.shopFollow.findMany({ where: { shopId: sellerId }, select: { userId: true } }),
  ]);
  return [...new Set([...favorites, ...follows].map((row) => row.userId))].filter((id) => id !== sellerId);
}

export async function shopFollowerIds(shopId: string) {
  const follows = await prisma.shopFollow.findMany({ where: { shopId }, select: { userId: true } });
  return follows.map((row) => row.userId).filter((id) => id !== shopId);
}

export async function notifyListingPriceDrop(listing: { id: string; title: string; sellerId: string; priceHkd: number }, oldPrice: number) {
  const userIds = await listingWatcherIds(listing.id, listing.sellerId);
  await notifyUsers(userIds, {
    type: NOTIFICATION_TYPE.PRICE_DROP,
    title: "收藏商品減價",
    body: `「${listing.title}」由 HK$${oldPrice} 減到 HK$${listing.priceHkd}`,
    href: `/listings/${listing.id}`,
    listingId: listing.id,
    shopId: listing.sellerId,
  });
}

export async function notifyListingSold(listing: { id: string; title: string; sellerId: string; priceHkd: number }) {
  const userIds = await listingWatcherIds(listing.id, listing.sellerId);
  await notifyUsers(userIds, {
    type: NOTIFICATION_TYPE.SOLD,
    title: "收藏商品已出售",
    body: `「${listing.title}」已標記出售（HK$${listing.priceHkd}）`,
    href: `/listings/${listing.id}`,
    listingId: listing.id,
    shopId: listing.sellerId,
  });
}

export async function notifyShopNewListing(listing: { id: string; title: string; sellerId: string; priceHkd: number }, shopName: string) {
  const userIds = await shopFollowerIds(listing.sellerId);
  await notifyUsers(userIds, {
    type: NOTIFICATION_TYPE.NEW_LISTING,
    title: `${shopName} 有新放售`,
    body: `「${listing.title}」HK$${listing.priceHkd}`,
    href: `/listings/${listing.id}`,
    listingId: listing.id,
    shopId: listing.sellerId,
  });
}

export async function notifyUser(
  userId: string,
  data: {
    type: string;
    title: string;
    body: string;
    href: string;
    listingId?: string | null;
    shopId?: string | null;
  },
) {
  if (!userId) return;
  await notifyUsers([userId], data);
}

export async function notifyListingReserved(listing: { id: string; title: string; sellerId: string }, exceptUserId?: string) {
  const userIds = (await listingWatcherIds(listing.id, listing.sellerId)).filter((id) => id !== exceptUserId);
  await notifyUsers(userIds, {
    type: NOTIFICATION_TYPE.RESERVED,
    title: "收藏商品已保留",
    body: `「${listing.title}」已保留俾其他買家，暫時唔再接受新出價。`,
    href: `/listings/${listing.id}`,
    listingId: listing.id,
    shopId: listing.sellerId,
  });
}

export async function notifyAdmins(data: {
  type: string;
  title: string;
  body: string;
  href: string;
  shopId?: string | null;
}) {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", status: { not: "BLOCKED" } },
    select: { id: true },
  });
  await notifyUsers(
    admins.map((a) => a.id),
    data,
  );
}

export async function notifyShopNewAuction(auction: { id: string; title: string; sellerId: string; startingBidHkd: number }, shopName: string) {
  const userIds = await shopFollowerIds(auction.sellerId);
  await notifyUsers(userIds, {
    type: NOTIFICATION_TYPE.NEW_AUCTION,
    title: `${shopName} 開咗新拍賣`,
    body: `「${auction.title}」起拍 HK$${auction.startingBidHkd}`,
    href: `/auctions/${auction.id}`,
    auctionId: auction.id,
    shopId: auction.sellerId,
  });
}
