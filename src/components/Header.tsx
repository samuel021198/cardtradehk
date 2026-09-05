import Link from "next/link";
import { Suspense } from "react";
import { auth, signOut } from "@/lib/auth";
import { getCurrentUser } from "@/lib/permissions";
import { BuyMenu } from "@/components/BuyMenu";
import { AuctionMenu } from "@/components/AuctionMenu";
import { AccountMenu } from "@/components/AccountMenu";
import { NavBadge } from "@/components/NavBadge";
import { getNavBadges } from "@/lib/unread";

export async function Header() {
  const session = await auth();
  const me = session?.user?.id ? await getCurrentUser() : null;
  const badges = session?.user?.id
    ? await getNavBadges(session.user.id)
    : { notifications: 0, trades: 0, chats: 0 };

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--paper)]/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[var(--accent)] text-sm font-black text-black">
            CT
          </span>
          <span className="text-lg font-black tracking-tight">
            CardTrade<span className="text-[var(--accent)]">HK</span>
          </span>
        </Link>
        <nav className="flex items-center gap-1 text-sm font-semibold sm:gap-2">
          <Suspense fallback={<span className="rounded-full px-3 py-2">買野</span>}>
            <BuyMenu />
          </Suspense>
          <Suspense fallback={<span className="rounded-full px-3 py-2">拍賣</span>}>
            <AuctionMenu canCreate={Boolean(me?.canAuction)} />
          </Suspense>
          {me?.canPost !== false && (
            <Link className="rounded-full px-3 py-2 hover:bg-[var(--chip)]" href="/listings/new">
              賣野
            </Link>
          )}
          {session?.user && (
            <Link className="rounded-full px-3 py-2 hover:bg-[var(--chip)]" href="/favorites">
              我的收藏
            </Link>
          )}
          {session?.user && (
            <Link className="relative rounded-full px-3 py-2 hover:bg-[var(--chip)]" href="/notifications">
              消息
              <NavBadge count={badges.notifications} />
            </Link>
          )}
          <Link className="relative rounded-full px-3 py-2 hover:bg-[var(--chip)]" href="/messages">
            聊天
            {session?.user && <NavBadge count={badges.chats} />}
          </Link>
          {session?.user && (
            <Link className="relative rounded-full px-3 py-2 hover:bg-[var(--chip)]" href="/trades">
              交易中
              <NavBadge count={badges.trades} />
            </Link>
          )}
          {me?.role === "ADMIN" && (
            <Link className="rounded-full px-3 py-2 hover:bg-[var(--chip)]" href="/admin">
              後台
            </Link>
          )}
          {session?.user ? (
            <>
              <AccountMenu name={session.user.displayName} avatarUrl={me?.avatarUrl} userId={session.user.id} />
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button className="rounded-full px-3 py-2 text-[var(--muted)] hover:bg-[var(--chip)]" type="submit">
                  登出
                </button>
              </form>
            </>
          ) : (
            <>
              <Link className="rounded-full px-3 py-2 hover:bg-[var(--chip)]" href="/login">
                登入
              </Link>
              <Link className="rounded-full bg-[var(--accent)] px-4 py-2 text-black" href="/register">
                開戶
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
