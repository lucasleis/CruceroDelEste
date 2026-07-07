import { Suspense } from "react";
import { CompraContent } from "./CompraContent";

export default async function CompraPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;

  return (
    <Suspense fallback={null}>
      <CompraContent tripId={tripId} />
    </Suspense>
  );
}
