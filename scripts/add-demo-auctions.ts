import path from "path";
import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { auctionSeed, DEMO_AUCTIONS } from "./demo-catalog";

loadEnv({ path: path.join(process.cwd(), ".env"), override: true });
const prisma = new PrismaClient();

async function main() {
  const seller = await prisma.user.findFirst({
    where: { OR: [{ username: "try01" }, { displayName: "Yvonne Chan" }] },
  });
  if (!seller) throw new Error("找不到 try01");

  const titles = DEMO_AUCTIONS.map((item) => item.title);
  await prisma.auction.deleteMany({
    where: { sellerId: seller.id, title: { in: titles } },
  });

  await prisma.auction.createMany({
    data: DEMO_AUCTIONS.map((item, index) => auctionSeed(item, seller.id, index)),
  });

  const live = await prisma.auction.count({
    where: { sellerId: seller.id, status: "LIVE", endsAt: { gt: new Date() } },
  });
  console.log({ seller: seller.username, created: DEMO_AUCTIONS.length, live });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
