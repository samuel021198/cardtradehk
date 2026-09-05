import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  const ming = await prisma.user.upsert({
    where: { phone: "85291234567" },
    update: {
      canAuction: true,
      deliveryNote: "旺角朗豪坊／深水埗黃金商場面交，或順豐到付。",
      paymentNote: "PayMe／轉數快，確認到數先交貨。",
    },
    create: {
      phone: "85291234567",
      passwordHash,
      displayName: "阿明",
      whatsapp: "85291234567",
      canAuction: true,
      bio: "深水埗交收為主，專收 Pokémon 同 One Piece。",
      deliveryNote: "旺角朗豪坊／深水埗黃金商場面交，或順豐到付。",
      paymentNote: "PayMe／轉數快，確認到數先交貨。",
    },
  });

  const mei = await prisma.user.upsert({
    where: { phone: "85298765432" },
    update: {},
    create: {
      phone: "85298765432",
      passwordHash,
      displayName: "小美",
      whatsapp: "85298765432",
      bio: "旺角交收，遊戲王為主。",
    },
  });

  await prisma.user.upsert({
    where: { phone: "85290000000" },
    update: { role: "ADMIN", status: "ACTIVE" },
    create: {
      phone: "85290000000",
      passwordHash: await bcrypt.hash("admin123456", 10),
      displayName: "管理員",
      role: "ADMIN",
      status: "ACTIVE",
      bio: "平台管理員。",
    },
  });

  await prisma.listing.updateMany({
    where: { game: "YUGIOH" },
    data: { game: "OTHER", cardType: "RAW", condition: "C" },
  });
  await prisma.listing.updateMany({
    where: { condition: { in: ["MINT", "NEAR_MINT", "LIGHTLY_PLAYED", "PLAYED", "DAMAGED"] } },
    data: { cardType: "RAW", condition: "A" },
  });

  const existing = await prisma.listing.count();
  if (existing === 0) {
    await prisma.listing.createMany({
      data: [
        {
          title: "Charizard ex SAR 151",
          game: "POKEMON",
          cardType: "GRADED",
          condition: "PSA10",
          priceHkd: 1280,
          description: "151 SAR PSA10，旺角／深水埗面交。",
          images: "[]",
          sellerId: ming.id,
        },
        {
          title: "2023 Topps Chrome Rookie",
          game: "SPORTS",
          cardType: "RAW",
          condition: "B",
          priceHkd: 880,
          description: "球員卡 Raw，品質 B。可小議。",
          images: "[]",
          sellerId: mei.id,
        },
        {
          title: "Luffy Gear 5 SEC",
          game: "ONE_PIECE",
          cardType: "RAW",
          condition: "A",
          priceHkd: 650,
          description: "未打過，盒抽直出。",
          images: "[]",
          sellerId: ming.id,
        },
      ],
    });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
