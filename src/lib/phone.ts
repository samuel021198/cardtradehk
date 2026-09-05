export function normalizeHkPhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 8) return `852${digits}`;
  if (digits.length === 11 && digits.startsWith("852")) return digits;
  return null;
}

export function formatHkPhone(stored: string): string {
  if (stored.startsWith("852") && stored.length === 11) {
    return `+852 ${stored.slice(3, 7)} ${stored.slice(7)}`;
  }
  return stored;
}

export function whatsappLink(number: string, text?: string): string {
  const url = new URL(`https://wa.me/${number}`);
  if (text) url.searchParams.set("text", text);
  return url.toString();
}
