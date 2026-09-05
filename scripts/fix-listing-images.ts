import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const GAME_COVER: Record<string, string> = {
  POKEMON: "https://images.pokemontcg.io/base1/58_hires.png",
  ONE_PIECE: "https://limitlesstcg.nyc3.cdn.digitaloceanspaces.com/one-piece/OP05/OP05-119_EN.webp",
  LORCANA: "https://images.pokemontcg.io/swsh12pt5/160_hires.png",
  SPORTS: "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=640&q=80",
  RIFTBOUND: "https://images.unsplash.com/photo-1606092195730-5d7b9af1efc5?auto=format&fit=crop&w=640&q=80",
  OTHER: "https://images.pokemontcg.io/base1/58_hires.png",
};

const TITLE_COVER: Array<[string, string]> = [
  ["Elsa", "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=640&q=80"],
  ["Stitch", "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=640&q=80"],
  ["Maleficent", "https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?auto=format&fit=crop&w=640&q=80"],
  ["Mickey", "https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=640&q=80"],
  ["Lorcana", "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=640&q=80"],
  ["Wembanyama", "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=640&q=80"],
  ["Haaland", "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=640&q=80"],
  ["Herbert", "https://images.unsplash.com/photo-1566577739112-5180d4bf9390?auto=format&fit=crop&w=640&q=80"],
  ["Ohtani", "https://images.unsplash.com/photo-1566577739112-5180d4bf9390?auto=format&fit=crop&w=640&q=80"],
  ["Yamal", "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=640&q=80"],
  ["Riftbound", "https://images.unsplash.com/photo-1606092195730-5d7b9af1efc5?auto=format&fit=crop&w=640&q=80"],
];

function parse(json: string) {
  try {
    return JSON.parse(json) as string[];
  } catch {
    return [];
  }
}

function coverFor(title: string, game: string) {
  const hit = TITLE_COVER.find(([key]) => title.includes(key));
  return hit?.[1] ?? GAME_COVER[game] ?? GAME_COVER.OTHER;
}

function needsFix(images: string[], game: string, title: string) {
  if (images.length === 0) return true;
  const src = images[0] ?? "";
  const sportsWrong = ["SPORTS", "RIFTBOUND", "LORCANA"].includes(game) && src.includes("pokemontcg.io");
  const titleWrong = TITLE_COVER.some(([key]) => title.includes(key)) && src.includes("pokemontcg.io");
  return sportsWrong || titleWrong;
}

async function main() {
  const listings = await prisma.listing.findMany({ select: { id: true, title: true, game: true, images: true } });
  const auctions = await prisma.auction.findMany({ select: { id: true, title: true, game: true, images: true } });
  let updated = 0;
  for (const row of [...listings.map((r) => ({ ...r, kind: "listing" })), ...auctions.map((r) => ({ ...r, kind: "auction" }))]) {
    const images = parse(row.images);
    if (!needsFix(images, row.game, row.title)) continue;
    const url = coverFor(row.title, row.game);
    const next = JSON.stringify([url]);
    if (row.kind === "listing") await prisma.listing.update({ where: { id: row.id }, data: { images: next } });
    else await prisma.auction.update({ where: { id: row.id }, data: { images: next } });
    updated += 1;
    console.log("ok", row.title, url);
  }
  console.log(`updated ${updated}`);
}

main().finally(() => prisma.$disconnect());
