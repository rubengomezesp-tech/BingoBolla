import PWARegister from "@/components/PWARegister";
import type { Metadata } from "next";
import "./globals.css";
import { AuroraBackground, FloatingBubbles } from "@/components/FloatingBubbles";

export const metadata: Metadata = {
  title: "BingoBolla — Bingo social con mundos, premios y comunidad",
  description: "Bingo social, mundos jugables, premios y juego responsable para mayores de 18 años.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <PWARegister />
        <AuroraBackground />
        <FloatingBubbles count={12} />
        {children}
      </body>
    </html>
  );
}
