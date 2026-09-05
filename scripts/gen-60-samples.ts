import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const IMAGES = [
  "/uploads/demo-01-ember-drake.png",
  "/uploads/demo-02-spark-pup.png",
  "/uploads/demo-03-tide-captain.png",
  "/uploads/demo-04-moonlit-queen.png",
  "/uploads/demo-05-court-ace.png",
  "/uploads/demo-06-pitch-striker.png",
  "/uploads/demo-07-rift-box.png",
  "/uploads/demo-08-wild-spark-box.png",
  "/uploads/demo-09-sea-crew-case.png",
  "/uploads/demo-10-runewarden.png",
];

const CATALOG: Array<{
  title: string;
  game: string;
  cardType: string;
  condition: string;
  priceHkd: number;
  description: string;
}> = [
  { title: "Ember Drake ex SAR", game: "POKEMON", cardType: "GRADED", condition: "PSA10", priceHkd: 1880, description: "火焰龍鑑定示範，旺角面交。" },
  { title: "Spark Pup IR", game: "POKEMON", cardType: "RAW", condition: "A", priceHkd: 220, description: "雷光狐狸 Raw A，盒抽直出。" },
  { title: "Tide Captain SEC", game: "ONE_PIECE", cardType: "RAW", condition: "A", priceHkd: 480, description: "海賊船長近全新。" },
  { title: "Moonlit Queen Enchanted", game: "LORCANA", cardType: "GRADED", condition: "BGS10", priceHkd: 1560, description: "月光女王 BGS10。" },
  { title: "Court Ace Rookie", game: "SPORTS", cardType: "RAW", condition: "B", priceHkd: 360, description: "籃球新秀 Raw B。" },
  { title: "Pitch Striker Chrome", game: "SPORTS", cardType: "GRADED", condition: "PSA9", priceHkd: 920, description: "足球前鋒 PSA9。" },
  { title: "Riftbound Gatebreak Box", game: "RIFTBOUND", cardType: "SEALED", condition: "BOX", priceHkd: 780, description: "未開封原盒，膠膜完整。" },
  { title: "Wild Spark Booster Box", game: "POKEMON", cardType: "SEALED", condition: "BOX", priceHkd: 980, description: "未開封 booster box。" },
  { title: "Sea Crew Case", game: "ONE_PIECE", cardType: "SEALED", condition: "CASE", priceHkd: 4280, description: "未開封原箱。" },
  { title: "Runewarden Alt Art", game: "RIFTBOUND", cardType: "RAW", condition: "A", priceHkd: 310, description: "符文法師 Alt。" },
  { title: "Frost Fox PSA10", game: "POKEMON", cardType: "GRADED", condition: "PSA10", priceHkd: 1420, description: "冰狐 PSA10。" },
  { title: "Shadow Finch Raw B", game: "POKEMON", cardType: "RAW", condition: "B", priceHkd: 150, description: "暗影雀 Raw B，角位微白。" },
  { title: "Coral Navigator SR", game: "ONE_PIECE", cardType: "RAW", condition: "A", priceHkd: 390, description: "珊瑚領航 SR。" },
  { title: "Inkbound Knight", game: "LORCANA", cardType: "RAW", condition: "A", priceHkd: 270, description: "墨水騎士近全新。" },
  { title: "Harbor Ace Auto", game: "SPORTS", cardType: "GRADED", condition: "PSA8_UNDER", priceHkd: 640, description: "簽名球員卡 PSA8 or under。" },
  { title: "Riftbound Sleeves Pack", game: "RIFTBOUND", cardType: "SEALED", condition: "ACCESSORY", priceHkd: 88, description: "官方卡套，未拆。" },
  { title: "Neon Cub PSA9", game: "POKEMON", cardType: "GRADED", condition: "PSA9", priceHkd: 760, description: "霓虹幼獸 PSA9。" },
  { title: "Storm Owl Raw C", game: "POKEMON", cardType: "RAW", condition: "C", priceHkd: 95, description: "風暴貓頭鷹，有使用痕跡。" },
  { title: "Black Flag Admiral", game: "ONE_PIECE", cardType: "GRADED", condition: "PSA10", priceHkd: 2680, description: "黑旗提督 PSA10。" },
  { title: "Lumina Starter Box", game: "LORCANA", cardType: "SEALED", condition: "BOX", priceHkd: 420, description: "Lorcana 原盒未開。" },
  { title: "Baseline Guard Prizm", game: "SPORTS", cardType: "RAW", condition: "A", priceHkd: 510, description: "籃球後衛 Prizm。" },
  { title: "Rift Scout RAW A", game: "RIFTBOUND", cardType: "RAW", condition: "B", priceHkd: 180, description: "裂隙斥候。" },
  { title: "Amber Mare Others Grade", game: "POKEMON", cardType: "GRADED", condition: "OTHERS", priceHkd: 540, description: "其他鑑定公司。" },
  { title: "Wave Dancer SEC", game: "ONE_PIECE", cardType: "RAW", condition: "A", priceHkd: 720, description: "浪舞者 SEC。" },
  { title: "Starlit Fox Enchanted", game: "LORCANA", cardType: "RAW", condition: "A", priceHkd: 880, description: "星光狐 Enchanted。" },
  { title: "Midfield Engine PSA10", game: "SPORTS", cardType: "GRADED", condition: "PSA10", priceHkd: 2100, description: "中場引擎 PSA10。" },
  { title: "Riftbound Display Case", game: "RIFTBOUND", cardType: "SEALED", condition: "CASE", priceHkd: 3180, description: "原箱未拆。" },
  { title: "Jade Serpent BGS10 BL", game: "POKEMON", cardType: "GRADED", condition: "BGS10_BLACK", priceHkd: 5200, description: "玉蛇 BGS10 Black Label。" },
  { title: "Pebble Crab Raw D", game: "POKEMON", cardType: "RAW", condition: "D", priceHkd: 40, description: "收藏用，邊位明顯。" },
  { title: "Iron Chef Luffy Style", game: "ONE_PIECE", cardType: "RAW", condition: "B", priceHkd: 260, description: "廚師主題卡。" },
  { title: "Glass Castle Queen", game: "LORCANA", cardType: "GRADED", condition: "PSA9", priceHkd: 990, description: "玻璃城堡女王 PSA9。" },
  { title: "Home Run Rookie", game: "SPORTS", cardType: "RAW", condition: "A", priceHkd: 430, description: "棒球新秀。" },
  { title: "Rune Blade Promo", game: "RIFTBOUND", cardType: "RAW", condition: "A", priceHkd: 350, description: "活動贈卡。" },
  { title: "Sunbloom ETB", game: "POKEMON", cardType: "SEALED", condition: "BOX", priceHkd: 680, description: "ETB 未開封。" },
  { title: "Dockside Sniper", game: "ONE_PIECE", cardType: "GRADED", condition: "BGS10", priceHkd: 1340, description: "碼頭狙擊手 BGS10。" },
  { title: "Ink Fairy Raw A", game: "LORCANA", cardType: "RAW", condition: "A", priceHkd: 190, description: "墨水仙子。" },
  { title: "Goalie Wall Chrome", game: "SPORTS", cardType: "RAW", condition: "B", priceHkd: 240, description: "守門員 Chrome。" },
  { title: "Gatebreak Playmat", game: "RIFTBOUND", cardType: "SEALED", condition: "ACCESSORY", priceHkd: 160, description: "膠墊未拆袋。" },
  { title: "Volt Moth PSA8 under", game: "POKEMON", cardType: "GRADED", condition: "PSA8_UNDER", priceHkd: 280, description: "電壓蛾 PSA8 or under。" },
  { title: "Silent Monk Raw E", game: "OTHER", cardType: "RAW", condition: "E", priceHkd: 30, description: "其他卡種，品相差。" },
  { title: "Gold Route Merchant", game: "ONE_PIECE", cardType: "RAW", condition: "A", priceHkd: 410, description: "黃金航線商人。" },
  { title: "Dusk Library Box", game: "LORCANA", cardType: "SEALED", condition: "BOX", priceHkd: 560, description: "黃昏書庫原盒。" },
  { title: "Slam Dunk Insert", game: "SPORTS", cardType: "GRADED", condition: "PSA10", priceHkd: 1750, description: "灌籃特卡 PSA10。" },
  { title: "Ashen Warden", game: "RIFTBOUND", cardType: "GRADED", condition: "PSA9", priceHkd: 870, description: "灰燼守衛 PSA9。" },
  { title: "Mint Leaf ex", game: "POKEMON", cardType: "RAW", condition: "A", priceHkd: 330, description: "薄荷葉 ex。" },
  { title: "Twin Anchor Bros", game: "ONE_PIECE", cardType: "RAW", condition: "C", priceHkd: 120, description: "雙錨兄弟，有摺痕。" },
  { title: "Crownless Prince", game: "LORCANA", cardType: "GRADED", condition: "OTHERS", priceHkd: 610, description: "無冠王子，其他鑑定。" },
  { title: "Track Sprinter /99", game: "SPORTS", cardType: "RAW", condition: "A", priceHkd: 780, description: "限編 /99。" },
  { title: "Echo Mage", game: "RIFTBOUND", cardType: "RAW", condition: "A", priceHkd: 290, description: "回聲法師。" },
  { title: "Crystal Herd Case", game: "POKEMON", cardType: "SEALED", condition: "CASE", priceHkd: 3880, description: "水晶獸群原箱。" },
  { title: "Night Market Dealer", game: "ONE_PIECE", cardType: "GRADED", condition: "PSA9", priceHkd: 830, description: "夜市商人 PSA9。" },
  { title: "River Song Rare", game: "LORCANA", cardType: "RAW", condition: "B", priceHkd: 140, description: "河之歌 Rare。" },
  { title: "Club Captain Patch", game: "SPORTS", cardType: "GRADED", condition: "BGS10", priceHkd: 2460, description: "隊長 Patch BGS10。" },
  { title: "Rift Dice Set", game: "RIFTBOUND", cardType: "SEALED", condition: "ACCESSORY", priceHkd: 75, description: "官方骰子未開。" },
  { title: "Cloud Hare IR", game: "POKEMON", cardType: "RAW", condition: "A", priceHkd: 260, description: "雲兔 IR。" },
  { title: "Cabin Boy Comic", game: "ONE_PIECE", cardType: "RAW", condition: "A", priceHkd: 199, description: "船艙小子漫畫風。" },
  { title: "Mirror Lake Giant", game: "LORCANA", cardType: "GRADED", condition: "PSA10", priceHkd: 1980, description: "鏡湖巨人 PSA10。" },
  { title: "Relay Runner Auto", game: "SPORTS", cardType: "RAW", condition: "B", priceHkd: 450, description: "接力跑手簽名。" },
  { title: "Void Archer", game: "RIFTBOUND", cardType: "RAW", condition: "A", priceHkd: 340, description: "虛空弓手。" },
  { title: "Old School Binder Lot", game: "OTHER", cardType: "RAW", condition: "C", priceHkd: 380, description: "雜卡一批，約 80 張。" },
];

const SELLERS = [
  { phone: "85291234567", name: "阿明", bio: "深水埗交收為主。" },
  { phone: "85298765432", name: "小美", bio: "旺角交收。" },
  { phone: "85291112222", name: "阿強", bio: "觀塘交收，專賣未開封。" },
  { phone: "85293334444", name: "小玲", bio: "荃灣面交，鑑定卡為主。" },
  { phone: "85295556666", name: "阿輝", bio: "球員卡同 Riftbound。" },
];

function statusFor(i: number): "ACTIVE" | "RESERVED" | "SOLD" | "HIDDEN" {
  if (i < 36) return "ACTIVE";
  if (i < 44) return "RESERVED";
  if (i < 54) return "SOLD";
  return "HIDDEN";
}

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);
  const users = [];
  for (const s of SELLERS) {
    const user = await prisma.user.upsert({
      where: { phone: s.phone },
      update: { displayName: s.name },
      create: {
        phone: s.phone,
        passwordHash,
        displayName: s.name,
        whatsapp: s.phone,
        bio: s.bio,
        canAuction: s.phone === "85291234567",
      },
    });
    users.push(user);
  }

  const existing = await prisma.listing.count({ where: { title: { startsWith: "Sample " } } });
  if (existing >= 60) {
    console.log(`already have ${existing} sample listings`);
    return;
  }

  let created = 0;
  let trades = 0;
  let offers = 0;

  for (let i = 0; i < 60; i++) {
    const item = CATALOG[i];
    const seller = users[i % users.length];
    const buyer = users[(i + 1) % users.length];
    const status = statusFor(i);
    const title = `Sample ${String(i + 1).padStart(2, "0")} ${item.title}`;
    const images = JSON.stringify([IMAGES[i % IMAGES.length]]);

    const found = await prisma.listing.findFirst({ where: { title } });
    const listing =
      found ??
      (await prisma.listing.create({
        data: {
          title,
          game: item.game,
          cardType: item.cardType,
          condition: item.condition,
          priceHkd: item.priceHkd,
          description: `${item.description}（示範樣本 #${i + 1}）`,
          images,
          status,
          sellerId: seller.id,
        },
      }));
    if (!found) created += 1;

    if (status === "ACTIVE" && i % 5 === 0) {
      await prisma.offer.upsert({
        where: { listingId_buyerId: { listingId: listing.id, buyerId: buyer.id } },
        update: {},
        create: {
          listingId: listing.id,
          buyerId: buyer.id,
          sellerId: seller.id,
          amountHkd: Math.max(1, item.priceHkd - 40),
          note: "示範出價，可面交。",
          status: "PENDING",
          proposedById: buyer.id,
        },
      });
      offers += 1;
    }

    if (status === "RESERVED" || status === "SOLD") {
      const amount = Math.max(1, item.priceHkd - 20);
      const offer = await prisma.offer.upsert({
        where: { listingId_buyerId: { listingId: listing.id, buyerId: buyer.id } },
        update: { amountHkd: amount, status: "ACCEPTED", proposedById: seller.id },
        create: {
          listingId: listing.id,
          buyerId: buyer.id,
          sellerId: seller.id,
          amountHkd: amount,
          status: "ACCEPTED",
          proposedById: seller.id,
        },
      });
      const convo = await prisma.conversation.upsert({
        where: { listingId_buyerId: { listingId: listing.id, buyerId: buyer.id } },
        update: {},
        create: { listingId: listing.id, buyerId: buyer.id, sellerId: seller.id },
      });
      const existingTrade = await prisma.trade.findFirst({ where: { listingId: listing.id } });
      if (!existingTrade) {
        const shipped = status === "SOLD" ? new Date() : i % 2 === 0 ? new Date() : null;
        await prisma.trade.create({
          data: {
            listingId: listing.id,
            buyerId: buyer.id,
            sellerId: seller.id,
            offerId: offer.id,
            conversationId: convo.id,
            amountHkd: amount,
            source: "OFFER",
            status: status === "SOLD" ? "COMPLETED" : "RESERVED",
            sellerShippedAt: shipped,
            buyerReceivedAt: status === "SOLD" ? new Date() : null,
            completedAt: status === "SOLD" ? new Date() : null,
          },
        });
        trades += 1;
      }
    }
  }

  const total = await prisma.listing.count({ where: { title: { startsWith: "Sample " } } });
  console.log(JSON.stringify({ created, sampleListings: total, newTrades: trades, newOffers: offers }));
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
