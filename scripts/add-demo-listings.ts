import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const demos = [
  {
    title: "Ember Drake — 鑑定示範",
    game: "POKEMON",
    cardType: "GRADED",
    condition: "PSA10",
    priceHkd: 1880,
    description: "Demo 帖。原創火焰龍卡，模擬鑑定狀態。旺角面交。",
    images: ["/uploads/demo-01-ember-drake.png"],
    sellerPhone: "85291234567",
  },
  {
    title: "Spark Pup — Raw A",
    game: "POKEMON",
    cardType: "RAW",
    condition: "A",
    priceHkd: 220,
    description: "Demo 帖。雷光狐狸原創卡，Raw 品質 A。",
    images: ["/uploads/demo-02-spark-pup.png"],
    sellerPhone: "85298765432",
  },
  {
    title: "Tide Captain — Raw A",
    game: "ONE_PIECE",
    cardType: "RAW",
    condition: "A",
    priceHkd: 480,
    description: "Demo 帖。海賊船長原創卡，近全新。",
    images: ["/uploads/demo-03-tide-captain.png"],
    sellerPhone: "85291234567",
  },
  {
    title: "Moonlit Queen — BGS10",
    game: "LORCANA",
    cardType: "GRADED",
    condition: "BGS10",
    priceHkd: 1560,
    description: "Demo 帖。月光女王原創卡，模擬 BGS10。",
    images: ["/uploads/demo-04-moonlit-queen.png"],
    sellerPhone: "85298765432",
  },
  {
    title: "Court Ace Rookie — Raw B",
    game: "SPORTS",
    cardType: "RAW",
    condition: "B",
    priceHkd: 360,
    description: "Demo 帖。籃球新秀原創球員卡，品質 B。",
    images: ["/uploads/demo-05-court-ace.png"],
    sellerPhone: "85291234567",
  },
  {
    title: "Pitch Striker — PSA9",
    game: "SPORTS",
    cardType: "GRADED",
    condition: "PSA9",
    priceHkd: 920,
    description: "Demo 帖。足球前鋒原創卡，模擬 PSA9。",
    images: ["/uploads/demo-06-pitch-striker.png"],
    sellerPhone: "85298765432",
  },
  {
    title: "Riftbound Gatebreak — 原盒",
    game: "RIFTBOUND",
    cardType: "SEALED",
    condition: "BOX",
    priceHkd: 780,
    description: "Demo 帖。未開封原盒，膠膜完整。",
    images: ["/uploads/demo-07-rift-box.png"],
    sellerPhone: "85291234567",
  },
  {
    title: "Wild Spark Booster Box — 原盒",
    game: "POKEMON",
    cardType: "SEALED",
    condition: "BOX",
    priceHkd: 980,
    description: "Demo 帖。未開封 booster box。",
    images: ["/uploads/demo-08-wild-spark-box.png"],
    sellerPhone: "85298765432",
  },
  {
    title: "Sea Crew Case — 原箱",
    game: "ONE_PIECE",
    cardType: "SEALED",
    condition: "CASE",
    priceHkd: 4280,
    description: "Demo 帖。未開封原箱，適合批發示範。",
    images: ["/uploads/demo-09-sea-crew-case.png"],
    sellerPhone: "85291234567",
  },
  {
    title: "Runewarden — Raw A",
    game: "RIFTBOUND",
    cardType: "RAW",
    condition: "A",
    priceHkd: 310,
    description: "Demo 帖。符文法師原創卡。",
    images: ["/uploads/demo-10-runewarden.png"],
    sellerPhone: "85298765432",
  },
];

async function main() {
  await prisma.listing.updateMany({
    where: { images: "[]" },
    data: { status: "HIDDEN" },
  });

  for (const item of demos) {
    const seller = await prisma.user.findUnique({ where: { phone: item.sellerPhone } });
    if (!seller) throw new Error(`missing seller ${item.sellerPhone}`);
    const exists = await prisma.listing.findFirst({ where: { title: item.title } });
    if (exists) {
      await prisma.listing.update({
        where: { id: exists.id },
        data: {
          game: item.game,
          cardType: item.cardType,
          condition: item.condition,
          priceHkd: item.priceHkd,
          description: item.description,
          images: JSON.stringify(item.images),
          status: "ACTIVE",
        },
      });
      continue;
    }
    await prisma.listing.create({
      data: {
        title: item.title,
        game: item.game,
        cardType: item.cardType,
        condition: item.condition,
        priceHkd: item.priceHkd,
        description: item.description,
        images: JSON.stringify(item.images),
        sellerId: seller.id,
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
