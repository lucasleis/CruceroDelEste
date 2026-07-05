import { Suspense } from "react";
import { ResultadosContent } from "./ResultadosContent";

export default function ResultadosPage() {
  return (
    <Suspense fallback={
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", fontFamily: "var(--font-body)", color: "var(--color-text-muted)" }}>
        Cargando...
      </div>
    }>
      <ResultadosContent />
    </Suspense>
  );
}
