import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { UserAvatar } from "@/components/UserAvatar";

export const dynamic = "force-dynamic";

export default async function UserReviewsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      reviewsReceived: {
        include: { fromUser: { select: { id: true, displayName: true, avatarUrl: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!user) notFound();

  const avg = user.reviewsReceived.length
    ? user.reviewsReceived.reduce((s, r) => s + r.rating, 0) / user.reviewsReceived.length
    : null;

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <Link className="text-sm font-bold text-[var(--accent)]" href={`/users/${user.id}`}>
        ← 返回帳戶
      </Link>
      <div className="flex items-center gap-3">
        <UserAvatar name={user.displayName} src={user.avatarUrl} size="lg" />
        <div>
          <h1 className="text-2xl font-black">{user.displayName} 的評分</h1>
          <p className="text-sm text-[var(--muted)]">
            {avg ? `${avg.toFixed(1)} / 5 · ${user.reviewsReceived.length} 則` : "未有評價"}
          </p>
        </div>
      </div>
      {user.reviewsReceived.length === 0 ? (
        <p className="text-[var(--muted)]">未有人評過。</p>
      ) : (
        <div className="space-y-2">
          {user.reviewsReceived.map((r) => (
            <div key={r.id} className="card p-4">
              <Link href={`/users/${r.fromUser.id}`} className="flex items-center gap-2 font-black hover:text-[var(--accent)]">
                <UserAvatar name={r.fromUser.displayName} src={r.fromUser.avatarUrl} size="sm" />
                {r.fromUser.displayName}
              </Link>
              <div className="mt-2 text-[var(--accent)]">
                {"★".repeat(r.rating)}
                {"☆".repeat(5 - r.rating)}
              </div>
              <p className="mt-1 text-sm">{r.comment || "尚未填寫評語。"}</p>
              <div className="mt-2 text-xs text-[var(--muted)]">{r.createdAt.toLocaleString("zh-HK")}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
