const KEY = "cardtradehk.search.history";
const MAX = 10;

export function readSearchHistory(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string" && item.trim().length > 0) : [];
  } catch {
    return [];
  }
}

export function rememberSearch(q: string) {
  const term = q.trim();
  if (term.length < 2) return readSearchHistory();
  const next = [term, ...readSearchHistory().filter((item) => item.toLowerCase() !== term.toLowerCase())].slice(0, MAX);
  window.localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function forgetSearch(q: string) {
  const next = readSearchHistory().filter((item) => item !== q);
  window.localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function clearSearchHistory() {
  window.localStorage.removeItem(KEY);
  return [];
}
