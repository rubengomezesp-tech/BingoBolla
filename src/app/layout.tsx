import type { Metadata } from "next";
import "./globals.css";
import { AuroraBackground, FloatingBubbles } from "@/components/FloatingBubbles";

export const metadata: Metadata = {
  title: "BingoBolla — Bingo reimagined for America",
  description: "Real bingo. Real community. Real prizes. Free to play in 45 states.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuroraBackground />
        <FloatingBubbles count={12} />
        {children}
      </body>
    </html>
  );
}
