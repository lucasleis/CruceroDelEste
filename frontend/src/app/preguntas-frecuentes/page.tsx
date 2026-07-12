import { Suspense } from "react";
import { Navbar } from "@/components/navigation/Navbar";
import { Footer } from "@/components/sections/Footer";
import FaqContent from "./FaqContent";

export default function FaqPage() {
  return (
    <>
      <Navbar />
      <Suspense fallback={null}>
        <FaqContent />
      </Suspense>
      <Footer />
    </>
  );
}
