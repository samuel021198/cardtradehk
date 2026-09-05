export const GAMES = [
  { value: "POKEMON", label: "Pokémon" },
  { value: "ONE_PIECE", label: "One Piece" },
  { value: "LORCANA", label: "Lorcana" },
  { value: "SPORTS", label: "球員卡" },
  { value: "RIFTBOUND", label: "Riftbound" },
  { value: "OTHER", label: "其他" },
] as const;

export const CARD_TYPES = [
  { value: "GRADED", label: "鑑定卡" },
  { value: "RAW", label: "Raw卡" },
  { value: "SEALED", label: "未開封產品" },
] as const;

export const GRADED_GRADES = [
  { value: "PSA10", label: "PSA10" },
  { value: "PSA9", label: "PSA9" },
  { value: "PSA8_UNDER", label: "PSA8 or under" },
  { value: "BGS10", label: "BGS10" },
  { value: "BGS10_BLACK", label: "BGS10 Black Label" },
  { value: "OTHERS", label: "Others" },
] as const;

export const RAW_GRADES = [
  { value: "A", label: "A" },
  { value: "B", label: "B" },
  { value: "C", label: "C" },
  { value: "D", label: "D" },
  { value: "E", label: "E" },
] as const;

export const SEALED_FORMS = [
  { value: "CASE", label: "原箱" },
  { value: "BOX", label: "原盒" },
  { value: "ACCESSORY", label: "附產品" },
] as const;

export const MAX_LISTING_IMAGES = 10;
export const MAX_BATCH_POST = 10;

export const LISTING_STATUS = {
  ACTIVE: "ACTIVE",
  RESERVED: "RESERVED",
  SOLD: "SOLD",
  HIDDEN: "HIDDEN",
} as const;

export const OFFER_STATUS = {
  PENDING: "PENDING",
  ACCEPTED: "ACCEPTED",
  DECLINED: "DECLINED",
  CANCELLED: "CANCELLED",
} as const;

export const TRADE_STATUS = {
  RESERVED: "RESERVED",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
} as const;

export const TRADE_SOURCE = {
  OFFER: "OFFER",
  MANUAL: "MANUAL",
  AUCTION: "AUCTION",
} as const;

export function gameLabel(value: string) {
  return GAMES.find((g) => g.value === value)?.label ?? value;
}

export function cardTypeLabel(value: string) {
  return CARD_TYPES.find((t) => t.value === value)?.label ?? value;
}

export function gradesFor(cardType: string) {
  if (cardType === "GRADED") return GRADED_GRADES;
  if (cardType === "SEALED") return SEALED_FORMS;
  return RAW_GRADES;
}

export function isValidCardType(cardType: string) {
  return CARD_TYPES.some((t) => t.value === cardType);
}

export function cardTypeDetailLabel(cardType: string) {
  if (cardType === "GRADED") return "鑑定";
  if (cardType === "SEALED") return "形式";
  return "品質";
}

export function isValidListingCondition(cardType: string, condition: string) {
  return gradesFor(cardType).some((g) => g.value === condition);
}

export function conditionLabel(value: string) {
  return [...GRADED_GRADES, ...RAW_GRADES, ...SEALED_FORMS].find((c) => c.value === value)?.label ?? value;
}

export function listingMeta(game: string, cardType: string, condition: string) {
  return `${gameLabel(game)} · ${cardTypeLabel(cardType)} · ${conditionLabel(condition)}`;
}

export function statusLabel(status: string) {
  if (status === "BLOCKED") return "已封鎖";
  if (status === "RESTRICTED") return "已限制";
  return "正常";
}
