import { Suspense } from "react";
import { ArrepentimientoContent } from "./ArrepentimientoContent";

export default function ArrepentimientoPage() {
  return (
    <Suspense fallback={null}>
      <ArrepentimientoContent />
    </Suspense>
  );
}
