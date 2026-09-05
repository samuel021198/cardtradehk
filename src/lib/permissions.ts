import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const USER_STATUS = {
  ACTIVE: "ACTIVE",
  RESTRICTED: "RESTRICTED",
  BLOCKED: "BLOCKED",
} as const;

export type Feature = "post" | "chat" | "review" | "auction";

export async function getCurrentUser() {
  const session = await auth();
  if (!session?.user?.id) return null;
  return prisma.user.findUnique({ where: { id: session.user.id } });
}

export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN" || user.status === USER_STATUS.BLOCKED) return null;
  return user;
}

export function featureDenied(user: {
  status: string;
  canPost: boolean;
  canChat: boolean;
  canReview: boolean;
  canAuction?: boolean;
}, feature: Feature) {
  if (user.status === USER_STATUS.BLOCKED) return "呢個戶口已被封鎖";
  if (feature === "post" && !user.canPost) return "你嘅戶口暫時唔可以放售";
  if (feature === "chat" && !user.canChat) return "你嘅戶口暫時唔可以用站內傾偈";
  if (feature === "review" && !user.canReview) return "你嘅戶口暫時唔可以評分";
  if (feature === "auction" && !user.canAuction) return "呢個戶口未開通拍賣功能，請聯絡管理員。";
  return null;
}

