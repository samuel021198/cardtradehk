import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserAvatar } from "@/components/UserAvatar";
import { SignOutButton } from "@/components/SignOutButton";

export const dynamic = "force-dynamic";

const LINKS = [
  { href: "/trades", label: "交易中", hint: "發貨、收貨、互評" },
  { href: "/favorites", label: "我的收藏", hint: "收藏咗嘅放售同拍賣" },
  { href: "/selling", label: "我的商品", hint: "管理放售中嘅帖" },
  { href: "/listings/new", label: "放售商品", hint: "開新帖" },
  { href: "/auctions/new", label: "開拍", hint: "開新拍賣" },
  { href: "/me", label: "個人設定", hint: "頭像、WhatsApp、交收備註" },
] as const;

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/account");

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, displayName: true, avatarUrl: true, role: true, bio: true, canAuction: true },
  });
  if (!me) redirect("/login?callbackUrl=/account");

  return (
    <div className="space-y-4">
      <Link href={`/users/${me.id}`} className="card flex items-center gap-4 p-4">
        <UserAvatar name={me.displayName} src={me.avatarUrl} />
        <div className="min-w-0 flex-1">
          <div className="text-xl font-black">{me.displayName}</div>
          <p className="truncate text-sm text-[var(--muted)]">{me.bio || "睇我的帳戶同評價"}</p>
        </div>
        <span className="text-sm font-bold text-[var(--accent)]">檔案</span>
      </Link>
      <div className="space-y-2">
        {LINKS.filter((item) => item.href !== "/auctions/new" || me.canAuction).map((item) => (
          <Link key={item.href} href={item.href} className="card block p-4">
            <div className="text-base font-black">{item.label}</div>
            <div className="mt-0.5 text-sm text-[var(--muted)]">{item.hint}</div>
          </Link>
        ))}
        {me.role === "ADMIN" && (
          <Link href="/admin" className="card block p-4">
            <div className="text-base font-black">後台</div>
            <div className="mt-0.5 text-sm text-[var(--muted)]">用戶、檢舉、權限</div>
          </Link>
        )}
      </div>
      <SignOutButton />
    </div>
  );
}
