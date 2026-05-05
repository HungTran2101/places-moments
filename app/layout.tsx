import { ErrorProvider } from "@/components/ErrorProvider";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Lemonada, Mitr, Geist } from "next/font/google";
import "../styles/import.scss";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

const lemonada = Lemonada({
  subsets: ["latin", "vietnamese"],
  variable: "--font-lemonada",
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

const mitr = Mitr({
  subsets: ["latin", "vietnamese"],
  variable: "--font-mitr",
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

export async function generateMetadata(): Promise<Metadata> {
  const messages = await getMessages();
  const meta = messages.meta as { title: string; description: string };
  return {
    title: meta.title,
    description: meta.description,
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const requestHeaders = await headers();
  const locale = await getLocale();
  const messages = await getMessages();

  // Cho phep test `app/global-error.tsx` bang query param trong moi truong dev.
  if (
    process.env.NODE_ENV === "development" &&
    requestHeaders.get("x-test-error") === "global"
  ) {
    throw new Error("Dev global error test");
  }

  return (
    <html lang={locale} className={cn("font-sans", geist.variable)}>
      <body className={cn(mitr.variable, lemonada.variable)}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ErrorProvider>
            <TooltipProvider>
              {children}
            </TooltipProvider>
          </ErrorProvider>
        </NextIntlClientProvider>
        {/* <a href='https://pngtree.com/freepng/cloud-weather-climate_8186751.html'>png image from pngtree.com/</a> */}
      </body>
    </html>
  );
}
