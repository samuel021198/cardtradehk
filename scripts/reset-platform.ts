import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import path from "path";
import { config as loadEnv } from "dotenv";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { cloudinaryReady, savePublicImage } from "../src/lib/storage";

const ROOT = process.cwd();
loadEnv({ path: path.join(ROOT, ".env"), override: true });
const prisma = new PrismaClient();
const UPLOAD = path.join(ROOT, "public", "uploads");
const AVATAR_SRC = path.join(
  process.env.USERPROFILE || "",
  ".cursor",
  "projects",
  "c-Users-yiklu-OneDrive-CardTradeHK",
  "assets",
);
const PASSWORD = "123456";

type CatalogItem = {
  title: string;
  game: string;
  cardType: string;
  condition: string;
  priceHkd: number;
  description: string;
  imageUrl?: string;
};

const PEOPLE = [
  {
    username: "Admin01",
    phone: "85290000001",
    displayName: "Ken Lo",
    role: "ADMIN",
    tier: "MASTER_MERCHANT",
    canAuction: true,
    bio: "平台管理員。日常都係旺角交收，收齊 Pokémon 鑑定卡同店舖投訴。",
    deliveryNote: "旺角朗豪坊客服台面交（預約）。",
    paymentNote: "只收轉數快／PayMe，確認到數先出貨。",
  },
  {
    username: "try01",
    phone: "85291000001",
    displayName: "Yvonne Chan",
    role: "USER",
    tier: "MASTER_MERCHANT",
    canAuction: true,
    bio: "❤️ 專營 Pokémon 日版鑑定\n🃏 旺角／尖沙咀面交\n📦 順豐到付都得",
    deliveryNote: "尖沙咀 K11／旺角朗豪坊，平日 7 點後。",
    paymentNote: "轉數快、PayMe、AlipayHK。",
  },
  {
    username: "try02",
    phone: "85291000002",
    displayName: "Marcus Ng",
    role: "USER",
    tier: "PRO_MERCHANT",
    canAuction: true,
    bio: "深水埗黃金商場長駐。One Piece 同未開盒為主，可小議。",
    deliveryNote: "深水埗黃金商場 1 樓通道面交。",
    paymentNote: "PayMe 優先，大額要轉數快。",
  },
  {
    username: "try03",
    phone: "85291000003",
    displayName: "Kelly Ip",
    role: "USER",
    tier: "PREMIUM",
    canAuction: true,
    bio: "Lorcana + Disney 周邊。觀塘工廈交收，歡迎預約睇貨。",
    deliveryNote: "觀塘成業街工廈，需提前 1 日約。",
    paymentNote: "轉數快，確認後當日交。",
  },
  {
    username: "try04",
    phone: "85291000004",
    displayName: "Jason Ho",
    role: "USER",
    tier: "SUPER",
    canAuction: true,
    bio: "🏀 球員卡 Prizm／Chrome\n只收品相清楚嘅卡，假卡即報警。",
    deliveryNote: "九龍灣 MegaBox 星巴克面交。",
    paymentNote: "PayMe／FPS。",
  },
  {
    username: "try05",
    phone: "85291000005",
    displayName: "Chloe Tam",
    role: "USER",
    tier: "NORMAL",
    canAuction: false,
    bio: "學生黨，主要買 Raw 玩牌。沙田城門河附近交收。",
    deliveryNote: "沙田新城市廣場 3 期。",
    paymentNote: "PayMe。",
  },
  {
    username: "try06",
    phone: "85291000006",
    displayName: "Adrian Lam",
    role: "USER",
    tier: "NORMAL",
    canAuction: true,
    bio: "中環返工，lunch 時間可以中環街市交收。收藏 PSA。",
    deliveryNote: "中環街市地下，工作日 12:30–14:00。",
    paymentNote: "轉數快。",
  },
  {
    username: "try07",
    phone: "85291000007",
    displayName: "Natalie Yuen",
    role: "USER",
    tier: "PREMIUM",
    canAuction: true,
    bio: "Riftbound 同新遊戲開箱。歡迎交換，唔好問低過市價太多。",
    deliveryNote: "銅鑼灣時代廣場地面。",
    paymentNote: "PayMe / 現金（面交）。",
  },
  {
    username: "try08",
    phone: "85291000008",
    displayName: "Ryan Cheung",
    role: "USER",
    tier: "NORMAL",
    canAuction: true,
    bio: "夜貓，深夜先覆。專收 One Piece SEC／SP。",
    deliveryNote: "旺角先達廣場，晚上 10 點後都得。",
    paymentNote: "轉數快，要 screenshot。",
  },
  {
    username: "try09",
    phone: "85291000009",
    displayName: "Irene Mak",
    role: "USER",
    tier: "SUPER",
    canAuction: true,
    bio: "書店兼賣卡。喜歡講故事嘅 Enchanted／Alt Art。",
    deliveryNote: "上環樓梯街附近，訊息約。",
    paymentNote: "FPS／PayMe。",
  },
  {
    username: "try10",
    phone: "85291000010",
    displayName: "Derek Poon",
    role: "USER",
    tier: "PRO_MERCHANT",
    canAuction: true,
    bio: "旺角夜市出身，Pokémon 盒貨同 case 都有。批量可再平。",
    deliveryNote: "旺角彌敦道／登打士街交界。",
    paymentNote: "大額轉數快，細額 PayMe。",
  },
] as const;

const EXTRA: CatalogItem[] = [
  { title: "Monkey D. Luffy OP05-119 SEC (JP)", game: "ONE_PIECE", cardType: "RAW", condition: "A", priceHkd: 180, description: "日版 Gear 5 SEC Raw A，盒抽直出。旺角面交。", imageUrl: "https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/one-piece/OP05/OP05-119_EN.webp" },
  { title: "Monkey D. Luffy OP05-119 Alt Art", game: "ONE_PIECE", cardType: "RAW", condition: "A", priceHkd: 1980, description: "英文 Alt Art，角位靚。可小議。", imageUrl: "https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/one-piece/OP05/OP05-119_EN.webp" },
  { title: "Monkey D. Luffy OP05-119 PSA10", game: "ONE_PIECE", cardType: "GRADED", condition: "PSA10", priceHkd: 880, description: "日版 PSA10，連殼交。", imageUrl: "https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/one-piece/OP05/OP05-119_EN.webp" },
  { title: "Trafalgar Law OP01-002 Super Rare", game: "ONE_PIECE", cardType: "RAW", condition: "A", priceHkd: 220, description: "Romance Dawn Law SR。", imageUrl: "https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/one-piece/OP01/OP01-002_EN.webp" },
  { title: "Roronoa Zoro OP01-025 Alt", game: "ONE_PIECE", cardType: "RAW", condition: "B", priceHkd: 340, description: "Zoro Alt，右邊微白。", imageUrl: "https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/one-piece/OP01/OP01-025_EN.webp" },
  { title: "Nami OP01-016", game: "ONE_PIECE", cardType: "RAW", condition: "A", priceHkd: 95, description: "Nami 領導卡，近全新。", imageUrl: "https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/one-piece/OP01/OP01-016_EN.webp" },
  { title: "Shanks OP01-120 SEC", game: "ONE_PIECE", cardType: "GRADED", condition: "PSA9", priceHkd: 1680, description: "紅髮 SEC PSA9。", imageUrl: "https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/one-piece/OP01/OP01-120_EN.webp" },
  { title: "Yamato OP01-121", game: "ONE_PIECE", cardType: "RAW", condition: "A", priceHkd: 160, description: "Yamato SEC Raw。", imageUrl: "https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/one-piece/OP01/OP01-121_EN.webp" },
  { title: "Portgas D. Ace OP02-013", game: "ONE_PIECE", cardType: "RAW", condition: "A", priceHkd: 280, description: "Ace leader，膠膜未撕過。", imageUrl: "https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/one-piece/OP02/OP02-013_EN.webp" },
  { title: "Boa Hancock OP07-051", game: "ONE_PIECE", cardType: "RAW", condition: "A", priceHkd: 190, description: "Hancock SR。", imageUrl: "https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/one-piece/OP07/OP07-051_EN.webp" },
  { title: "One Piece OP-05 Booster Box (JP)", game: "ONE_PIECE", cardType: "SEALED", condition: "BOX", priceHkd: 1280, description: "日版新時代的主角 原盒未拆，膠膜完整。" },
  { title: "One Piece OP-09 Booster Box (EN)", game: "ONE_PIECE", cardType: "SEALED", condition: "BOX", priceHkd: 980, description: "英文 Emperors in the New World 原盒。" },
  { title: "One Piece Premium Card Collection", game: "ONE_PIECE", cardType: "SEALED", condition: "ACCESSORY", priceHkd: 420, description: "官方收藏冊未開封。" },
  { title: "Elsa - Snow Queen Enchanted", game: "LORCANA", cardType: "RAW", condition: "A", priceHkd: 2200, description: "The First Chapter Enchanted Elsa，角位尖。" },
  { title: "Stitch - Rock Star Enchanted", game: "LORCANA", cardType: "RAW", condition: "A", priceHkd: 1680, description: "Stitch Enchanted，室內燈下無白邊。" },
  { title: "Mickey Mouse - Brave Little Tailor", game: "LORCANA", cardType: "GRADED", condition: "PSA10", priceHkd: 980, description: "TFC Mickey PSA10。" },
  { title: "Maleficent - Monstrous Dragon", game: "LORCANA", cardType: "RAW", condition: "B", priceHkd: 260, description: "龍型 Maleficent，輕微套痕。" },
  { title: "Lorcana The First Chapter Booster Box", game: "LORCANA", cardType: "SEALED", condition: "BOX", priceHkd: 1580, description: "TFC 英文原盒，未開封。" },
  { title: "Lorcana Ursula's Return Illumineer's Trove", game: "LORCANA", cardType: "SEALED", condition: "BOX", priceHkd: 520, description: "Ursula's Return Trove。" },
  { title: "2023-24 Prizm Victor Wembanyama RC", game: "SPORTS", cardType: "RAW", condition: "A", priceHkd: 880, description: "Wemby base RC，角位 A。" },
  { title: "2023-24 Prizm Wembanyama Silver PSA10", game: "SPORTS", cardType: "GRADED", condition: "PSA10", priceHkd: 4200, description: "Silver Prizm PSA10。" },
  { title: "2023 Topps Chrome Haaland Gold /50", game: "SPORTS", cardType: "RAW", condition: "A", priceHkd: 2600, description: "Haaland Gold Refractor /50。" },
  { title: "2020 Prizm Justin Herbert RC", game: "SPORTS", cardType: "GRADED", condition: "PSA9", priceHkd: 720, description: "Herbert RC PSA9。" },
  { title: "2023 Topps Chrome Shohei Ohtani", game: "SPORTS", cardType: "RAW", condition: "A", priceHkd: 380, description: "Ohtani Chrome base。" },
  { title: "2024 Prizm Leroy Sane / Lamine Yamal RC", game: "SPORTS", cardType: "RAW", condition: "B", priceHkd: 540, description: "Yamal RC，頂邊微白。" },
  { title: "Riftbound Origins Booster Box", game: "RIFTBOUND", cardType: "SEALED", condition: "BOX", priceHkd: 780, description: "Riftbound Origins 原盒未拆。" },
  { title: "Riftbound Origins Case (12 boxes)", game: "RIFTBOUND", cardType: "SEALED", condition: "CASE", priceHkd: 8680, description: "原箱 12 盒，膠膜齊。" },
  { title: "Riftbound Official Sleeves", game: "RIFTBOUND", cardType: "SEALED", condition: "ACCESSORY", priceHkd: 88, description: "官方卡套未拆袋。" },
  { title: "Riftbound Promo Runewarden", game: "RIFTBOUND", cardType: "RAW", condition: "A", priceHkd: 320, description: "活動 Promo，未套過。" },
  { title: "Sanji OP07-064 Super Rare", game: "ONE_PIECE", cardType: "RAW", condition: "A", priceHkd: 140, description: "Sanji SR，近全新。" },
  { title: "Nico Robin OP05-051", game: "ONE_PIECE", cardType: "RAW", condition: "A", priceHkd: 110, description: "Robin SR。" },
  { title: "Crocodile OP08-062", game: "ONE_PIECE", cardType: "RAW", condition: "B", priceHkd: 85, description: "Crocodile，角位微白。" },
  { title: "Lorcana Elsa Spirit of Winter", game: "LORCANA", cardType: "RAW", condition: "A", priceHkd: 360, description: "Elsa Super Rare。" },
  { title: "Lorcana Rapunzel Gifted with Healing", game: "LORCANA", cardType: "GRADED", condition: "PSA10", priceHkd: 2400, description: "Rapunzel TFC PSA10。" },
  { title: "2023-24 Select Victor Wembanyama Shimmer", game: "SPORTS", cardType: "RAW", condition: "A", priceHkd: 1560, description: "Wemby Select Shimmer。" },
  { title: "2022 Topps Chrome Jude Bellingham", game: "SPORTS", cardType: "GRADED", condition: "PSA10", priceHkd: 980, description: "Bellingham Chrome PSA10。" },
  { title: "Pokemon 151 Master Ball Booster Box (JP)", game: "POKEMON", cardType: "SEALED", condition: "BOX", priceHkd: 1680, description: "日版 151 原盒，市場常見 eBay／Yahoo 拍賣貨。" },
  { title: "Pokemon Surging Sparks ETB", game: "POKEMON", cardType: "SEALED", condition: "BOX", priceHkd: 620, description: "Surging Sparks Elite Trainer Box 未拆。" },
  { title: "Riftbound Playmat Origins", game: "RIFTBOUND", cardType: "SEALED", condition: "ACCESSORY", priceHkd: 180, description: "官方膠墊未拆袋。" },
];

function usdToHkd(usd: number) {
  return Math.max(30, Math.round(usd * 7.8));
}

function pick<T>(arr: T[], i: number) {
  return arr[i % arr.length];
}

function districts(i: number) {
  return ["旺角面交", "尖沙咀面交", "深水埗黃金商場", "觀塘工廈約睇", "沙田新城", "中環街市 lunch"][i % 6];
}

async function download(url: string, dest: string) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 8000);
  try {
    const res = await fetch(url, { headers: { "User-Agent": "CardTradeHK-seed/1.0" }, signal: ac.signal });
    if (!res.ok) throw new Error(`download ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 800) throw new Error("too small");
    writeFileSync(dest, buf);
  } finally {
    clearTimeout(t);
  }
}

function copyAvatars() {
  mkdirSync(path.join(UPLOAD, "avatars"), { recursive: true });
  mkdirSync(path.join(UPLOAD, "cards"), { recursive: true });
  const names = ["admin01", ...Array.from({ length: 10 }, (_, i) => `try${String(i + 1).padStart(2, "0")}`)];
  for (const name of names) {
    const src = path.join(AVATAR_SRC, `avatar-${name}.png`);
    const dest = path.join(UPLOAD, "avatars", `${name}.png`);
    if (existsSync(src)) copyFileSync(src, dest);
  }
}

async function fetchJson(url: string) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 8000);
  try {
    const res = await fetch(url, { headers: { "User-Agent": "CardTradeHK-seed/1.0" }, signal: ac.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

async function fetchPokemon(): Promise<CatalogItem[]> {
  const urls = [
    "https://api.pokemontcg.io/v2/cards?q=name:charizard&pageSize=20",
    "https://api.pokemontcg.io/v2/cards?q=name:pikachu&pageSize=20",
    "https://api.pokemontcg.io/v2/cards?q=name:umbreon&pageSize=15",
    "https://api.tcgdex.net/v2/en/cards?pagination:page=1&pagination:itemsPerPage=40",
  ];
  const seen = new Set<string>();
  const out: CatalogItem[] = [];
  for (const url of urls) {
    console.log("fetch", url);
    const json = (await fetchJson(url)) as {
      data?: Array<{
        id: string;
        name: string;
        number?: string;
        localId?: string;
        rarity?: string;
        set?: { name: string };
        images?: { large?: string; small?: string } | string;
        tcgplayer?: { prices?: Record<string, { market?: number; mid?: number }> };
      }>;
    } | null;
    if (!json) continue;
    const rows = (json.data ?? (Array.isArray(json) ? json : [])) as Array<{
      id: string;
      name: string;
      number?: string;
      localId?: string;
      rarity?: string;
      set?: { name: string };
      images?: { large?: string; small?: string } | string;
      tcgplayer?: { prices?: Record<string, { market?: number; mid?: number }> };
    }>;
    for (const card of rows) {
      if (!card?.id || seen.has(card.id)) continue;
      seen.add(card.id);
      const prices = Object.values(card.tcgplayer?.prices ?? {});
      const usd = prices.find((p) => p.market)?.market ?? prices[0]?.mid ?? 8;
      const graded = usd >= 80 && Math.random() > 0.55;
      const image =
        typeof card.images === "string"
          ? card.images
          : card.images?.large ?? card.images?.small;
      out.push({
        title: `${card.name} ${card.set?.name ?? ""} #${card.number ?? card.localId ?? ""}`.trim(),
        game: "POKEMON",
        cardType: graded ? "GRADED" : "RAW",
        condition: graded ? (usd > 200 ? "PSA10" : "PSA9") : usd > 40 ? "A" : "B",
        priceHkd: usdToHkd(usd * (graded ? 2.4 : 1)),
        description: `${card.rarity ?? "Holofoil"} · ${card.set?.name ?? "Pokémon"}。${districts(out.length)}，可議。`,
        imageUrl: image,
      });
    }
  }
  return out;
}

async function materializeImages(items: CatalogItem[]) {
  const ready: Array<CatalogItem & { local: string[] }> = [];
  for (const item of items) {
    const images: string[] = [];
    if (item.imageUrl?.startsWith("http")) images.push(item.imageUrl);
    ready.push({ ...item, local: images });
  }
  return ready;
}

async function main() {
  console.log("Copy avatars…");
  copyAvatars();

  console.log("Fetch live card catalog…");
  const pokemon = await fetchPokemon();
  const catalog = [...pokemon, ...EXTRA];
  while (catalog.length < 80) {
    const base = EXTRA[catalog.length % EXTRA.length];
    catalog.push({ ...base, title: `${base.title} · lot ${catalog.length + 1}` });
  }
  const items = await materializeImages(catalog.slice(0, 90));
  console.log(`Catalog ${items.length} products, with images ${items.filter((x) => x.local.length).length}`);

  console.log("Wipe existing users (cascade listings/trades)…");
  await prisma.user.deleteMany();

  const hash = await bcrypt.hash(PASSWORD, 10);
  const users = [];
  for (const p of PEOPLE) {
    const localAvatar = path.join(UPLOAD, "avatars", `${p.username.toLowerCase()}.png`);
    let avatarUrl: string | null = existsSync(localAvatar) ? `/uploads/avatars/${p.username.toLowerCase()}.png` : null;
    if (avatarUrl && cloudinaryReady()) {
      avatarUrl = await savePublicImage({ buffer: readFileSync(localAvatar), mime: "image/png", folder: "avatars" });
    }
    const user = await prisma.user.create({
      data: {
        username: p.username,
        phone: p.phone,
        passwordHash: hash,
        displayName: p.displayName,
        avatarUrl,
        whatsapp: p.phone,
        bio: p.bio,
        role: p.role,
        canAuction: p.canAuction,
        membershipTier: p.tier,
        deliveryNote: p.deliveryNote,
        paymentNote: p.paymentNote,
      },
    });
    users.push(user);
  }
  const testers = users.filter((u) => u.username !== "Admin01");
  const admin = users.find((u) => u.username === "Admin01")!;

  const createdListings = [];
  const createdAuctions = [];
  for (const [index, item] of items.entries()) {
    const seller = pick(testers, index + item.title.length);
    const asAuction = index % 5 === 0 && seller.canAuction;
    if (asAuction) {
      const hours = [24, 72, 120, 168][index % 4];
      const startsAt = new Date(Date.now() - (index % 3) * 3600_000);
      const auction = await prisma.auction.create({
        data: {
          title: item.title,
          game: item.game,
          cardType: item.cardType,
          condition: item.condition,
          description: item.description,
          images: JSON.stringify(item.local),
          startingBidHkd: Math.max(20, Math.round(item.priceHkd * 0.55)),
          minIncrementHkd: item.priceHkd > 800 ? 50 : 10,
          startsAt,
          endsAt: new Date(startsAt.getTime() + hours * 3600_000),
          sellerId: seller.id,
          pinnedAt: index % 37 === 0 ? new Date() : null,
        },
      });
      createdAuctions.push(auction);
    } else {
      const status = index % 17 === 0 ? "SOLD" : index % 13 === 0 ? "RESERVED" : "ACTIVE";
      const listing = await prisma.listing.create({
        data: {
          title: item.title,
          game: item.game,
          cardType: item.cardType,
          condition: item.condition,
          description: item.description,
          images: JSON.stringify(item.local),
          priceHkd: item.priceHkd,
          sellerId: seller.id,
          status,
          pinnedAt: index % 29 === 0 ? new Date() : null,
        },
      });
      createdListings.push(listing);
    }
  }

  const active = createdListings.filter((l) => l.status === "ACTIVE");
  const reserved = createdListings.filter((l) => l.status === "RESERVED");
  const sold = createdListings.filter((l) => l.status === "SOLD");

  async function otherBuyer(sellerId: string, salt: number) {
    return testers.filter((u) => u.id !== sellerId)[salt % (testers.length - 1)];
  }

  console.log("Social graph + offers/trades/reviews…");
  for (const [i, listing] of active.slice(0, 18).entries()) {
    const buyer = await otherBuyer(listing.sellerId, i);
    await prisma.favorite.create({ data: { userId: buyer.id, listingId: listing.id } }).catch(() => null);
  }
  for (const [i, auction] of createdAuctions.slice(0, 10).entries()) {
    const fan = await otherBuyer(auction.sellerId, i + 3);
    await prisma.favorite.create({ data: { userId: fan.id, auctionId: auction.id } }).catch(() => null);
  }
  for (const [i, shop] of testers.entries()) {
    const follower = testers[(i + 2) % testers.length];
    if (follower.id !== shop.id) {
      await prisma.shopFollow.create({ data: { userId: follower.id, shopId: shop.id } }).catch(() => null);
    }
    const follower2 = testers[(i + 5) % testers.length];
    if (follower2.id !== shop.id) {
      await prisma.shopFollow.create({ data: { userId: follower2.id, shopId: shop.id } }).catch(() => null);
    }
  }

  for (const [i, listing] of active.slice(18, 28).entries()) {
    const buyer = await otherBuyer(listing.sellerId, i + 7);
    const amount = Math.max(20, listing.priceHkd - 20 - (i % 5) * 10);
    await prisma.offer.create({
      data: {
        listingId: listing.id,
        buyerId: buyer.id,
        sellerId: listing.sellerId,
        amountHkd: amount,
        note: i % 2 === 0 ? "今日尖沙咀得閒，可面交。" : "可即轉數快。",
        status: "PENDING",
        proposedById: buyer.id,
      },
    });
  }

  for (const [i, listing] of reserved.entries()) {
    const buyer = await otherBuyer(listing.sellerId, i + 11);
    const convo = await prisma.conversation.create({
      data: { listingId: listing.id, buyerId: buyer.id, sellerId: listing.sellerId },
    });
    await prisma.message.create({
      data: {
        conversationId: convo.id,
        senderId: listing.sellerId,
        body: `「${listing.title}」已保留，成交 HK$${listing.priceHkd}。請去交易中確認交收。`,
      },
    });
    await prisma.trade.create({
      data: {
        listingId: listing.id,
        buyerId: buyer.id,
        sellerId: listing.sellerId,
        conversationId: convo.id,
        amountHkd: listing.priceHkd,
        source: i % 2 === 0 ? "OFFER" : "MANUAL",
        status: "RESERVED",
        sellerShippedAt: i % 3 === 0 ? new Date() : null,
      },
    });
    if (i % 2 === 0) {
      await prisma.offer.create({
        data: {
          listingId: listing.id,
          buyerId: buyer.id,
          sellerId: listing.sellerId,
          amountHkd: listing.priceHkd,
          status: "ACCEPTED",
          proposedById: buyer.id,
        },
      });
    }
  }

  for (const [i, listing] of sold.entries()) {
    const buyer = await otherBuyer(listing.sellerId, i + 19);
    const convo = await prisma.conversation.create({
      data: { listingId: listing.id, buyerId: buyer.id, sellerId: listing.sellerId },
    });
    const daysAgo = 4 + (i % 10);
    const doneAt = new Date(Date.now() - daysAgo * 86400_000);
    await prisma.message.createMany({
      data: [
        { conversationId: convo.id, senderId: buyer.id, body: `收貨，卡係真。謝謝！` },
        { conversationId: convo.id, senderId: listing.sellerId, body: `多謝支持，歡迎再嚟。` },
      ],
    });
    const deal = await prisma.deal.create({
      data: {
        conversationId: convo.id,
        listingId: listing.id,
        confirmedByBuyer: true,
        confirmedBySeller: true,
        completedAt: doneAt,
      },
    });
    const createdTrade = await prisma.trade.create({
      data: {
        listingId: listing.id,
        buyerId: buyer.id,
        sellerId: listing.sellerId,
        conversationId: convo.id,
        amountHkd: listing.priceHkd,
        source: "OFFER",
        status: "COMPLETED",
        sellerShippedAt: doneAt,
        buyerReceivedAt: doneAt,
        completedAt: doneAt,
      },
    });
    const comments = [
      "面交爽快，卡同相一樣，下次再買。",
      "轉數快確認快，包裝有卡套同 top loader。",
      "約時間準時，態度好。",
      "有少少等，不過貨真價實。",
      "推薦呢間店，鑑定卡資料齊。",
    ];
    await prisma.review.create({
      data: {
        dealId: deal.id,
        tradeId: createdTrade.id,
        fromUserId: buyer.id,
        toUserId: listing.sellerId,
        rating: 4 + (i % 2),
        comment: comments[i % comments.length],
      },
    });
    if (i % 2 === 0) {
      await prisma.review.create({
        data: {
          dealId: deal.id,
          tradeId: createdTrade.id,
          fromUserId: listing.sellerId,
          toUserId: buyer.id,
          rating: 5,
          comment: "買家準時到，付款乾脆。",
        },
      });
    }
  }

  const liveAuctions = createdAuctions.filter((a) => a.endsAt.getTime() > Date.now());
  for (const [i, auction] of liveAuctions.slice(0, 12).entries()) {
    const bidders = testers.filter((u) => u.id !== auction.sellerId);
    const first = bidders[i % bidders.length];
    const second = bidders[(i + 3) % bidders.length];
    await prisma.bid.create({
      data: { auctionId: auction.id, bidderId: first.id, amountHkd: auction.startingBidHkd + auction.minIncrementHkd },
    });
    if (first.id !== second.id) {
      await prisma.bid.create({
        data: {
          auctionId: auction.id,
          bidderId: second.id,
          amountHkd: auction.startingBidHkd + auction.minIncrementHkd * 2,
        },
      });
    }
  }

  const endedLike = createdAuctions.filter((a) => a.endsAt.getTime() <= Date.now() + 2 * 3600_000).slice(0, 4);
  for (const [i, auction] of endedLike.entries()) {
    const winner = testers.filter((u) => u.id !== auction.sellerId)[i % 8];
    const amount = auction.startingBidHkd + 80;
    await prisma.auction.update({
      where: { id: auction.id },
      data: { status: "ENDED", endsAt: new Date(Date.now() - 30 * 60_000) },
    });
    await prisma.bid.create({ data: { auctionId: auction.id, bidderId: winner.id, amountHkd: amount } });
    const convo = await prisma.conversation.create({
      data: { auctionId: auction.id, buyerId: winner.id, sellerId: auction.sellerId },
    });
    await prisma.message.create({
      data: {
        conversationId: convo.id,
        senderId: auction.sellerId,
        body: `恭喜你以$${amount}拍得「${auction.title}」。請 48 小時內去交易中確認。`,
      },
    });
    await prisma.trade.create({
      data: {
        auctionId: auction.id,
        buyerId: winner.id,
        sellerId: auction.sellerId,
        conversationId: convo.id,
        amountHkd: amount,
        source: "AUCTION",
        status: "RESERVED",
        respondBy: new Date(Date.now() + 48 * 3600_000),
      },
    });
  }

  console.log({
    users: users.length,
    listings: createdListings.length,
    auctions: createdAuctions.length,
    admin: admin.username,
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
