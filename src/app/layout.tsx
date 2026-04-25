import type { Metadata } from "next";
import { Geist_Mono, Kanit, Geist } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { AppShortcutGuard } from "@/components/app-shortcut-guard";
import { SmoothScrollProvider } from "@/components/smooth-scroll-provider";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const kanit = Kanit({
  variable: "--font-kanit",
  subsets: ["latin", "thai"],
  weight: ["300", "400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Universal Control",
  description: "Universal control and access gateway",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("h-full", "antialiased", kanit.variable, geistMono.variable, "font-sans", geist.variable)}
    >
      <body className="min-h-full flex flex-col">
        <AppShortcutGuard />
        <SmoothScrollProvider>{children}</SmoothScrollProvider>
      </body>
    </html>
  );
}
