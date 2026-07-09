import { Suspense } from "react";
import { AsientosContent } from "./AsientosContent";

export default async function AsientosPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;

  return (
    <Suspense fallback={null}>
      <AsientosContent tripId={tripId} />
    </Suspense>
  );
}
