import { GAMES, MAX_BATCH_POST, MAX_LISTING_IMAGES, isValidCardType, isValidListingCondition } from "@/lib/constants";
import { AUCTION_DURATIONS } from "@/lib/buy";
import { validateAuctionWindow } from "@/lib/auction";

export type ListingDraft = {
  title: string;
  game: string;
  cardType: string;
  condition: string;
  description: string;
  priceHkd: number;
  images: string[];
};

export type AuctionDraft = {
  title: string;
  game: string;
  cardType: string;
  condition: string;
  description: string;
  images: string[];
  startingBidHkd: number;
  minIncrementHkd: number;
  durationHours: number;
};

function asImages(value: unknown) {
  return Array.isArray(value) ? value.map(String).slice(0, MAX_LISTING_IMAGES) : [];
}

export function parseListingDraft(body: Record<string, unknown> | null): { ok: true; draft: ListingDraft } | { ok: false; error: string } {
  const title = String(body?.title ?? "").trim();
  const game = String(body?.game ?? "");
  const cardType = String(body?.cardType ?? "");
  const condition = String(body?.condition ?? "");
  const description = String(body?.description ?? "").trim();
  const priceHkd = Number(body?.priceHkd);
  const images = asImages(body?.images);
  if (title.length < 2) return { ok: false, error: "請輸入卡名／標題" };
  if (!GAMES.some((g) => g.value === game)) return { ok: false, error: "請選擇種類" };
  if (!isValidCardType(cardType)) return { ok: false, error: "請選擇鑑定卡、Raw卡或未開封產品" };
  if (!isValidListingCondition(cardType, condition)) return { ok: false, error: "請選擇對應選項" };
  if (!Number.isInteger(priceHkd) || priceHkd < 1) return { ok: false, error: "請輸入有效港幣價錢" };
  return { ok: true, draft: { title, game, cardType, condition, description, priceHkd, images } };
}

export function parseAuctionDraft(body: Record<string, unknown> | null): { ok: true; draft: AuctionDraft } | { ok: false; error: string } {
  const title = String(body?.title ?? "").trim();
  const game = String(body?.game ?? "");
  const cardType = String(body?.cardType ?? "");
  const condition = String(body?.condition ?? "");
  const description = String(body?.description ?? "").trim();
  const images = asImages(body?.images);
  const startingBidHkd = Number(body?.startingBidHkd);
  const minIncrementHkd = Number(body?.minIncrementHkd ?? 10);
  const durationHours = Number(body?.durationHours);
  if (title.length < 2) return { ok: false, error: "請輸入標題" };
  if (!GAMES.some((g) => g.value === game)) return { ok: false, error: "請選擇種類" };
  if (!isValidCardType(cardType) || !isValidListingCondition(cardType, condition)) {
    return { ok: false, error: "請選擇鑑定／Raw／未開封選項" };
  }
  if (!Number.isInteger(startingBidHkd) || startingBidHkd < 1) return { ok: false, error: "請輸入有效起拍價" };
  if (!Number.isInteger(minIncrementHkd) || minIncrementHkd < 1) return { ok: false, error: "加價幅度至少 $1" };
  if (!AUCTION_DURATIONS.some((d) => d.hours === durationHours)) return { ok: false, error: "拍賣時間最多一星期" };
  const startsAt = new Date();
  const endsAt = new Date(startsAt.getTime() + durationHours * 60 * 60 * 1000);
  const windowError = validateAuctionWindow(startsAt, endsAt);
  if (windowError) return { ok: false, error: windowError };
  return {
    ok: true,
    draft: { title, game, cardType, condition, description, images, startingBidHkd, minIncrementHkd, durationHours },
  };
}

export function parseBatch<T>(
  body: { items?: unknown } | null,
  parseOne: (item: Record<string, unknown> | null) => { ok: true; draft: T } | { ok: false; error: string },
): { ok: true; drafts: T[] } | { ok: false; error: string } {
  const raw = Array.isArray(body?.items) ? body.items : body ? [body] : [];
  if (raw.length === 0) return { ok: false, error: "請至少加入一件商品" };
  if (raw.length > MAX_BATCH_POST) return { ok: false, error: `一次最多發佈 ${MAX_BATCH_POST} 件` };
  const drafts: T[] = [];
  for (const [index, item] of raw.entries()) {
    const parsed = parseOne((item ?? null) as Record<string, unknown> | null);
    if (!parsed.ok) return { ok: false, error: `第 ${index + 1} 件：${parsed.error}` };
    drafts.push(parsed.draft);
  }
  return { ok: true, drafts };
}
