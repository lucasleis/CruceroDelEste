import type { Metadata } from "next";
import "./globals.css";

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
        <link href="https://fonts.googleapis.com/css2?family=Saira+Semi+Condensed:wght@700;800;900&family=Open+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
