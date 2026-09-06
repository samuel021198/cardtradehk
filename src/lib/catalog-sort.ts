import type { Prisma } from "@prisma/client";

export const CATALOG_SORTS = [
  { value: "newest", label: "發佈時間" },
  { value: "popular", label: "關注度" },
  { value: "price", label: "價錢" },
  { value: "ending", label: "完結時間" },
] as const;

export type CatalogSort = (typeof CATALOG_SORTS)[number]["value"];

export function parseCatalogSort(raw?: string | null): CatalogSort {
  if (raw === "popular" || raw === "price" || raw === "ending" || raw === "newest") return raw;
  return "newest";
}

export function listingOrderBy(sort: CatalogSort): Prisma.ListingOrderByWithRelationInput[] {
  if (sort === "popular") return [{ favorites: { _count: "desc" } }, { createdAt: "desc" }];
  if (sort === "price") return [{ priceHkd: "asc" }, { createdAt: "desc" }];
  return [{ createdAt: "desc" }];
}

export function auctionOrderBy(sort: CatalogSort): Prisma.AuctionOrderByWithRelationInput[] {
  if (sort === "popular") return [{ favorites: { _count: "desc" } }, { createdAt: "desc" }];
  if (sort === "price") return [{ startingBidHkd: "asc" }, { createdAt: "desc" }];
  if (sort === "ending") return [{ endsAt: "asc" }];
  return [{ createdAt: "desc" }];
}

export function catalogQuery(opts: { game?: string; type?: string; sort?: string; view?: string; q?: string }) {
  const search = new URLSearchParams();
  if (opts.q?.trim()) search.set("q", opts.q.trim());
  if (opts.game) search.set("game", opts.game);
  if (opts.type) search.set("type", opts.type);
  if (opts.game && opts.sort && opts.sort !== "newest") search.set("sort", opts.sort);
  if (opts.view === "listings") search.set("view", "listings");
  const qs = search.toString();
  return qs;
}

export function catalogHref(basePath: string, opts: { game?: string; type?: string; sort?: string; view?: string; q?: string }) {
  const qs = catalogQuery(opts);
  return qs ? `${basePath}?${qs}` : basePath;
}
