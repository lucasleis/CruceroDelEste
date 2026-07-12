import { Suspense } from "react";
import FaqContent from "./FaqContent";

export default function FaqPage() {
  return (
    <Suspense fallback={null}>
      <FaqContent />
    </Suspense>
  );
}
