import type { Metadata } from "next";
import "./globals.css";

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
      <body>{children}</body>
    </html>
  );
}
