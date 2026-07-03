import type { ReactNode } from "react";
import Sidebar from "@/components/Sidebar";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-neutral-100">{children}</main>
    </div>
  );
}
