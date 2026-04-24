import { NextRequest, NextResponse } from "next/server";
import { locales, type Locale } from "@/i18n/config";

export async function POST(request: NextRequest) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const locale = (body as { locale?: string })?.locale;

  if (!locale || !locales.includes(locale as Locale)) {
    return NextResponse.json({ error: "Invalid locale" }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true });

  response.cookies.set("locale", locale, {
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 365,
    path: "/",
    sameSite: "lax",
  });

  return response;
}
