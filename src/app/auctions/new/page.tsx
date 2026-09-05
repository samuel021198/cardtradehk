import { redirect } from "next/navigation";
import { AuctionForm } from "@/components/AuctionForm";
import { featureDenied, getCurrentUser } from "@/lib/permissions";

export default async function NewAuctionPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login?callbackUrl=/auctions/new");
  const denied = featureDenied(me, "auction");
  if (denied) {
    return (
      <div className="card p-8">
        <h1 className="text-2xl font-black">未開通拍賣</h1>
        <p className="mt-2 text-[var(--muted)]">{denied}</p>
      </div>
    );
  }
  return <AuctionForm />;
}
