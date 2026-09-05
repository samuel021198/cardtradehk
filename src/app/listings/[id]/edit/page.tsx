import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ListingForm } from "@/components/ListingForm";

export default async function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const { id } = await params;
  const listing = await prisma.listing.findUnique({ where: { id } });
  if (!listing || listing.sellerId !== session.user.id) notFound();

  return (
    <ListingForm
      mode="edit"
      listingId={listing.id}
      initial={{
        title: listing.title,
        game: listing.game,
        cardType: listing.cardType,
        condition: listing.condition,
        priceHkd: listing.priceHkd,
        description: listing.description,
        images: JSON.parse(listing.images) as string[],
        status: listing.status,
      }}
    />
  );
}
