import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ChatRoom } from "@/components/ChatRoom";

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { id } = await params;
  const conversation = await prisma.conversation.findUnique({ where: { id } });
  if (!conversation || (conversation.buyerId !== session.user.id && conversation.sellerId !== session.user.id)) {
    redirect("/messages");
  }

  return <ChatRoom conversationId={id} meId={session.user.id} />;
}
