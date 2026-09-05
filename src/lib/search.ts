import type { Prisma } from "@prisma/client";
import { CARD_TYPES, GAMES } from "@/lib/constants";

const GAME_ALIAS: Record<string, string> = {
  pokemon: "POKEMON",
  poke: "POKEMON",
  ptcg: "POKEMON",
  寶可夢: "POKEMON",
  比卡超: "POKEMON",
  寵物小精靈: "POKEMON",
  onepiece: "ONE_PIECE",
  "one piece": "ONE_PIECE",
  海賊: "ONE_PIECE",
  海賊王: "ONE_PIECE",
  航海王: "ONE_PIECE",
  lorcana: "LORCANA",
  迪士尼: "LORCANA",
  sports: "SPORTS",
  球員卡: "SPORTS",
  球星卡: "SPORTS",
  nba: "SPORTS",
  riftbound: "RIFTBOUND",
};

const TYPE_ALIAS: Record<string, string> = {
  鑑定: "GRADED",
  鑑定卡: "GRADED",
  graded: "GRADED",
  psa: "GRADED",
  bgs: "GRADED",
  raw: "RAW",
  raw卡: "RAW",
  散卡: "RAW",
  未開封: "SEALED",
  未開封產品: "SEALED",
  sealed: "SEALED",
  原盒: "SEALED",
  原箱: "SEALED",
  box: "SEALED",
  etb: "SEALED",
};

const WORD_EXPAND: Record<string, string[]> = {
  路飛: ["luffy"],
  索隆: ["zoro", "roronoa"],
  娜美: ["nami"],
  香吉士: ["sanji"],
  紅髮: ["shanks"],
  女帝: ["hancock", "boa"],
  羅: ["law", "trafalgar"],
  大和: ["yamato"],
  艾斯: ["ace"],
  羅賓: ["robin"],
  比卡超: ["pikachu"],
  皮卡丘: ["pikachu"],
  噴火龍: ["charizard"],
  超夢: ["mewtwo"],
  夢幻: ["mew"],
  月亮伊布: ["umbreon"],
  裂空座: ["rayquaza"],
  暴鯉龍: ["gyarados"],
  耿鬼: ["gengar"],
  洛奇亞: ["lugia"],
  妙蛙花: ["venusaur"],
  水箭龜: ["blastoise"],
};

export type ParsedSearch = {
  raw: string;
  tokenGroups: string[][];
  games: string[];
  cardTypes: string[];
  minPrice?: number;
  maxPrice?: number;
};

function fold(text: string) {
  return text
    .toLowerCase()
    .normalize("NFKC")
    .replace(/[‐‑‒–—―]/g, "-")
    .trim();
}

function variants(token: string) {
  const out = new Set<string>([token]);
  const compact = token.replace(/[-\s]/g, "");
  if (compact && compact !== token) out.add(compact);
  if (token.includes("-")) out.add(token.replace(/-/g, " "));
  const extra = WORD_EXPAND[token];
  if (extra) extra.forEach((item) => out.add(item));
  return [...out];
}

export function parseSearch(q: string): ParsedSearch {
  const raw = fold(q);
  let rest = raw;
  let minPrice: number | undefined;
  let maxPrice: number | undefined;

  const games: string[] = [];
  const cardTypes: string[] = [];
  const tokenGroups: string[][] = [];

  rest = rest.replace(/hk\$?\s*/g, "");
  for (const [alias, game] of Object.entries(GAME_ALIAS)) {
    if (alias.includes(" ") && rest.includes(alias)) {
      if (!games.includes(game)) games.push(game);
      rest = rest.replace(alias, " ");
    }
  }
  const range = rest.match(/(\d+)\s*[-~至到]\s*(\d+)/);
  if (range) {
    minPrice = Number(range[1]);
    maxPrice = Number(range[2]);
    rest = rest.replace(range[0], " ");
  } else {
    const under = rest.match(/(?:低于|低過|最多|under|<=|<)\s*(\d+)/);
    const over = rest.match(/(?:高于|高過|最少|over|>=|>)\s*(\d+)/);
    if (under) {
      maxPrice = Number(under[1]);
      rest = rest.replace(under[0], " ");
    }
    if (over) {
      minPrice = Number(over[1]);
      rest = rest.replace(over[0], " ");
    }
  }

  for (const part of rest.split(/[\s,/|]+/).filter(Boolean)) {
    const game = GAME_ALIAS[part] ?? GAME_ALIAS[part.replace(/\s/g, "")];
    if (game) {
      if (!games.includes(game)) games.push(game);
      continue;
    }
    const type = TYPE_ALIAS[part];
    if (type) {
      if (!cardTypes.includes(type)) cardTypes.push(type);
      continue;
    }
    tokenGroups.push(variants(part));
  }

  return { raw, tokenGroups, games, cardTypes, minPrice, maxPrice };
}

function itemOr(terms: string[]): Prisma.ListingWhereInput[] {
  return terms.flatMap((term) => {
    const match = { contains: term, mode: "insensitive" as const };
    return [
      { title: match },
      { description: match },
      { condition: match },
      { seller: { displayName: match } },
    ];
  });
}

export function listingSearchWhere(
  q: string,
  extras: { game?: string; cardType?: string } = {},
): Prisma.ListingWhereInput {
  const parsed = parseSearch(q);
  const and: Prisma.ListingWhereInput[] = [];
  const game = extras.game || (parsed.games.length === 1 ? parsed.games[0] : undefined);
  const cardType = extras.cardType || (parsed.cardTypes.length === 1 ? parsed.cardTypes[0] : undefined);
  if (game) and.push({ game });
  else if (parsed.games.length > 1) and.push({ game: { in: parsed.games } });
  if (cardType) and.push({ cardType });
  else if (parsed.cardTypes.length > 1) and.push({ cardType: { in: parsed.cardTypes } });
  if (parsed.minPrice != null || parsed.maxPrice != null) {
    and.push({
      priceHkd: {
        ...(parsed.minPrice != null ? { gte: parsed.minPrice } : {}),
        ...(parsed.maxPrice != null ? { lte: parsed.maxPrice } : {}),
      },
    });
  }
  for (const group of parsed.tokenGroups) {
    and.push({ OR: itemOr(group) });
  }
  return and.length ? { AND: and } : {};
}

export function auctionSearchWhere(
  q: string,
  extras: { game?: string; cardType?: string } = {},
): Prisma.AuctionWhereInput {
  const listingLike = listingSearchWhere(q, extras) as Prisma.AuctionWhereInput;
  const parsed = parseSearch(q);
  if (parsed.minPrice == null && parsed.maxPrice == null) return listingLike;

  const and = Array.isArray(listingLike.AND) ? [...listingLike.AND] : listingLike.AND ? [listingLike.AND] : [];
  const next = and.filter((clause) => !("priceHkd" in clause));
  next.push({
    startingBidHkd: {
      ...(parsed.minPrice != null ? { gte: parsed.minPrice } : {}),
      ...(parsed.maxPrice != null ? { lte: parsed.maxPrice } : {}),
    },
  });
  return { AND: next };
}

export function scoreCatalogItem(
  item: { title: string; description?: string | null; condition?: string; game?: string; sellerName?: string },
  q: string,
) {
  const parsed = parseSearch(q);
  const title = fold(item.title);
  const hay = fold(`${item.title} ${item.description ?? ""} ${item.condition ?? ""} ${item.sellerName ?? ""}`);
  let score = 0;
  if (parsed.raw && title === parsed.raw) score += 120;
  if (parsed.raw && title.startsWith(parsed.raw)) score += 50;
  if (parsed.raw && title.includes(parsed.raw)) score += 35;
  for (const group of parsed.tokenGroups) {
    if (group.some((term) => title.includes(term))) score += 18;
    else if (group.some((term) => hay.includes(term))) score += 6;
  }
  if (parsed.games.includes(item.game ?? "")) score += 8;
  return score;
}

export function searchHint(q: string) {
  const games = GAMES.map((item) => item.label).join("、");
  const types = CARD_TYPES.map((item) => item.label).join("、");
  if (!q.trim()) return `可搜尋卡名、系列、賣家、${games}、${types}，或輸入「100-500」。`;
  return `「${q.trim()}」的搜尋結果`;
}
