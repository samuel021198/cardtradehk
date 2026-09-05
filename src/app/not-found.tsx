import Link from "next/link";

export default function NotFound() {
  return (
    <div className="card p-10 text-center">
      <h1 className="text-2xl font-black">搵唔到呢頁</h1>
      <p className="mt-2 text-[var(--muted)]">帖文可能已刪或者連結錯咗。</p>
      <Link className="btn-primary mt-6" href="/">
        返去市集
      </Link>
    </div>
  );
}
