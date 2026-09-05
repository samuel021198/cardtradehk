import { MAX_AUCTION_DAYS } from "@/lib/buy";

export const SNIPER_WINDOW_MS = 10 * 60 * 1000;
export const SNIPER_EXTEND_MS = 5 * 60 * 1000;
export const WINNER_RESPOND_HOURS = 48;

export function auctionIsLive(endsAt: Date, status: string) {
  return status === "LIVE" && endsAt.getTime() > Date.now();
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function formatRemain(endsAt: Date) {
  const ms = endsAt.getTime() - Date.now();
  if (ms <= 0) return "已結束";
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return `${pad(days)}：${pad(hours)}：${pad(mins)}：${pad(secs)}`;
}

export function nextEndsAtIfSniped(endsAt: Date, now = new Date()) {
  const remain = endsAt.getTime() - now.getTime();
  if (remain <= 0 || remain > SNIPER_WINDOW_MS) return null;
  return new Date(endsAt.getTime() + SNIPER_EXTEND_MS);
}

export function validateAuctionWindow(startsAt: Date, endsAt: Date) {
  const maxMs = MAX_AUCTION_DAYS * 24 * 60 * 60 * 1000;
  if (endsAt.getTime() <= startsAt.getTime()) return "結束時間要遲過開始時間";
  if (endsAt.getTime() - startsAt.getTime() > maxMs + 60_000) return "拍賣時間最多一星期";
  return null;
}

export function currentBid(startingBidHkd: number, topBid?: number | null) {
  return topBid && topBid > 0 ? topBid : startingBidHkd;
}
