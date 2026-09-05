import path from "path";
import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";

loadEnv({ path: path.join(process.cwd(), ".env"), override: true });
const prisma = new PrismaClient();

async function main() {
  const me = await prisma.user.findFirst({
    where: { OR: [{ username: "try01" }, { displayName: "Yvonne Chan" }] },
  });
  if (!me) throw new Error("找不到 try01 / Yvonne Chan");

  const others = await prisma.user.findMany({
    where: { id: { not: me.id } },
    take: 4,
    orderBy: { createdAt: "asc" },
  });
  const listings = await prisma.listing.findMany({
    where: { OR: [{ sellerId: me.id }, { sellerId: { in: others.map((u) => u.id) } }] },
    take: 8,
  });
  if (others.length < 3 || listings.length < 3) {
    throw new Error("樣本用戶或商品唔夠，請先跑 db:reset-demo");
  }

  const mine = listings.find((l) => l.sellerId === me.id) ?? listings[0];
  const theirs = listings.find((l) => l.sellerId !== me.id) ?? listings[1];

  const samples = [
    {
      other: others[0],
      listing: mine,
      iAmBuyer: false,
      lines: [
        "你好，呢張仲喺度嗎？",
        "想問可唔可以旺角面交？今晚7點得唔得？",
        "如果得嘅話我想即日過數，你方便收PayMe定轉數快？",
      ],
    },
    {
      other: others[1],
      listing: theirs,
      iAmBuyer: true,
      lines: [
        "得，可以面交。",
        "尖沙咀K11地下得閒，你幾時得？",
        "已留貨比你，今晚9點前回覆就得。",
      ],
    },
    {
      other: others[2],
      listing: listings[2],
      iAmBuyer: listings[2].sellerId !== me.id,
      lines: ["出價 HK$280 得唔得？", "可以順豐到付，今晚落單。"],
    },
  ];

  for (const sample of samples) {
    const buyerId = sample.iAmBuyer ? me.id : sample.other.id;
    const sellerId = sample.iAmBuyer ? sample.other.id : me.id;
    const listingId = sample.listing.id;
    const otherId = sample.iAmBuyer ? sellerId : buyerId;

    const conversation = await prisma.conversation.upsert({
      where: { listingId_buyerId: { listingId, buyerId } },
      create: { listingId, buyerId, sellerId, buyerLastReadAt: null, sellerLastReadAt: null },
      update: { buyerLastReadAt: null, sellerLastReadAt: null },
    });

    await prisma.message.deleteMany({ where: { conversationId: conversation.id } });
    for (const [i, body] of sample.lines.entries()) {
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderId: i === sample.lines.length - 1 ? otherId : i === 0 ? me.id : otherId,
          body,
          createdAt: new Date(Date.now() - (sample.lines.length - i) * 90_000),
        },
      });
    }
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        updatedAt: new Date(),
        buyerLastReadAt: sample.iAmBuyer ? new Date(Date.now() - 86_400_000) : new Date(),
        sellerLastReadAt: sample.iAmBuyer ? new Date() : new Date(Date.now() - 86_400_000),
      },
    });
  }

  const existingNotes = await prisma.notification.count({
    where: { userId: me.id, title: { in: ["有人出價", "賣家已發貨"] } },
  });
  if (existingNotes === 0) {
    await prisma.notification.createMany({
      data: [
        {
          userId: me.id,
          type: "OFFER",
          title: "有人出價",
          body: `「${listings[0].title}」收到新出價，快啲去睇下。`,
          href: `/listings/${listings[0].id}`,
          listingId: listings[0].id,
        },
        {
          userId: me.id,
          type: "TRADE",
          title: "賣家已發貨",
          body: "對方確認已交收／寄出，收到貨之後去交易中確認收貨。",
          href: "/trades",
        },
      ],
    });
  }

  console.log(`已為 ${me.displayName} 加 3 組未讀對話 + 2 則通知`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
