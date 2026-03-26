import { cn } from "@/lib/utils";
import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Lemonada, Mitr } from "next/font/google";
import "../styles/import.scss";
import "./globals.css";

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
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body className={cn(mitr.variable, lemonada.variable)}>
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
