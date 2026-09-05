export const MEMBERSHIP_TIERS = [
  { value: "MASTER_MERCHANT", label: "大師級商戶" },
  { value: "PRO_MERCHANT", label: "專業商戶" },
  { value: "PREMIUM", label: "高級帳戶" },
  { value: "SUPER", label: "超級帳戶" },
  { value: "NORMAL", label: "普通帳戶" },
] as const;

export type MembershipTier = (typeof MEMBERSHIP_TIERS)[number]["value"];

export function isMembershipTier(value: string): value is MembershipTier {
  return MEMBERSHIP_TIERS.some((t) => t.value === value);
}

export function tierLabel(value: string) {
  return MEMBERSHIP_TIERS.find((t) => t.value === value)?.label ?? "普通帳戶";
}

export const REPORT_REASONS = [
  { value: "SCAM", label: "懷疑詐騙／假貨" },
  { value: "ABANDON", label: "棄單／唔交收" },
  { value: "ABUSE", label: "騷擾或不當行為" },
  { value: "OTHER", label: "其他" },
] as const;

export function reportReasonLabel(value: string) {
  return REPORT_REASONS.find((r) => r.value === value)?.label ?? value;
}

export const MAX_PINS = 3;
