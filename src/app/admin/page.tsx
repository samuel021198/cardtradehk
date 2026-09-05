import { prisma } from "@/lib/prisma";
import { AdminUsers } from "@/components/admin/AdminUsers";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      phone: true,
      displayName: true,
      role: true,
      status: true,
      canPost: true,
      canChat: true,
      canReview: true,
      canAuction: true,
      membershipTier: true,
      adminNote: true,
      createdAt: true,
      _count: { select: { listings: true, reviewsReceived: true } },
    },
  });

  return <AdminUsers users={users.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() }))} />;
}
