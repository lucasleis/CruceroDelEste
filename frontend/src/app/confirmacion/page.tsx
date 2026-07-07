import { Suspense } from "react";
import { ConfirmacionContent } from "./ConfirmacionContent";

export default function ConfirmacionPage() {
  return (
    <Suspense fallback={null}>
      <ConfirmacionContent />
    </Suspense>
  );
}
