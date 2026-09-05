import type { Metadata, Viewport } from "next";
import { Noto_Sans_TC } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Providers } from "@/components/Providers";

const noto = Noto_Sans_TC({
  variable: "--font-noto",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

export const preferredRegion = "sin1";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0b0b0b",
};

export const metadata: Metadata = {
  title: "CardTradeHK — 香港卡牌放售平台",
  description: "香港卡牌市集：放售、站內訊息、WhatsApp 聯絡，線下交收後互評。平台不經手付款。",
  appleWebApp: {
    capable: true,
    title: "CardTradeHK",
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-Hant-HK">
      <body className={`${noto.variable} font-sans antialiased`}>
        <Providers>
          <Header />
          <main className="mx-auto w-full max-w-6xl px-3 py-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:px-4 md:py-6 md:pb-6">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
