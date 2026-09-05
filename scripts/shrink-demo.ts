import path from "path";
import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { auctionSeed, DEMO_AUCTIONS, DEMO_PRODUCTS } from "./demo-catalog";

loadEnv({ path: path.join(process.cwd(), ".env"), override: true });
const prisma = new PrismaClient();

const DROP_USERS = ["try02", "try03", "try04", "try05", "try06", "try07", "try08", "try09", "try10"];

async function main() {
  const dropped = await prisma.user.deleteMany({ where: { username: { in: DROP_USERS } } });

  const seller = await prisma.user.findFirst({
    where: { OR: [{ username: "try01" }, { displayName: "Yvonne Chan" }] },
  });
  if (!seller) throw new Error("找不到 try01");

  const demoIds = (
    await prisma.user.findMany({
      where: { username: { in: ["Admin01", "try01"] } },
      select: { id: true },
    })
  ).map((u) => u.id);

  const goneListings = await prisma.listing.deleteMany({ where: { sellerId: { in: demoIds } } });
  const goneAuctions = await prisma.auction.deleteMany({ where: { sellerId: { in: demoIds } } });

  await prisma.listing.createMany({
    data: DEMO_PRODUCTS.map((item) => ({
      title: item.title,
      game: item.game,
      cardType: item.cardType,
      condition: item.condition,
      description: item.description,
      images: JSON.stringify([item.imageUrl]),
      priceHkd: item.priceHkd,
      sellerId: seller.id,
      status: "ACTIVE",
    })),
  });

  await prisma.auction.createMany({
    data: DEMO_AUCTIONS.map((item, index) => auctionSeed(item, seller.id, index)),
  });

  const counts = await prisma.listing.groupBy({
    by: ["game"],
    where: { sellerId: seller.id, status: "ACTIVE" },
    _count: true,
  });

  console.log({
    deletedUsers: dropped.count,
    deletedListings: goneListings.count,
    deletedAuctions: goneAuctions.count,
    createdListings: DEMO_PRODUCTS.length,
    createdAuctions: DEMO_AUCTIONS.length,
    byGame: Object.fromEntries(counts.map((c) => [c.game, c._count])),
    seller: seller.username,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
