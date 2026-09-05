import { prisma } from "@/lib/prisma";

export async function viewerWatchState(userId?: string | null) {
  if (!userId) {
    return {
      listingIds: new Set<string>(),
      auctionIds: new Set<string>(),
      shopIds: new Set<string>(),
    };
  }

  const [favorites, follows] = await Promise.all([
    prisma.favorite.findMany({
      where: { userId },
      select: { listingId: true, auctionId: true },
    }),
    prisma.shopFollow.findMany({
      where: { userId },
      select: { shopId: true },
    }),
  ]);

  return {
    listingIds: new Set(favorites.map((f) => f.listingId).filter((id): id is string => Boolean(id))),
    auctionIds: new Set(favorites.map((f) => f.auctionId).filter((id): id is string => Boolean(id))),
    shopIds: new Set(follows.map((f) => f.shopId)),
  };
}
