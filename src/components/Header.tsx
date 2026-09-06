import Link from "next/link";
import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BuyMenu } from "@/components/BuyMenu";
import { AuctionMenu } from "@/components/AuctionMenu";
import { SellMenu } from "@/components/SellMenu";
import { AccountMenu } from "@/components/AccountMenu";
import { NavBadge } from "@/components/NavBadge";
import { MobileTabBar } from "@/components/MobileTabBar";
import { getNavBadges } from "@/lib/unread";

export async function Header() {
  const session = await auth();
  const [me, badges] = session?.user?.id
    ? await Promise.all([
        prisma.user.findUnique({
          where: { id: session.user.id },
          select: { role: true, canPost: true, canAuction: true, avatarUrl: true },
        }),
        getNavBadges(session.user.id),
      ])
    : [null, { notifications: 0, chats: 0 }];

  const inbox = badges.notifications + badges.chats;

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--paper)]/90 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-3 md:h-16 md:px-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-[var(--accent)] text-sm font-black text-black md:h-9 md:w-9">
              CT
            </span>
            <span className="text-base font-black tracking-tight md:text-lg">
              CardTrade<span className="text-[var(--accent)]">HK</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-0.5 text-sm font-semibold md:flex sm:gap-1">
            <Suspense fallback={<span className="rounded-full px-3 py-2">消費</span>}>
              <BuyMenu />
            </Suspense>
            <Suspense fallback={<span className="rounded-full px-3 py-2">拍賣</span>}>
              <AuctionMenu canCreate={Boolean(me?.canAuction)} />
            </Suspense>
            <SellMenu canPost={me?.canPost !== false} />
            <Link className="relative rounded-full px-3 py-2 hover:bg-[var(--chip)]" href="/messages">
              訊息
              {session?.user && <NavBadge count={inbox} />}
            </Link>
            {session?.user ? (
              <AccountMenu
                name={session.user.displayName}
                avatarUrl={me?.avatarUrl}
                userId={session.user.id}
                isAdmin={me?.role === "ADMIN"}
              />
            ) : (
              <>
                <Link className="rounded-full px-3 py-2 hover:bg-[var(--chip)]" href="/login">
                  登入
                </Link>
                <Link className="rounded-full bg-[var(--accent)] px-4 py-2 text-black" href="/register">
                  申請帳戶
                </Link>
              </>
            )}
          </nav>
          <div className="md:hidden">
            {!session?.user && (
              <Link className="rounded-full bg-[var(--accent)] px-3 py-1.5 text-sm font-black text-black" href="/login">
                登入
              </Link>
            )}
          </div>
        </div>
      </header>
      <MobileTabBar inbox={inbox} loggedIn={Boolean(session?.user)} />
    </>
  );
}
