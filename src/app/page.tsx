import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { LISTING_STATUS, isValidCardType } from "@/lib/constants";
import { USER_STATUS } from "@/lib/permissions";
import { buySectionLabel } from "@/lib/buy";
import { ListingCard } from "@/components/ListingCard";
import { SearchBar } from "@/components/SearchBar";
import { auth } from "@/lib/auth";
import { viewerWatchState } from "@/lib/watch";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; game?: string; type?: string }>;
}) {
  const { q = "", game = "", type = "" } = await searchParams;
  const cardType = isValidCardType(type) ? type : "";
  const section = buySectionLabel(cardType);
  const [session, listings] = await Promise.all([
    auth(),
    prisma.listing.findMany({
      where: {
        status: LISTING_STATUS.ACTIVE,
        seller: { status: { not: USER_STATUS.BLOCKED } },
        ...(cardType ? { cardType } : {}),
        ...(game ? { game } : {}),
        ...(q
          ? {
              OR: [{ title: { contains: q } }, { description: { contains: q } }],
            }
          : {}),
      },
      select: {
        id: true,
        title: true,
        game: true,
        cardType: true,
        condition: true,
        priceHkd: true,
        images: true,
        sellerId: true,
        seller: { select: { displayName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 24,
    }),
  ]);
  const watch = await viewerWatchState(session?.user?.id);

  return (
    <div className="space-y-6">
      <section className="card p-4 md:p-6">
        <p className="text-sm font-bold text-[var(--accent)]">消費 · {section}</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight md:text-3xl">
          {cardType ? `搵${section}` : "精選放售"}
        </h1>
        <p className="mt-2 hidden max-w-2xl text-[var(--muted)] md:block">
          用種類再篩：Pokémon、One Piece、Lorcana、球員卡、Riftbound、其他。
        </p>
        <div className="mt-5">
          <Suspense>
            <SearchBar />
          </Suspense>
        </div>
      </section>
      {listings.length === 0 ? (
        <p className="py-16 text-center text-[var(--muted)]">呢類暫時未有帖。</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {listings.map((item, index) => (
            <ListingCard
              key={item.id}
              id={item.id}
              title={item.title}
              game={item.game}
              cardType={item.cardType}
              condition={item.condition}
              priceHkd={item.priceHkd}
              images={JSON.parse(item.images) as string[]}
              sellerName={item.seller.displayName}
              showFavorite={session?.user?.id !== item.sellerId}
              favorited={watch.listingIds.has(item.id)}
              priority={index < 8}
            />
          ))}
        </div>
      )}
    </div>
  );
}
