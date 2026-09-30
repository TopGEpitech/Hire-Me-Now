import type { Metadata } from "next";
import localFont from "next/font/local";
import { SiteFooter } from "@/ui/layout/site-footer";
import { SiteNav } from "@/ui/layout/site-nav";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: {
    default: "Why you should hire me | Younes Kad",
    template: "%s | Younes Kad",
  },
  description:
    "Lead full stack dev (TypeScript, Angular, Next.js, Node). A Pokédex turned into a pitch, with a hexagonal core, an API with RBAC + tests in CI.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} flex min-h-screen flex-col font-sans`}>
        <SiteNav />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
