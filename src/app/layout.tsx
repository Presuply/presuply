import type { Metadata } from "next";
import { Syne, Montserrat } from "next/font/google";
import "./globals.css";
import ThemeProvider from "@/components/ThemeProvider";
import CookieBanner from "@/components/CookieBanner";
import RegisterSW from "@/components/RegisterSW";

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  display: "swap",
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Presuply",
  description: "Genera presupuestos profesionales desde una foto",
  manifest: "/manifest.json",
  themeColor: "#FF6A00",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Presuply",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/icons/icon-192.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${syne.variable} ${montserrat.variable} h-full`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider>{children}</ThemeProvider>
        <CookieBanner />
        <RegisterSW />
      </body>
    </html>
  );
}
