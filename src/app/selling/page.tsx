import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CARD_TYPES, GAMES, LISTING_STATUS, gameLabel, isValidCardType } from "@/lib/constants";
import { auctionIsLive, currentBid } from "@/lib/auction";
import { ListingCard } from "@/components/ListingCard";
import { SellerListingActions } from "@/components/SellerListingActions";

export const dynamic = "force-dynamic";

const STATUS_TABS = [
  { value: "ACTIVE", label: "放售中" },
  { value: "RESERVED", label: "已保留" },
  { value: "SOLD", label: "已售" },
  { value: "HIDDEN", label: "隱藏" },
] as const;

function hrefFor(status: string, type: string, game: string) {
  const q = new URLSearchParams();
  if (status && status !== "ACTIVE") q.set("status", status);
  if (type) q.set("type", type);
  if (game) q.set("game", game);
  const qs = q.toString();
  return qs ? `/selling?${qs}` : "/selling";
}

function pillClass(active: boolean) {
  return active
    ? "rounded-full bg-[var(--accent)] px-3 py-1.5 text-sm font-bold text-black"
    : "rounded-full bg-[var(--chip)] px-3 py-1.5 text-sm font-semibold text-[var(--muted)] hover:text-[var(--ink)]";
}

export default async function SellingPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; type?: string; game?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/selling");

  const { status: statusRaw = "", type = "", game = "" } = await searchParams;
  const status = Object.values(LISTING_STATUS).includes(statusRaw as (typeof LISTING_STATUS)[keyof typeof LISTING_STATUS])
    ? statusRaw
    : LISTING_STATUS.ACTIVE;
  const cardType = isValidCardType(type) ? type : "";

  const listings = await prisma.listing.findMany({
    where: {
      sellerId: session.user.id,
      status,
      ...(cardType ? { cardType } : {}),
      ...(game ? { game } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  const counts = await prisma.listing.groupBy({
    by: ["status"],
    where: { sellerId: session.user.id },
    _count: { _all: true },
  });
  const countByStatus = Object.fromEntries(counts.map((c) => [c.status, c._count._all]));

  const auctions =
    status === LISTING_STATUS.ACTIVE
      ? await prisma.auction.findMany({
          where: { sellerId: session.user.id },
          include: { bids: { orderBy: { amountHkd: "desc" }, take: 1 } },
          orderBy: { endsAt: "desc" },
        })
      : [];
  const liveAuctions = auctions.filter((a) => auctionIsLive(a.endsAt, a.status));

  const groups = CARD_TYPES.map((t) => ({
    ...t,
    games: GAMES.map((g) => ({
      ...g,
      items: listings.filter((item) => item.cardType === t.value && item.game === g.value),
    })).filter((g) => g.items.length > 0),
  })).filter((t) => t.games.length > 0);

  return (
    <div className="space-y-6">
      <section className="card space-y-4 p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-[var(--accent)]">賣家中心</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight">我的商品</h1>
            <p className="mt-2 text-[var(--muted)]">可標記已出售，或手動選擇「已保留」鎖定買家。保留後請前往「交易中」確認交收。</p>
          </div>
          <Link className="btn-primary" href="/listings/new">
            新放售
          </Link>
        </div>
        <div className="flex flex-wrap gap-2">
          {STATUS_TABS.map((tab) => (
            <Link key={tab.value} href={hrefFor(tab.value, cardType, game)} className={pillClass(status === tab.value)}>
              {tab.label} {countByStatus[tab.value] ?? 0}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={hrefFor(status, "", game)} className={pillClass(!cardType)}>
            全部類型
          </Link>
          {CARD_TYPES.map((t) => (
            <Link key={t.value} href={hrefFor(status, t.value, game)} className={pillClass(cardType === t.value)}>
              {t.label}
            </Link>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={hrefFor(status, cardType, "")} className={pillClass(!game)}>
            全部種類
          </Link>
          {GAMES.map((g) => (
            <Link key={g.value} href={hrefFor(status, cardType, g.value)} className={pillClass(game === g.value)}>
              {g.label}
            </Link>
          ))}
        </div>
      </section>

      {status === LISTING_STATUS.ACTIVE && liveAuctions.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xl font-black">拍賣中</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {liveAuctions.map((item) => (
              <ListingCard
                key={item.id}
                id={item.id}
                title={item.title}
                game={item.game}
                cardType={item.cardType}
                condition={item.condition}
                priceHkd={currentBid(item.startingBidHkd, item.bids[0]?.amountHkd)}
                images={JSON.parse(item.images) as string[]}
                href={`/auctions/${item.id}`}
                priceLabel={`目前 HK$${currentBid(item.startingBidHkd, item.bids[0]?.amountHkd)}`}
                endsAt={item.endsAt}
              />
            ))}
          </div>
        </section>
      )}

      {listings.length === 0 ? (
        <p className="py-12 text-center text-[var(--muted)]">
          {status === "ACTIVE"
            ? "目前沒有放售中的商品。"
            : status === "RESERVED"
              ? "尚未有已保留商品。"
              : status === "SOLD"
                ? "尚未有已售商品。"
                : "尚未有隱藏商品。"}
        </p>
      ) : (
        <div className="space-y-10">
          {groups.map((typeGroup) => (
            <section key={typeGroup.value} className="space-y-6">
              {!cardType && <h2 className="text-xl font-black">{typeGroup.label}</h2>}
              {typeGroup.games.map((gameGroup) => (
                <div key={gameGroup.value} className="space-y-3">
                  <h3 className="text-sm font-bold text-[var(--muted)]">
                    {cardType ? gameLabel(gameGroup.value) : `${typeGroup.label} · ${gameGroup.label}`}
                  </h3>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                    {gameGroup.items.map((item) => (
                      <div key={item.id} className="space-y-2">
                        <ListingCard
                          id={item.id}
                          title={item.title}
                          game={item.game}
                          cardType={item.cardType}
                          condition={item.condition}
                          priceHkd={item.priceHkd}
                          images={JSON.parse(item.images) as string[]}
                          status={item.status}
                        />
                        <SellerListingActions listingId={item.id} status={item.status} compact />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
