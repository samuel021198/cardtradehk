import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/permissions";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  if (!admin) redirect("/");
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-bold text-[var(--accent)]">管理員後台</p>
        <h1 className="text-3xl font-black">用戶管理</h1>
        <p className="mt-1 text-[var(--muted)]">封鎖、升降會員級別、處理檢舉、開關功能。</p>
        <div className="mt-3 flex gap-2">
          <Link className="btn-secondary px-3 py-1 text-sm" href="/admin">
            用戶
          </Link>
          <Link className="btn-secondary px-3 py-1 text-sm" href="/admin/reports">
            檢舉
          </Link>
        </div>
      </div>
      {children}
    </div>
  );
}
