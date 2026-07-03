import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <div className="bg-neutral-100 min-h-screen text-neutral-900">
      <p className="p-8 text-2xl font-semibold">Panel Admin — Expreso Río Paraná</p>
    </div>
  </StrictMode>
);
