import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function NotificationRedirectPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/messages?tab=alerts");
  const { id } = await params;
  const note = await prisma.notification.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!note) redirect("/messages?tab=alerts");
  if (!note.readAt) {
    await prisma.notification.update({ where: { id: note.id }, data: { readAt: new Date() } });
  }
  redirect(note.href || "/messages?tab=alerts");
}
