import type { Metadata } from "next";
import { Space_Grotesk, Source_Code_Pro } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/core/Providers";
import { NavBar } from "@/components/core/NavBar";
import { Footer } from "@/components/core/Footer";
import { SiteBanner } from "@/components/core/SiteBanner";

const bodyFont = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const monoFont = Source_Code_Pro({
  variable: "--font-source-code-pro",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Research Starters Hub",
  description: "Undergraduate research opportunities at UVA",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${bodyFont.variable} ${monoFont.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-white text-slate-900">
        <Providers>
          <div className="relative flex min-h-screen flex-col">
            <NavBar />
            <SiteBanner />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
