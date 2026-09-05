import type { Metadata } from "next";
import { Noto_Sans_TC } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Providers } from "@/components/Providers";

const noto = Noto_Sans_TC({
  variable: "--font-noto",
  subsets: ["latin"],
  weight: ["400", "600", "700", "900"],
});

export const metadata: Metadata = {
  title: "CardTradeHK — 香港卡牌放售平台",
  description: "Carousell 式卡牌交易：放帖、傾偈、WhatsApp，線下交收後互評。平台不經手付款。",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-Hant-HK">
      <body className={`${noto.variable} font-sans antialiased`}>
        <Providers>
          <Header />
          <main className="mx-auto w-full max-w-6xl px-4 py-6">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
