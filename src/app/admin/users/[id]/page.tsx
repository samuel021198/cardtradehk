import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AdminUserDetail } from "@/components/admin/AdminUserDetail";

export const dynamic = "force-dynamic";

export default async function AdminUserPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
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
      whatsapp: true,
    },
  });
  if (!user) notFound();
  return <AdminUserDetail user={user} />;
}
