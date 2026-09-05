import Link from "next/link";

export default function NotFound() {
  return (
    <div className="card p-10 text-center">
      <h1 className="text-2xl font-black">找不到此頁面</h1>
      <p className="mt-2 text-[var(--muted)]">商品可能已刪除，或連結無效。</p>
      <Link className="btn-primary mt-6" href="/">
        返回市集
      </Link>
    </div>
  );
}
