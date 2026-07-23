import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";
import "@/styles/tokens-nosotros.css";

export const metadata: Metadata = {
  title: "Expreso Río Paraná — Design System",
  description: "Design system tokens and components for Expreso Río Paraná",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Saira+Semi+Condensed:wght@700;800;900&family=Open+Sans:wght@400;500;600&family=Noto+Serif:wght@400;600;700&family=Work+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet" />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
