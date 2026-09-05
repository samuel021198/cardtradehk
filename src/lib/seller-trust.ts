import { prisma } from "@/lib/prisma";

export type SellerTrust = {
  rating: number | null;
  reviewCount: number;
};

export async function sellerTrustMap(sellerIds: string[]) {
  const ids = [...new Set(sellerIds.filter(Boolean))];
  const map = new Map<string, SellerTrust>();
  if (ids.length === 0) return map;

  const rows = await prisma.review.groupBy({
    by: ["toUserId"],
    where: { toUserId: { in: ids } },
    _avg: { rating: true },
    _count: { _all: true },
  });

  for (const id of ids) {
    map.set(id, { rating: null, reviewCount: 0 });
  }
  for (const row of rows) {
    map.set(row.toUserId, {
      rating: row._avg.rating,
      reviewCount: row._count._all,
    });
  }
  return map;
}

export function trustLine(trust?: SellerTrust | null) {
  if (!trust) return "";
  if (trust.reviewCount > 0 && trust.rating != null) {
    return `${trust.rating.toFixed(1)} · ${trust.reviewCount} 則評價`;
  }
  return "尚未有評價";
}
