import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Toaster } from "@/components/ui/toaster";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getLocale } from "next-intl/server";
import { locales } from "@/i18n-config";
import Script from "next/script";
import GaProvider from "@/contexts/GaProvider";
import WalletProviderDynamicImport from "@/contexts/WalletProviderDynamicImport";
import LiffProviderDynamicImport from "@/contexts/LiffProviderDynamicImport";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "aq Mint",
  description: "A platform for minting NFTs to support your fav.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  display: "standalone",
  themeColor: "#933659",
  backgroundColor: "#933659",
};

export default async function RootLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  const messages = await getMessages();
  const localeCode = await getLocale();
  const direction =
    locales.find((l) => l.code === localeCode)?.direction || "ltr";

  return (
    <html lang={locale} dir={direction}>
      <head>
        {/* Google Analytics */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
          strategy="afterInteractive"
        />
        <Script id="ga-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${process.env.NEXT_PUBLIC_GA_ID}', {
              page_path: window.location.pathname,
            });
          `}
        </Script>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex flex-col min-h-screen`}
      >
        <NextIntlClientProvider messages={messages}>
          <LiffProviderDynamicImport>
            <WalletProviderDynamicImport>
              <Header />
              <main className="flex-grow bg-gray-900 text-white">
                {children}
              </main>
              <Toaster />
              <Footer />
            </WalletProviderDynamicImport>
          </LiffProviderDynamicImport>
        </NextIntlClientProvider>
      </body>
      <GaProvider />
    </html>
  );
}
