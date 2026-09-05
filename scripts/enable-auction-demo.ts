import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const ming = await prisma.user.update({
    where: { phone: "85291234567" },
    data: { canAuction: true },
  });

  const exists = await prisma.auction.findFirst({ where: { title: "Ember Drake 拍賣示範" } });
  if (!exists) {
    const now = new Date();
    await prisma.auction.create({
      data: {
        title: "Ember Drake 拍賣示範",
        game: "POKEMON",
        cardType: "GRADED",
        condition: "PSA10",
        description: "Demo 拍賣，3 日完。得標後私底下交收。",
        images: JSON.stringify(["/uploads/demo-01-ember-drake.png"]),
        startingBidHkd: 800,
        minIncrementHkd: 50,
        startsAt: now,
        endsAt: new Date(now.getTime() + 72 * 60 * 60 * 1000),
        sellerId: ming.id,
      },
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
