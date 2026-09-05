import { redirect } from "next/navigation";
import { ListingForm } from "@/components/ListingForm";
import { featureDenied, getCurrentUser } from "@/lib/permissions";

export default async function NewListingPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login?callbackUrl=/listings/new");
  const denied = featureDenied(me, "post");
  if (denied) {
    return (
      <div className="card p-8">
        <h1 className="text-2xl font-black">未能放售</h1>
        <p className="mt-2 text-[var(--muted)]">{denied}</p>
      </div>
    );
  }
  return <ListingForm mode="create" />;
}
