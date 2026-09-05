import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProfileForm } from "@/components/ProfileForm";

export const dynamic = "force-dynamic";

export default async function MePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { listings: { orderBy: { createdAt: "desc" } } },
  });
  if (!user) redirect("/login");

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <ProfileForm
        displayName={user.displayName}
        bio={user.bio ?? ""}
        whatsapp={user.whatsapp ?? ""}
        phone={user.phone}
        deliveryNote={user.deliveryNote ?? ""}
        paymentNote={user.paymentNote ?? ""}
        avatarUrl={user.avatarUrl ?? ""}
      />
      <section className="card space-y-4 p-6">
        <h2 className="text-xl font-black">我的商品</h2>
        <p className="text-sm text-[var(--muted)]">
          目前有 {user.listings.filter((l) => l.status === "ACTIVE").length} 件放售中、
          {user.listings.filter((l) => l.status === "SOLD").length} 件已售。
        </p>
        <div className="flex flex-wrap gap-2">
          <Link className="btn-primary" href="/selling">
            查看我的商品
          </Link>
          <Link className="btn-secondary" href="/listings/new">
            新放售
          </Link>
        </div>
      </section>
    </div>
  );
}
